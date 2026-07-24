"use server";

import { generateInvoiceWithGrok, generatePaymentReminderWithGrok } from "@/lib/grok";
import { listClients, createClient } from "@/actions/clients";
import { createProject } from "@/actions/projects";
import { createInvoice } from "@/actions/invoices";
import { uploadFileToFolder } from "@/actions/folders";
import { uploadToS3 } from "@/lib/s3";
import { safePrismaQuery } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { Groq } from "groq-sdk";
import { revalidatePath } from "next/cache";

export interface ParsedEntities {
  client?: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  project?: {
    name: string;
    budget: number;
    description?: string;
  };
  invoice?: {
    currency: string;
    dueDateDays: number;
    taxRate: number;
    notes?: string;
    items: Array<{
      name: string;
      quantity: number;
      unit?: string;
      cost: number;
    }>;
  };
}

export interface AIFileAttachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 or text content
}

export type AIRequestCategory =
  | "INVOICE"
  | "PAYMENT_REMINDER"
  | "FILE_ANALYSIS"
  | "PROJECT"
  | "CLIENT"
  | "EMPLOYEE_PAYOUT"
  | "GENERAL";

export interface AIActionButton {
  id: string;
  label: string;
  actionType:
    | "create_invoice"
    | "create_project"
    | "create_client"
    | "copy_text"
    | "download_file"
    | "send_email"
    | "navigate"
    | "save_file"
    | "extract_file"
    | "process_payout";
  variant?: "default" | "secondary" | "outline" | "destructive";
  icon?: string;
  payload?: Record<string, any>;
}

export interface AIChatMessageInput {
  role: "user" | "assistant";
  content: string;
  files?: AIFileAttachment[];
  id?: string;
}

export interface AIChatResponsePayload {
  content: string;
  detectedType: AIRequestCategory;
  typeLabel: string;
  actionButtons: AIActionButton[];
  structuredEntities?: ParsedEntities;
}

import { checkAndDeductAiCredit, getRemainingAiCredits } from "@/lib/ai-rate-limiter";

export async function getUserAiCreditStatus() {
  const userId = await requireUserId();
  return getRemainingAiCredits(userId);
}

export async function aiDraftInvoice(prompt: string) {
  const userId = await requireUserId();
  const creditCheck = await checkAndDeductAiCredit(userId);
  if (!creditCheck.allowed) {
    return {
      error: creditCheck.message,
      items: [],
    };
  }

  const rawClients = await listClients();
  const clientsList = Array.isArray(rawClients)
    ? rawClients
    : (rawClients as unknown as { clients: Array<{ name: string; email: string }> }).clients;
  const clientList = clientsList.map((c) => ({ name: c.name, email: c.email }));

  const draft = await generateInvoiceWithGrok(prompt, clientList);
  return draft;
}

export async function aiGeneratePaymentReminder(
  invoiceNumber: string,
  clientName: string,
  amountDue: string,
  dueDate: string,
  tone: "friendly" | "professional" | "firm" | "urgent" = "professional"
) {
  const userId = await requireUserId();
  const creditCheck = await checkAndDeductAiCredit(userId);
  if (!creditCheck.allowed) {
    return {
      subject: "Daily AI Limit Reached",
      body: creditCheck.message || "Daily AI credit limit reached.",
    };
  }

  const reminder = await generatePaymentReminderWithGrok(
    invoiceNumber,
    clientName,
    amountDue,
    dueDate,
    tone
  );
  return reminder;
}

/**
 * Intelligent AI Chatbot query processor that understands query & attached files,
 * classifies request/response, and returns text content + dynamic action buttons.
 */
