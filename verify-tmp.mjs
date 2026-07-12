import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
let errors = [];

function log(step, ok, detail = "") {
  results.push({ step, ok, detail });
  console.log(`[${ok ? "PASS" : "FAIL"}] ${step}${detail ? " — " + detail : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console] ${msg.text().slice(0, 300)}`);
});
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message.slice(0, 300)}`));

async function closeDialog() {
  await page
    .locator('[data-slot="dialog-overlay"]')
    .waitFor({ state: "detached", timeout: 10000 })
    .catch(() => {});
}

const rand = Math.floor(Math.random() * 100000);
const email = `verify${rand}@example.com`;
const password = "TestPass123!";

try {
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="name"]', "Verify Bot");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/login/, { timeout: 10000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  log("register + login", true);
} catch (e) {
  log("register + login", false, String(e).slice(0, 300));
}

// Create client
try {
  errors = [];
  await page.goto(`${BASE}/dashboard/clients`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New Client" }).first().click();
  await page.fill('input[name="name"]', "Adil Test");
  await page.fill('input[name="email"]', "adiltest@example.com");
  await page.getByRole("button", { name: "Add Client" }).click();
  await closeDialog();
  await page.waitForTimeout(500);
  const visible = await page.getByText("Adil Test").first().isVisible();
  log("create client", visible && errors.length === 0, errors.join(" | "));
} catch (e) {
  log("create client", false, String(e).slice(0, 300));
}

// Create project
try {
  errors = [];
  await page.goto(`${BASE}/dashboard/projects`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "New Project" }).first().click();
  await page.fill('input[name="name"]', "Goridez Test");
  await page.getByRole("button", { name: "Create Project" }).click();
  await closeDialog();
  await page.waitForTimeout(500);
  const visible = await page.getByText("Goridez Test").first().isVisible();
  log("create project", visible && errors.length === 0, errors.join(" | "));
} catch (e) {
  log("create project", false, String(e).slice(0, 300));
}

// Create invoice
let invoiceUrl = "";
try {
  errors = [];
  await page.goto(`${BASE}/dashboard/invoices/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Open the Billed To select and pick our test client
  await page.locator("button[data-slot='select-trigger']").first().click();
  await page.waitForTimeout(300);
  await page.getByRole("option", { name: /Adil Test/ }).click();
  await page.waitForTimeout(300);

  const itemRow = page.locator("table tbody tr").first();
  await itemRow.locator('input[placeholder="Website Design"]').fill("Design");
  const itemNumberInputs = itemRow.locator('input[type="number"]');
  await itemNumberInputs.nth(0).fill("1"); // quantity
  await itemNumberInputs.nth(1).fill("100"); // cost

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.waitForURL(/\/dashboard\/invoices\/(?!new)[a-z0-9]+$/, { timeout: 10000 });
  invoiceUrl = page.url();
  await page.waitForTimeout(500);

  // Confirm the Billed To name rendered correctly (not a raw cuid)
  const bodyText = await page.textContent("body");
  const showsClientName = bodyText.includes("Adil Test");
  const rawIdMatch = bodyText.match(/.{20}cm[a-z0-9]{20,}.{20}/);
  const showsRawId = !!rawIdMatch;
  if (rawIdMatch) console.log("RAW ID CONTEXT:", rawIdMatch[0]);

  log(
    "create invoice + opens detail page",
    errors.length === 0 && showsClientName && !showsRawId,
    `url=${invoiceUrl} showsClientName=${showsClientName} showsRawId=${showsRawId} errors=${errors.join(" | ")}`
  );
} catch (e) {
  log("create invoice + opens detail page", false, String(e).slice(0, 500));
}

// Re-open the invoice fresh (simulate clicking it from the list, and the "not opening" report)
try {
  errors = [];
  await page.goto(`${BASE}/dashboard/invoices`, { waitUntil: "networkidle" });
  await page.getByText("Design").first(); // sanity
  await page.getByRole("link", { name: /Adil Test/ }).first().click();
  await page.waitForURL(/\/dashboard\/invoices\/(?!new)[a-z0-9]+$/, { timeout: 10000 });
  await page.waitForTimeout(500);
  log("open invoice from list", errors.length === 0, errors.join(" | "));
} catch (e) {
  log("open invoice from list", false, String(e).slice(0, 500));
}

// Edit invoice page opens without error
try {
  errors = [];
  if (invoiceUrl) {
    await page.goto(`${invoiceUrl}/edit`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    log("open invoice edit page", errors.length === 0, errors.join(" | "));
  }
} catch (e) {
  log("open invoice edit page", false, String(e).slice(0, 500));
}

// Record payment on the invoice detail page
try {
  errors = [];
  await page.goto(invoiceUrl, { waitUntil: "networkidle" });
  const sendBtn = page.getByRole("button", { name: "Send Invoice" }).first();
  if (await sendBtn.isVisible().catch(() => false)) {
    await sendBtn.click();
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: "/tmp/verify-before-payment.png", fullPage: true });
  const recordBtn = page.getByRole("button", { name: "Record Payment" }).first();
  await recordBtn.waitFor({ state: "visible", timeout: 8000 });
  await recordBtn.click();
  await page.waitForTimeout(500);
  await page.locator('form button[type="submit"]:has-text("Record Payment")').click();
  await closeDialog();
  await page.waitForTimeout(800);
  const bodyText = await page.textContent("body");
  log("record payment", errors.length === 0 && bodyText.includes("Paid"), errors.join(" | "));
} catch (e) {
  log("record payment", false, String(e).slice(0, 500));
}

await page.screenshot({ path: "/tmp/verify-invoice-final.png", fullPage: true });

await browser.close();

console.log("\n=== SUMMARY ===");
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} — ${r.step}${r.detail ? " :: " + r.detail : ""}`);
}
