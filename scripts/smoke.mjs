// Headless smoke test: camp renders, a descent starts, the player moves, and a run can end.
// Usage: node scripts/smoke.mjs [baseUrl] [outDir]   (set SMOKE_CHANNEL=msedge|chrome to use an installed browser)
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:5741/";
const out = process.argv[3] ?? "artifacts";
mkdirSync(out, { recursive: true });

// SMOKE_CHANNEL=msedge (or chrome) runs against an installed browser instead of Playwright's bundled Chromium.
const browser = await chromium.launch({ channel: process.env.SMOKE_CHANNEL || undefined });
const errors = [];
async function session(width, height, name, fn) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", e => errors.push(`${name}: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`${name}: ${m.text()}`); });
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await fn(page);
  await page.close();
}

await session(1280, 900, "desktop", async page => {
  await page.getByRole("button", { name: "Open Dungeon Gate" }).waitFor();
  await page.screenshot({ path: `${out}/camp.png`, fullPage: true });

  // The lobby is a walkable camp; every building also has a button under the picture.
  await page.getByRole("button", { name: "Open Ember Altar" }).click();
  await page.getByRole("button", { name: /Burn & mint/ }).first().click();
  await page.getByText(/Delver minted/).waitFor();
  await page.screenshot({ path: `${out}/mint.png` });
  await page.getByRole("button", { name: "Equip and return to camp" }).click();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open Dungeon Gate" }).click();
  await page.getByRole("button", { name: /Light it and descend/ }).click();
  await page.locator("canvas").waitFor();
  const keys = ["ArrowRight", "ArrowRight", "ArrowDown", "ArrowRight", "ArrowUp", "ArrowRight", "ArrowRight", "ArrowDown"];
  for (const k of keys) { await page.keyboard.press(k); await page.waitForTimeout(40); }
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/run.png` });

  for (let i = 0; i < 400; i++) {
    if (await page.getByRole("button", { name: "Return to camp" }).isVisible()) break;
    await page.keyboard.press(" ");
  }
  await page.getByRole("button", { name: "Return to camp" }).click();
  await page.getByRole("dialog").waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/report.png` });
});

await session(390, 844, "mobile", async page => {
  await page.getByRole("button", { name: "Open Dungeon Gate" }).waitFor();
  await page.screenshot({ path: `${out}/camp-mobile.png` });
  await page.getByRole("button", { name: "Open Dungeon Gate" }).click();
  await page.getByRole("button", { name: /Light it and descend/ }).click();
  await page.getByRole("button", { name: "Move right" }).click();
  await page.getByRole("button", { name: "Move down" }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/run-mobile.png`, fullPage: true });
});

await browser.close();
if (errors.length) {
  console.error("Browser errors:\n" + errors.join("\n"));
  process.exit(1);
}
console.log(`Smoke test passed. Screenshots in ${out}/`);