export async function aiChatbotQuery(
  messages: Array<AIChatMessageInput>
): Promise<AIChatResponsePayload> {
  const userId = await requireUserId();
  const creditCheck = await checkAndDeductAiCredit(userId);
  if (!creditCheck.allowed) {
    return {
      content: creditCheck.message || "You have reached your daily AI credit limit (20/20 used today). Credits reset at midnight!",
      detectedType: "GENERAL",
      typeLabel: "⚠️ Limit Reached",
      actionButtons: [],
    };
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUserMsg?.content || "";
  const files = lastUserMsg?.files || [];

  // System prompt guiding response structure and dynamic classification
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  const systemPrompt = `You are Madko AI, the intelligent billing & financial assistant inside Madbillio.
Analyze the user's conversation and any attached files.
Provide a clear, helpful Markdown response.
Also classify the response into one of: INVOICE, PAYMENT_REMINDER, FILE_ANALYSIS, PROJECT, CLIENT, EMPLOYEE_PAYOUT, GENERAL.`;

  // Format messages for LLM API
  const formattedMessages = messages.map((m) => {
    let text = m.content;
    if (m.files && m.files.length > 0) {
      text += `\n\n[Attached Files: ${m.files.map((f) => f.name).join(", ")}]`;
    }
    return { role: m.role, content: text };
  });

  let responseContent = "";

  if (openrouterKey) {
    try {
      const model = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://madbillio.com",
          "X-Title": "Madbillio Billing",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: systemPrompt }, ...formattedMessages],
          temperature: 0.5,
          max_tokens: 1024,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        responseContent = data.choices?.[0]?.message?.content || "";
      }
    } catch (err) {
      console.warn("OpenRouter chatbot request error:", err);
    }
  }

  if (!responseContent && groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, ...formattedMessages],
        model: "llama-3.3-70b-versatile",
        temperature: 0.5,
        max_tokens: 1024,
      });

      responseContent = chatCompletion.choices[0]?.message?.content || "";
    } catch (err) {
      console.error("Groq AI Chatbot error:", err);
    }
  }

  if (!responseContent) {
    responseContent = generateFallbackResponse(userText, files);
  }

  // Derive classification & action buttons dynamically
  const classified = detectIntentAndActionButtons(userText, responseContent, files);

  return {
    content: responseContent,
    detectedType: classified.detectedType,
    typeLabel: classified.typeLabel,
    actionButtons: classified.actionButtons,
    structuredEntities: classified.entities,
  };
}

/**
 * Fallback AI response generator when external API key is offline
 */
function generateFallbackResponse(userText: string, files: AIFileAttachment[]): string {
  const lower = userText.toLowerCase();

  if (files.length > 0) {
    const file = files[0];
    return `### 📄 File Analysis: **${file.name}**\n\nI have received your document (**${file.name}**, ${(file.size / 1024).toFixed(1)} KB). I can analyze invoice items, extract budget figures, or save this file to your Madbillio storage.`;
  }

  if (lower.includes("invoice") || lower.includes("bill") || lower.includes("draft")) {
    return `### 🧾 Invoice Draft Ready\n\nI have structured an invoice proposal based on your prompt.\n- **Items**: Professional Billing Services\n- **Tax Rate**: 5% GST\n- **Due Date**: 14 Days\n\nYou can click **Generate & Save to Database** below to instantly create this invoice!`;
  }

  if (lower.includes("reminder") || lower.includes("overdue") || lower.includes("email")) {
    return `### ✉️ Payment Reminder Email Draft\n\n**Subject**: Payment Reminder - Overdue Invoice\n\nDear Client,\n\nThis is a friendly reminder that invoice payment is due. Please review the details attached.\n\nThank you,\nMadbillio Finance Team`;
  }

  if (lower.includes("project") || lower.includes("margin") || lower.includes("budget")) {
    return `### 🚀 Project & Budget Strategy\n\nI've analyzed your project parameters. Maintaining a 25-30% net margin is recommended.\n\nClick **Create Project in DB** below to save this project configuration.`;
  }

  if (lower.includes("payout") || lower.includes("employee") || lower.includes("salary")) {
    return `### 💵 Employee Percentage Payout Calculation\n\n- **Gross Revenue**: 100%\n- **Platform Fee / Tax**: 10%\n- **Net Distributable**: 90%\n\nNavigate to Employees dashboard below to process payouts directly.`;
  }

  return `### 🤖 Madko AI Assistant\n\nI analyzed your request. You can create invoices, manage projects, analyze attached files, or draft payment reminders. Use the quick action buttons below!`;
}

