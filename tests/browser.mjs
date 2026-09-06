import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, webkit } from '@playwright/test';

const baseURL = process.env.WAKPU_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.WAKPU_SCREENSHOTS || '/private/tmp/wakpu-browser-qa';
await mkdir(output, { recursive: true });
const cachedChromium = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : existsSync(cachedChromium) ? { executablePath: cachedChromium } : {}) });
const errors = [];
try {
  for (const width of [375, 390, 430, 768, 1024, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${width}: ${error.message}`));
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.locator('.hero-product-image').waitFor();
    assert.equal(await page.locator('h1').innerText(), 'CRACK IT.\nFEEL IT.');
    assert(await page.locator('.hero-product-image').evaluate(image => image.complete && image.naturalWidth > 0), `Hero image must load at ${width}px`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal page overflow at ${width}px`);
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
    if ([390, 1440].includes(width)) await page.screenshot({ path: `${output}/hero-${width}.png` });
    await page.getByRole('button', { name: 'Warenkorb öffnen, 0 Artikel' }).click();
    const drawer = page.getByRole('dialog');
    await drawer.waitFor({ state: 'visible' });
    assert(await drawer.evaluate(element => element.contains(document.activeElement)), 'Cart receives keyboard focus');
    await page.keyboard.press('Shift+Tab');
    assert(await drawer.evaluate(element => element.contains(document.activeElement)), 'Reverse tab is trapped');
    await page.keyboard.press('Tab');
    assert(await drawer.evaluate(element => element.contains(document.activeElement)), 'Tab is trapped');
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'detached' });
    assert(await page.getByRole('button', { name: 'Warenkorb öffnen, 0 Artikel' }).evaluate(element => document.activeElement === element), 'Focus returns to cart trigger');
    const faq = page.locator('.faq-item').first();
    await faq.locator('summary').click();
    assert.equal(await faq.getAttribute('open'), '', 'FAQ expands');
    await faq.locator('summary').click();
    assert.equal(await faq.getAttribute('open'), null, 'FAQ collapses');
    await page.locator('.demo-panel').scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    if (!await page.locator('.demo-play').count()) assert(await page.getByText('Der Sound zum Bild kommt bald.').isVisible(), 'Missing demo has honest static fallback');
    console.log(`PASS ${width}px: no overflow, image, cart focus trap/Escape/restore, FAQ, demo fallback`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.hero-video').count(), 0, 'Missing hero videos fall back to poster');
  assert(await page.locator('.hero-product-image').isVisible());
  for (const route of ['/kontakt','/versand','/agb','/datenschutz','/impressum']) {
    const response = await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, `${route} exists`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} no mobile overflow`);
    assert(await page.locator('main h1').count() === 1, `${route} has heading`);
  }
  await page.goto(`${baseURL}/admin/orders`, { waitUntil: 'networkidle' });
  assert(/\/admin\/login/.test(page.url()) || /Admin-Zugang|Anmelden|Konfiguration/.test(await page.locator('body').innerText()), 'Admin is protected');
  await context.close();
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  console.log('PASS legal routes, admin protection and automatic hero fallback');
} finally { await browser.close(); }

if (process.env.WAKPU_TEST_WEBKIT === '1') {
  const webkitBrowser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE } : {}) });
  try {
    const page = await webkitBrowser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 3 });
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.getByRole('button', { name: 'Warenkorb öffnen, 0 Artikel' }).click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.screenshot({ path: `${output}/iphone-webkit.png`, fullPage: true });
    console.log('PASS iPhone WebKit: layout and drawer');
  } finally { await webkitBrowser.close(); }
}
