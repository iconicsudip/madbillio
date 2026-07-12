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
log("register + login redirects to dashboard on correct port", true);

// User avatar dropdown (the bug that was found)
try {
  errors = [];
  await page.locator('button:has-text("Verify Bot")').first().click();
  await page.waitForTimeout(400);
  const visible = await page.getByText("My Account").isVisible().catch(() => false);
  log("user avatar dropdown opens without crashing", visible && errors.length === 0, errors.join(" | "));
  await page.keyboard.press("Escape");
} catch (e) {
  log("user avatar dropdown opens without crashing", false, String(e).slice(0, 300));
}

// Sidebar collapse toggle
try {
  errors = [];
  const asideBefore = await page.locator("aside").boundingBox();
  await page.getByText("Collapse").click();
  await page.waitForTimeout(400);
  const asideAfter = await page.locator("aside").boundingBox();
  const collapsed = asideAfter.width < asideBefore.width;
  log("sidebar collapses on toggle", collapsed && errors.length === 0, `before=${asideBefore.width} after=${asideAfter.width}`);

  // reload to confirm the cookie persisted the collapsed state
  await page.reload({ waitUntil: "networkidle" });
  const asideReloaded = await page.locator("aside").boundingBox();
  log("collapsed state persists across reload (cookie)", asideReloaded.width === asideAfter.width, `reloaded=${asideReloaded.width}`);
} catch (e) {
  log("sidebar collapse", false, String(e).slice(0, 300));
}

// Sweep all main pages for console errors one more time
const pages = [
  "/dashboard",
  "/dashboard/projects",
  "/dashboard/clients",
  "/dashboard/invoices",
  "/dashboard/invoices/new",
  "/dashboard/payments",
  "/dashboard/analytics",
  "/dashboard/pnl",
  "/dashboard/settings",
];
for (const path of pages) {
  errors = [];
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(400);
    log(`visit ${path}`, errors.length === 0, errors.join(" | "));
  } catch (e) {
    log(`visit ${path}`, false, String(e).slice(0, 300));
  }
}

await browser.close();

console.log("\n=== SUMMARY ===");
let failCount = 0;
for (const r of results) {
  if (!r.ok) failCount++;
  console.log(`${r.ok ? "PASS" : "FAIL"} — ${r.step}${r.detail ? " :: " + r.detail : ""}`);
}
console.log(`\n${results.length - failCount}/${results.length} passed`);
