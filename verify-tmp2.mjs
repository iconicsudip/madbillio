import { chromium } from "playwright";

const BASE = "http://localhost:3500";
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

const rand = Math.floor(Math.random() * 100000);
const email = `verify${rand}@example.com`;
const password = "TestPass123!";

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

// Create client + project + invoice quickly
await page.goto(`${BASE}/dashboard/clients`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "New Client" }).first().click();
await page.fill('input[name="name"]', "Adil Test");
await page.fill('input[name="email"]', "adiltest@example.com");
await page.getByRole("button", { name: "Add Client" }).click();
await page.locator('[data-slot="dialog-overlay"]').waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
await page.waitForTimeout(500);

await page.goto(`${BASE}/dashboard/invoices/new`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.locator("button[data-slot='select-trigger']").first().click();
await page.waitForTimeout(300);
await page.getByRole("option", { name: /Adil Test/ }).click();
const itemRow = page.locator("table tbody tr").first();
await itemRow.locator('input[placeholder="Website Design"]').fill("Design");
const itemNumberInputs = itemRow.locator('input[type="number"]');
await itemNumberInputs.nth(0).fill("1");
await itemNumberInputs.nth(1).fill("100");
await page.getByRole("button", { name: "Save Draft" }).click();
await page.waitForURL(/\/dashboard\/invoices\/(?!new)[a-z0-9]+$/, { timeout: 10000 });
await page.waitForTimeout(500);

// Test the "..." dropdown -> Delete Invoice flow (this triggered the nativeButton warning)
try {
  errors = [];
  await page.locator('button[aria-haspopup="menu"]').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/verify-dropdown.png" });
  const deleteItem = page.getByText("Delete Invoice");
  await deleteItem.waitFor({ state: "visible", timeout: 5000 });
  await deleteItem.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/verify-alert-dialog.png" });
  log("open dropdown -> Delete Invoice alert dialog", errors.length === 0, errors.join(" | "));
} catch (e) {
  log("open dropdown -> Delete Invoice alert dialog", false, String(e).slice(0, 400));
}

// Logo upload in settings
try {
  errors = [];
  await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "networkidle" });
  const fs = await import("fs");
  const path = await import("path");
  // create a tiny 1x1 png
  const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const tmpPath = "/tmp/tiny-logo.png";
  fs.writeFileSync(tmpPath, Buffer.from(pngBase64, "base64"));
  await page.locator('input[type="file"]').setInputFiles(tmpPath);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.waitForTimeout(1000);
  log("upload logo + save", errors.length === 0, errors.join(" | "));
} catch (e) {
  log("upload logo + save", false, String(e).slice(0, 400));
}

// Confirm logo shows on invoice preview
try {
  errors = [];
  await page.goto(`${BASE}/dashboard/invoices/new`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const logoImg = page.locator("#invoice-preview img").first();
  const visible = await logoImg.isVisible().catch(() => false);
  log("logo shows in invoice preview", visible && errors.length === 0, `visible=${visible} errors=${errors.join(" | ")}`);
} catch (e) {
  log("logo shows in invoice preview", false, String(e).slice(0, 400));
}

await browser.close();

console.log("\n=== SUMMARY ===");
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} — ${r.step}${r.detail ? " :: " + r.detail : ""}`);
}
