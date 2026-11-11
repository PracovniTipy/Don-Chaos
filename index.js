const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = Number(process.env.PORT || 3000);
const WORKER_TOKEN = process.env.WORKER_TOKEN;
const PUBLISH_ENABLED = process.env.ALLOW_PAYHIP_PUBLISH === "true";

function auth(req, res, next) {
  const token = (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!WORKER_TOKEN || token !== WORKER_TOKEN) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function safeName(value, fallback) {
  return String(value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

async function download(url, dir, name) {
  if (!/^https:\/\//i.test(url)) throw new Error("Only HTTPS file URLs are accepted");
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 120000, maxContentLength: 5 * 1024 * 1024 * 1024 });
  const file = path.join(dir, safeName(name, "file"));
  await fs.writeFile(file, response.data);
  return file;
}

async function login(page) {
  await page.goto("https://payhip.com/dashboard", { waitUntil: "domcontentloaded" });
  if (!page.url().includes("/auth/login")) return;
  if (!process.env.PAYHIP_EMAIL || !process.env.PAYHIP_PASSWORD) throw new Error("PAYHIP_EMAIL and PAYHIP_PASSWORD are required");
  await page.locator('input[placeholder="Enter your email"]').fill(process.env.PAYHIP_EMAIL);
  await page.locator('input[placeholder="Your password"]').fill(process.env.PAYHIP_PASSWORD);
  await page.getByRole("button", { name: /Log in/ }).click();
  await page.waitForURL(/payhip\.com\/dashboard/, { timeout: 30000 });
}

async function publish(payload) {
  if (!PUBLISH_ENABLED) throw new Error("Publishing disabled; set ALLOW_PAYHIP_PUBLISH=true");
  const urls = payload.productFileUrls || (payload.productFileUrl ? [payload.productFileUrl] : []);
  if (!payload.title || !urls.length || !payload.coverImageUrl) throw new Error("title, productFileUrl(s), and coverImageUrl are required");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "don-chaos-payhip-"));
  const browser = await chromium.launch({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
  const page = await browser.newPage();
  try {
    const files = await Promise.all(urls.map((url, i) => download(url, dir, `product-${i + 1}`)));
    const cover = await download(payload.coverImageUrl, dir, "cover.png");
    await login(page);
    await page.goto("https://payhip.com/product/add/digital", { waitUntil: "domcontentloaded" });
    const inputs = page.locator('input[type="file"]');
    await inputs.nth(0).setInputFiles(files);
    await page.locator("#p_name").fill(String(payload.title));
    await page.locator("#p_price").fill(String(payload.price ?? "0.99"));
    const editor = page.locator('[contenteditable="true"]').first();
    if (payload.description && await editor.isVisible().catch(() => false)) await editor.fill(String(payload.description));
    await page.locator('input[name="product_status"][value="visible"]').check();
    await inputs.nth(1).setInputFiles(cover);
    await page.locator("#addsubmit").click();
    await page.waitForURL(/payhip\.com\/(products|product\/edit)/, { timeout: 60000 });
    return { ok: true, url: page.url(), title: payload.title };
  } finally {
    await browser.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "don-chaos-payhip-worker", publishEnabled: PUBLISH_ENABLED }));
app.post("/payhip/publish", auth, async (req, res) => {
  try { res.json(await publish(req.body || {})); }
  catch (error) { console.error("Payhip publish failed:", error.message); res.status(500).json({ ok: false, error: error.message }); }
});

app.listen(PORT, () => console.log(`Don Chaos Payhip worker listening on ${PORT}`));
