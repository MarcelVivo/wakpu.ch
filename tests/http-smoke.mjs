import assert from 'node:assert/strict';
import http from 'node:http';
import https from 'node:https';
const base=process.env.WAKPU_BASE_URL||'http://127.0.0.1:3000';
const origin=process.env.WAKPU_SITE_ORIGIN||'http://localhost:3000';
for(const host of ['wakppu.ch','www.wakppu.ch','www.wakpu.ch']){
  // Node fetch normalises Host; use the HTTP client to test virtual-host routing.
  const r=await new Promise((resolve,reject)=>(base.startsWith('https:')?https:http).get(`${base}/versand?quelle=test`,{headers:{host}},res=>{res.resume();resolve(res);}).on('error',reject));assert.equal(r.statusCode,301);assert.equal(r.headers.location,'https://wakpu.ch/versand?quelle=test');
}
const badOrigin=await fetch(`${base}/api/checkout`,{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:'{}'});assert.equal(badOrigin.status,403);
const badCart=await fetch(`${base}/api/checkout`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),items:[{variantId:crypto.randomUUID(),quantity:1,price:1}]})});assert.equal(badCart.status,400);
const oversize=await fetch(`${base}/api/checkout`,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({text:'ä'.repeat(20000)})});assert.equal(oversize.status,400);
const hook=await fetch(`${base}/api/webhooks/stripe`,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(hook.status,400);
const forged=await fetch(`${base}/api/webhooks/stripe`,{method:'POST',headers:{'stripe-signature':'t=1,v1=forged'},body:'{}'});assert.equal(forged.status,400);
const cron=await fetch(`${base}/api/cron/fulfillment-sync`);assert.equal(cron.status,401);
const order=await fetch(`${base}/bestellung/WK-10001`,{redirect:'manual'});assert.equal(order.status,404);
assert.equal(order.headers.get('referrer-policy'),'no-referrer');assert(order.headers.get('x-robots-tag')?.includes('noindex'));
const admin=await fetch(`${base}/admin/orders`,{redirect:'follow'});assert(new URL(admin.url).pathname==='/admin/login'||(await admin.text()).includes('/admin/login'));
const home=await fetch(base);assert.equal(home.status,200);assert.equal(home.headers.get('x-frame-options'),'DENY');assert(home.headers.get('content-security-policy')?.includes("object-src 'none'"));
console.log('PASS HTTP: 301 domains and preserved query; checkout origin/input/body limits; webhook signatures; cron authentication; private order access; admin gate; security headers.');