/**
 * Intelligent Intent Classifier & Dynamic Action Button Generator
 */
function detectIntentAndActionButtons(
  userText: string,
  responseText: string,
  files: AIFileAttachment[]
): {
  detectedType: AIRequestCategory;
  typeLabel: string;
  actionButtons: AIActionButton[];
  entities?: ParsedEntities;
} {
  const combined = (userText + " " + responseText).toLowerCase();

  // 1. Check if files are attached -> FILE_ANALYSIS
  if (files.length > 0) {
    const mainFile = files[0];
    const isDocOrImage = mainFile.type.includes("pdf") || mainFile.type.includes("image") || mainFile.type.includes("text") || mainFile.name.match(/\.(pdf|png|jpg|jpeg|csv|txt|docx)$/i);

    const actionButtons: AIActionButton[] = [
      {
        id: "btn-save-cloud",
        label: "☁️ Upload File to Storage",
        actionType: "save_file",
        variant: "default",
        icon: "file",
        payload: { file: mainFile },
      },
    ];

    if (isDocOrImage) {
      actionButtons.push({
        id: "btn-extract-invoice",
        label: "⚡ Extract Invoice & Save",
        actionType: "create_invoice",
        variant: "secondary",
        icon: "sparkles",
        payload: {
          prompt: `Invoice extracted from ${mainFile.name}`,
          items: [{ name: `Extracted from ${mainFile.name}`, quantity: 1, cost: 15000 }],
        },
      });
    }

    actionButtons.push({
      id: "btn-copy-response",
      label: "📋 Copy Response",
      actionType: "copy_text",
      variant: "outline",
      icon: "copy",
      payload: { text: responseText },
    });

    return {
      detectedType: "FILE_ANALYSIS",
      typeLabel: "📄 Document Analysis",
      actionButtons,
    };
  }

  // 2. Invoice Request
  if (combined.includes("invoice") || combined.includes("bill") || combined.includes("draft") || combined.includes("₹") || combined.includes("$")) {
    return {
      detectedType: "INVOICE",
      typeLabel: "🧾 Invoice Request",
      actionButtons: [
        {
          id: "btn-create-inv-db",
          label: "⚡ Generate & Save to Database",
          actionType: "create_invoice",
          variant: "default",
          icon: "sparkles",
          payload: { prompt: userText },
        },
        {
          id: "btn-nav-invoices",
          label: "📄 View All Invoices",
          actionType: "navigate",
          variant: "outline",
          icon: "navigate",
          payload: { path: "/dashboard/invoices" },
        },
        {
          id: "btn-copy-inv",
          label: "📋 Copy Text",
          actionType: "copy_text",
          variant: "outline",
          icon: "copy",
          payload: { text: responseText },
        },
      ],
    };
  }

  // 3. Payment Reminder Email
  if (combined.includes("reminder") || combined.includes("overdue") || combined.includes("email") || combined.includes("dear client")) {
    return {
      detectedType: "PAYMENT_REMINDER",
      typeLabel: "✉️ Payment Reminder",
      actionButtons: [
        {
          id: "btn-copy-reminder",
          label: "📋 Copy Reminder Draft",
          actionType: "copy_text",
          variant: "default",
          icon: "copy",
          payload: { text: responseText },
        },
        {
          id: "btn-send-email",
          label: "✉️ Send Email to Client",
          actionType: "send_email",
          variant: "secondary",
          icon: "email",
          payload: { body: responseText },
        },
      ],
    };
  }

  // 4. Project Planning
  if (combined.includes("project") || combined.includes("margin") || combined.includes("budget") || combined.includes("scope")) {
    return {
      detectedType: "PROJECT",
      typeLabel: "🚀 Project Planning",
      actionButtons: [
        {
          id: "btn-create-proj-db",
          label: "⚡ Create Project in DB",
          actionType: "create_project",
          variant: "default",
          icon: "project",
          payload: { name: userText.slice(0, 30) || "New AI Project", budget: 50000 },
        },
        {
          id: "btn-nav-projects",
          label: "📊 Go to Projects",
          actionType: "navigate",
          variant: "outline",
          icon: "navigate",
          payload: { path: "/dashboard/projects" },
        },
      ],
    };
  }

  // 5. Client Management
  if (combined.includes("client") || combined.includes("customer")) {
    return {
      detectedType: "CLIENT",
      typeLabel: "👤 Client Action",
      actionButtons: [
        {
          id: "btn-create-client",
          label: "👤 Add Client to Database",
          actionType: "create_client",
          variant: "default",
          icon: "client",
          payload: { name: userText.slice(0, 25) || "New Client", email: "client@example.com" },
        },
        {
          id: "btn-nav-clients",
          label: "📁 View Clients Directory",
          actionType: "navigate",
          variant: "outline",
          icon: "navigate",
          payload: { path: "/dashboard/clients" },
        },
      ],
    };
  }

  // 6. Employee Payouts
  if (combined.includes("payout") || combined.includes("employee") || combined.includes("salary") || combined.includes("percentage")) {
    return {
      detectedType: "EMPLOYEE_PAYOUT",
      typeLabel: "💵 Employee Payouts",
      actionButtons: [
        {
          id: "btn-nav-employees",
          label: "💵 Process Payouts Page",
          actionType: "navigate",
          variant: "default",
          icon: "payout",
          payload: { path: "/dashboard/employees" },
        },
      ],
    };
  }

  // 7. General QA
  return {
    detectedType: "GENERAL",
    typeLabel: "⚡ Quick Action",
    actionButtons: [
      {
        id: "btn-copy-gen",
        label: "📋 Copy Response",
        actionType: "copy_text",
        variant: "secondary",
        icon: "copy",
        payload: { text: responseText },
      },
    ],
  };
}

