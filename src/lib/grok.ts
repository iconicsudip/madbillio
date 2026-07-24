/**
 * Multi-Model AI Engine for Madbillio Billing
 * Integrates OpenRouter API (nvidia/nemotron-3-ultra-550b-a55b:free), Groq SDK & Smart Fallbacks
 */

import { Groq } from "groq-sdk";

export interface GrokInvoiceDraft {
  error?: string;
  clientName?: string;
  clientEmail?: string;
  currency?: string;
  dueDateDays?: number;
  taxRate?: number;
  notes?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit?: string;
    cost: number;
  }>;
}

export interface GrokReminderResult {
  subject: string;
  body: string;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getOpenRouterKey(): string | null {
  return process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || null;
}

function getGroqKey(): string | null {
  return process.env.GROQ_API_KEY || process.env.GROK_API_KEY || process.env.XAI_API_KEY || null;
}

/**
 * Validates whether a text prompt is related to billing/invoices
 */
function isInvoiceRelatedPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase().trim();
  if (lower.length < 3) return false;

  const billingKeywords = [
    "bill", "invoice", "charge", "client", "fee", "cost", "price", "rate",
    "project", "service", "item", "hours", "design", "dev", "consulting",
    "retainer", "payment", "amount", "deposit", "$", "₹", "€", "£", "usd", "inr", "eur"
  ];

  return billingKeywords.some((k) => lower.includes(k));
}

/**
 * Call OpenRouter API for streaming / chat completions
 */
async function callOpenRouterAI(systemPrompt: string, userPrompt: string, jsonMode = false): Promise<string | null> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://madbillio.com",
        "X-Title": "Madbillio Billing",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    }
  } catch (err) {
    console.warn("OpenRouter API request error, trying Groq fallback:", err);
  }

  return null;
}

/**
 * Call Groq SDK as secondary AI engine
 */
async function callGroqAI(systemPrompt: string, userPrompt: string, jsonMode = false): Promise<string | null> {
  const apiKey = getGroqKey();
  if (!apiKey) return null;

  try {
    const groq = new Groq({ apiKey });
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    });

    return chatCompletion.choices[0]?.message?.content || null;
  } catch (err) {
    console.warn("Groq SDK request error:", err);
  }

  return null;
}

/**
 * Generate invoice draft data using OpenRouter AI or Groq AI
 */
export async function generateInvoiceWithGrok(
  prompt: string,
  existingClients: Array<{ name: string; email: string }> = []
): Promise<GrokInvoiceDraft> {
  if (!isInvoiceRelatedPrompt(prompt)) {
    return {
      error: "Only invoice and billing-related tasks can be generated using AI.",
      items: [],
    };
  }

  const clientListText = existingClients
    .map((c) => `- ${c.name} (${c.email})`)
    .join("\n");

  const systemPrompt = `You are Madbillio AI, an AI financial billing assistant.
CRITICAL MANDATE: You MUST ONLY process requests related to invoicing, billing, client charges, or service line items.
If the user's prompt is NOT related to billing/invoicing, return a JSON object with: { "error": "Only invoice and billing-related tasks can be generated using AI.", "items": [] }.

Otherwise, extract and return ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "clientName": "string or best match from client list if mentioned",
  "currency": "INR or USD or EUR or GBP",
  "dueDateDays": number (e.g. 14, 30),
  "taxRate": number (e.g. 5, 18),
  "notes": "string payment terms or notes",
  "items": [
    { "name": "Item description", "quantity": number, "unit": "hours/unit/days", "cost": number }
  ]
}

Available Clients:
${clientListText || "None"}`;

  // Priority 1: OpenRouter API
  let responseText = await callOpenRouterAI(systemPrompt, prompt, true);

  // Priority 2: Groq SDK
  if (!responseText) {
    responseText = await callGroqAI(systemPrompt, prompt, true);
  }

  if (responseText) {
    try {
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson) as GrokInvoiceDraft;
      if (parsed.error) return parsed;
      return parsed;
    } catch {
      console.warn("Failed to parse JSON response from AI");
    }
  }

  // Fallback parser
  return fallbackInvoiceParser(prompt, existingClients);
}

