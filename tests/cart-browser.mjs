/** Browser integration against catalog-fixture.mjs. Checkout is intercepted: no payment or external session is created. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
const baseURL = process.env.WAKPU_BASE_URL || 'http://127.0.0.1:3000';
const fixture = process.env.WAKPU_FIXTURE_URL || 'http://127.0.0.1:54322';
const output = '/private/tmp/wakpu-browser-qa';
await mkdir(output, {recursive:true});
const products = await (await fetch(`${fixture}/fixtures/catalog`)).json();
assert.equal(products.length, 3, 'Actual SQL seed contains three products');
const cachedChromium = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : existsSync(cachedChromium) ? { executablePath: cachedChromium } : {}) });
const price = cents => `CHF ${(cents / 100).toFixed(2)}`;
const errors = [];
try {
  const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(baseURL, {waitUntil:'networkidle'});
  assert.equal(await page.locator('.product-card').count(),3);
  assert.equal(await page.locator('.mobile-cart-bar').count(),0, 'Sticky add button is absent in initial hero');
  for (let index=0;index<3;index++) {
    const card=page.locator('.product-card').nth(index);
    assert.equal(await card.locator('h3').innerText(),products[index].name);
    assert.equal(await card.locator('.product-name-price > span').innerText(),price(products[index].variants[0].price_chf_cents));
  }
  assert.equal(await page.getByText('BELIEBT',{exact:true}).count(),0,'No unsupported popularity badge');
  await page.locator('#shop').scrollIntoViewIfNeeded();
  await page.locator('.mobile-cart-bar').waitFor();
  await page.locator('.product-card').first().getByRole('button',{name:'IN DEN WARENKORB'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.waitFor();
  assert.equal(await dialog.locator('.cart-line').count(),1);
  assert.equal(await dialog.locator('output').innerText(),'1');
  const itemName=products[0].name;
  await page.getByRole('button',{name:`Mehr ${itemName}`}).click();
  assert.equal(await dialog.locator('output').innerText(),'2');
  assert.equal(await dialog.locator('.cart-line-bottom strong').innerText(),price(products[0].variants[0].price_chf_cents*2));
  await page.getByRole('button',{name:`Weniger ${itemName}`}).click();
  assert.equal(await dialog.locator('output').innerText(),'1');
  assert(await page.getByRole('button',{name:`Weniger ${itemName}`}).isDisabled());
  await page.keyboard.press('Escape');
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Warenkorb öffnen, 1 Artikel'}).click();
  assert.equal(await dialog.locator('output').innerText(),'1','Cart survives reload');
  await page.screenshot({path:`${output}/cart-390.png`});
  await page.keyboard.press('Escape');
  await page.evaluate(variantId=>localStorage.setItem('wakpu-cart-v1',JSON.stringify([{variantId,quantity:1,price_chf_cents:1,product_name:'Forged price',price:0}])),products[0].variants[0].id);
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Warenkorb öffnen, 1 Artikel'}).click();
  assert.equal(await dialog.locator('.cart-line-bottom strong').innerText(),price(products[0].variants[0].price_chf_cents),'Forged persisted prices are ignored');
  const payloads=[];
  await page.route('**/api/checkout',async route=>{
    payloads.push(route.request().postDataJSON());
    await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Test: Checkout absichtlich abgefangen.'})});
  });
  await dialog.getByRole('button',{name:'SICHER ZUR KASSE'}).click();
  await dialog.getByRole('alert').waitFor();
  await dialog.getByRole('button',{name:'SICHER ZUR KASSE'}).click();
  await page.waitForFunction(()=>document.querySelector('[role=alert]')?.textContent?.includes('absichtlich'));
  assert.equal(payloads.length,2);
  assert.deepEqual(Object.keys(payloads[0]).sort(),['items','requestId']);
  assert.deepEqual(payloads[0].items,[{variantId:products[0].variants[0].id,quantity:1}]);
  assert.match(payloads[0].requestId,/^[0-9a-f-]{36}$/);
  assert.equal(payloads[0].requestId,payloads[1].requestId,'Network retries keep an idempotency key');
  await dialog.getByRole('button',{name:`Mehr ${itemName}`}).click();
  await dialog.getByRole('button',{name:'SICHER ZUR KASSE'}).click();
  await page.waitForTimeout(100);
  assert.notEqual(payloads[2].requestId,payloads[1].requestId,'Changed cart gets new request ID');
  for(let i=2;i<10;i++) await dialog.getByRole('button',{name:`Mehr ${itemName}`}).click();
  assert.equal(await dialog.locator('output').innerText(),'10');
  assert(await dialog.getByRole('button',{name:`Mehr ${itemName}`}).isDisabled(),'Quantity limit matches API');
  await dialog.getByRole('button',{name:`${itemName} entfernen`}).click();
  await dialog.getByText('Noch kein Crack').waitFor();
  assert.equal(await dialog.locator('.cart-line').count(),0);
  await page.keyboard.press('Escape');
  for (const width of [375,390,430,768,1024,1440,1920]) {
    await page.setViewportSize({width,height:width<700?844:1000});
    await page.goto(baseURL,{waitUntil:'networkidle'});
    await page.locator('#shop').scrollIntoViewIfNeeded();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Populated catalog no overflow ${width}`);
    for (const card of await page.locator('.product-card').all()) assert(await card.getByRole('button',{name:'IN DEN WARENKORB'}).isVisible());
    if([390,1440].includes(width)) await page.screenshot({path:`${output}/catalog-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS seeded catalog prices, add/remove, quantity10, persistence, forged-price defence, mobile sticky, checkout payload/idempotency/error, seven responsive widths');
} finally {await browser.close();}