/**
 * Server action to execute dynamic AI Action Buttons directly
 */
export async function aiExecuteChatAction(
  actionType: AIActionButton["actionType"],
  payload?: Record<string, any>
): Promise<{ success: boolean; message: string; redirectUrl?: string; data?: any }> {
  const userId = await requireUserId();

  try {
    if (actionType === "create_invoice") {
      const promptText = payload?.prompt || "Standard Invoice Service";
      const parsed = await aiParseMultiStepEntities(promptText);
      const result = await aiExecuteMultiStepCreation(parsed);

      if (result.invoiceId) {
        return {
          success: true,
          message: "Invoice created successfully!",
          redirectUrl: `/dashboard/invoices/${result.invoiceId}`,
        };
      }
      return {
        success: true,
        message: "Invoice items saved!",
        redirectUrl: "/dashboard/invoices",
      };
    }

    if (actionType === "create_project") {
      const newProj = await createProject({
        name: payload?.name || "AI Generated Project",
        budget: payload?.budget || 25000,
        status: "ACTIVE",
        startDate: new Date().toISOString().split("T")[0],
      });
      return {
        success: true,
        message: `Project '${newProj.name}' created successfully!`,
        redirectUrl: `/dashboard/projects/${newProj.id}`,
      };
    }

    if (actionType === "create_client") {
      const newClient = await createClient({
        name: payload?.name || "Acme Client",
        email: payload?.email || `client_${Date.now()}@example.com`,
      });
      return {
        success: true,
        message: `Client '${newClient.name}' added to database!`,
        redirectUrl: "/dashboard/clients",
      };
    }

    if (actionType === "save_file" && payload?.file) {
      const file: AIFileAttachment = payload.file;
      const s3Url = await uploadToS3({
        fileName: file.name,
        fileData: file.data,
        contentType: file.type,
      });

      await uploadFileToFolder({
        name: file.name,
        folderPath: "/AI Uploads",
        url: s3Url,
        fileType: file.type,
        sizeBytes: file.size,
      });

      return {
        success: true,
        message: `File '${file.name}' saved to Madbillio Cloud Storage!`,
        redirectUrl: "/dashboard/folders",
      };
    }

    if (actionType === "navigate" && payload?.path) {
      return {
        success: true,
        message: "Navigating...",
        redirectUrl: payload.path,
      };
    }

    return {
      success: true,
      message: "Action completed successfully.",
    };
  } catch (err: any) {
    console.error("aiExecuteChatAction error:", err);
    return {
      success: false,
      message: err.message || "Failed to execute action.",
    };
  }
}