/**
 * Generate payment reminder email using OpenRouter AI or Groq AI
 */
export async function generatePaymentReminderWithGrok(
  invoiceNumber: string,
  clientName: string,
  amountDue: string,
  dueDate: string,
  tone: "friendly" | "professional" | "firm" | "urgent" = "professional"
): Promise<GrokReminderResult> {
  const systemPrompt = `You are Madbillio AI, an expert billing assistant. Write a payment reminder email.
Strictly ensure content is related to invoice payment reminders.
Return ONLY a valid JSON object with keys "subject" and "body".
Tone: ${tone}. Invoice: ${invoiceNumber}, Client: ${clientName}, Amount: ${amountDue}, Due Date: ${dueDate}.`;

  const userPrompt = `Write a ${tone} reminder for invoice ${invoiceNumber}.`;

  let responseText = await callOpenRouterAI(systemPrompt, userPrompt, true);

  if (!responseText) {
    responseText = await callGroqAI(systemPrompt, userPrompt, true);
  }

  if (responseText) {
    try {
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson) as GrokReminderResult;
    } catch {
      console.warn("Failed to parse reminder JSON");
    }
  }

  return fallbackReminderGenerator(invoiceNumber, clientName, amountDue, dueDate, tone);
}

function fallbackInvoiceParser(
  prompt: string,
  existingClients: Array<{ name: string; email: string }>
): GrokInvoiceDraft {
  const lower = prompt.toLowerCase();
  const matchedClient = existingClients.find((c) => lower.includes(c.name.toLowerCase()));

  let currency = "INR";
  if (lower.includes("usd") || lower.includes("$")) currency = "USD";
  else if (lower.includes("eur") || lower.includes("€")) currency = "EUR";
  else if (lower.includes("gbp") || lower.includes("£")) currency = "GBP";

  const numberMatches = prompt.match(/\b\d+(\.\d+)?\b/g)?.map(Number) || [];
  const costCandidate = numberMatches.find((n) => n >= 500) || 5000;

  const lines = prompt
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  const items = lines.length > 0
    ? lines.slice(0, 4).map((line, idx) => ({
        name: line.charAt(0).toUpperCase() + line.slice(1),
        quantity: 1,
        unit: "unit",
        cost: idx === 0 ? costCandidate : Math.round(costCandidate * 0.3),
      }))
    : [
        {
          name: "Professional Billing & Development Services",
          quantity: 1,
          unit: "service",
          cost: costCandidate,
        },
      ];

  return {
    clientName: matchedClient?.name,
    clientEmail: matchedClient?.email,
    currency,
    dueDateDays: 14,
    taxRate: 5,
    notes: `<p>Thank you for your business. Kindly process payment within 14 days.</p>`,
    items,
  };
}

function fallbackReminderGenerator(
  invoiceNumber: string,
  clientName: string,
  amountDue: string,
  dueDate: string,
  tone: string
): GrokReminderResult {
  if (tone === "urgent") {
    return {
      subject: `URGENT: Overdue Payment Notice for Invoice ${invoiceNumber}`,
      body: `Dear ${clientName},\n\nThis is an urgent notice regarding Invoice ${invoiceNumber} for ${amountDue}, which was due on ${dueDate}.\n\nPlease process payment immediately.\n\nBest regards,\nAccounts Receivable`,
    };
  }

  return {
    subject: `Payment Reminder: Invoice ${invoiceNumber}`,
    body: `Hi ${clientName},\n\nThis is a friendly reminder that Invoice ${invoiceNumber} for ${amountDue} is due on ${dueDate}.\n\nBest regards,\nBilling Team`,
  };
}