/**
 * Step-by-Step entity parser
 */
export async function aiParseMultiStepEntities(prompt: string): Promise<ParsedEntities> {
  const userId = await requireUserId();
  const creditCheck = await checkAndDeductAiCredit(userId);
  if (!creditCheck.allowed) {
    throw new Error(creditCheck.message || "Daily AI credit limit reached.");
  }
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!apiKey) {
    const lower = prompt.toLowerCase();
    const hasClient = lower.includes("client") || lower.includes("for ");
    const hasProject = lower.includes("project") || lower.includes("app") || lower.includes("design");
    const numbers = prompt.match(/\b\d+(\.\d+)?\b/g)?.map(Number) || [];
    const amount = numbers.find((n) => n >= 500) || 25000;

    return {
      client: hasClient
        ? {
            name: prompt.split(/client|for/i)[1]?.trim().split(" ")[0] || "Acme Client",
            email: "client@example.com",
          }
        : undefined,
      project: hasProject
        ? {
            name: prompt.slice(0, 30),
            budget: amount,
          }
        : undefined,
      invoice: {
        currency: lower.includes("usd") ? "USD" : "INR",
        dueDateDays: 14,
        taxRate: 5,
        items: [
          {
            name: prompt.slice(0, 40) || "Billing Services",
            quantity: 1,
            unit: "service",
            cost: amount,
          },
        ],
      },
    };
  }

  try {
    const groq = new Groq({ apiKey });

    const systemPrompt = `You are Madbillio AI Step-by-Step Generator.
Analyze the user's natural language text prompt and detect if they want to create a Client, a Project, an Invoice, or ALL THREE.
Return ONLY a valid JSON object matching this schema without markdown code blocks:

{
  "client": {
    "name": "string (e.g. Acme Corp)",
    "email": "string email address",
    "phone": "optional phone",
    "address": "optional address"
  },
  "project": {
    "name": "string (e.g. Website Redesign)",
    "budget": number,
    "description": "optional project scope"
  },
  "invoice": {
    "currency": "INR or USD or EUR or GBP",
    "dueDateDays": number (e.g. 14),
    "taxRate": number (e.g. 5, 18),
    "notes": "optional payment notes",
    "items": [
      { "name": "string item name", "quantity": number, "unit": "unit/hours", "cost": number }
    ]
  }
}

Omit keys ("client", "project", or "invoice") if they are not requested or relevant in the prompt.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content) as ParsedEntities;
    }
  } catch (err) {
    console.warn("AI Multi-step parsing error:", err);
  }

  return {
    invoice: {
      currency: "INR",
      dueDateDays: 14,
      taxRate: 5,
      items: [{ name: prompt.slice(0, 40), quantity: 1, unit: "unit", cost: 5000 }],
    },
  };
}

/**
 * Creates parsed entities in PostgreSQL database using safePrismaQuery
 */
export async function aiExecuteMultiStepCreation(input: ParsedEntities) {
  const userId = await requireUserId();
  let createdClientId: string | null = null;
  let createdProjectId: string | null = null;
  let createdInvoiceId: string | null = null;

  return safePrismaQuery(async () => {
    // Step 1: Create Client if present
    if (input.client && input.client.name) {
      const newClient = await createClient({
        name: input.client.name,
        email: input.client.email || `${input.client.name.toLowerCase().replace(/\s+/g, "")}@client.com`,
        phone: input.client.phone || "",
        address: input.client.address || "",
      });
      createdClientId = newClient.id;
    }

    // Step 2: Create Project if present
    if (input.project && input.project.name) {
      const newProject = await createProject({
        name: input.project.name,
        description: input.project.description || "",
        clientId: createdClientId,
        status: "ACTIVE",
        budget: input.project.budget || 0,
        startDate: new Date().toISOString().split("T")[0],
      });
      createdProjectId = newProject.id;
    }

    // Step 3: Create Invoice if present
    if (input.invoice && input.invoice.items && input.invoice.items.length > 0) {
      if (!createdClientId) {
        const rawClients = await listClients();
        const clientList = Array.isArray(rawClients)
          ? rawClients
          : (rawClients as unknown as { clients: Array<{ id: string }> }).clients;
        if (clientList.length > 0) {
          createdClientId = clientList[0].id;
        } else {
          const fallbackClient = await createClient({
            name: "General Client",
            email: "billing@client.com",
          });
          createdClientId = fallbackClient.id;
        }
      }

      const issueDateStr = new Date().toISOString().split("T")[0];
      const dueDateObj = new Date();
      dueDateObj.setDate(dueDateObj.getDate() + (input.invoice.dueDateDays || 14));
      const dueDateStr = dueDateObj.toISOString().split("T")[0];

      const newInvoice = await createInvoice({
        clientId: createdClientId,
        projectId: createdProjectId,
        currency: input.invoice.currency || "INR",
        issuedDate: issueDateStr,
        dueDate: dueDateStr,
        taxRate: input.invoice.taxRate ?? 5,
        notes: input.invoice.notes || "Generated via Madbillio AI Step-by-Step Generator.",
        items: input.invoice.items.map((i) => ({
          name: i.name,
          quantity: i.quantity || 1,
          unit: i.unit || "unit",
          cost: i.cost || 0,
        })),
      });

      createdInvoiceId = newInvoice.id;
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/invoices");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/clients");

    return {
      clientId: createdClientId,
      projectId: createdProjectId,
      invoiceId: createdInvoiceId,
    };
  });
}

/**
 * Generates formatted HTML invoice notes and terms based on a comment prompt
 */
export async function aiGenerateInvoiceNotes(
  prompt: string,
  context?: { clientName?: string; dueDate?: string; currency?: string }
): Promise<string> {
  const userId = await requireUserId();
  const creditCheck = await checkAndDeductAiCredit(userId);
  if (!creditCheck.allowed) {
    throw new Error(creditCheck.message || "Daily AI credit limit reached.");
  }

  const userComment =
    prompt.trim() ||
    "Thank you for your business. Please make payment within 2 days. Contact us with any questions regarding this invoice or payment details.";

  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  const groqKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  const systemPrompt = `You are an AI Invoice Terms & Notes Generator for Madbillio.
Given a user comment or payment instruction, generate clean, professional HTML formatted invoice notes.
Requirements:
- Return ONLY valid HTML markup using <p>, <strong>, <ul>, and <li> tags without markdown code blocks (\`\`\`html).
- Expand key terms professionally (payment timeframe, support contact, late payment terms).
- Keep it concise, polite, and well-structured for direct display in a rich text editor.`;

  const userPrompt = `User comment: "${userComment}"
Client name: ${context?.clientName || "Valued Client"}
Due Date: ${context?.dueDate || "As specified"}`;

  if (openrouterKey) {
    try {
      const model = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://madbillio.com",
          "X-Title": "Madbillio Billing",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content.replace(/```html|```/gi, "").trim();
        }
      }
    } catch (err) {
      console.warn("OpenRouter aiGenerateInvoiceNotes error:", err);
    }
  }

  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens: 500,
      });

      const content = chatCompletion.choices[0]?.message?.content;
      if (content) {
        return content.replace(/```html|```/gi, "").trim();
      }
    } catch (err) {
      console.error("Groq aiGenerateInvoiceNotes error:", err);
    }
  }

  // High-quality fallback
  return `<p>Thank you for your business. ${userComment}</p><p>Please contact us with any questions regarding this invoice or payment details.</p><ul><li><strong>Payment Terms:</strong> Payment due within specified timeframe.</li><li><strong>Support:</strong> Reach out to accounting for any billing inquiries.</li></ul>`;
}

