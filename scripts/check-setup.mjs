import fs from 'node:fs';
const values={...process.env};
for(const file of ['.env','.env.local']){
  if(!fs.existsSync(file))continue;
  for(const line of fs.readFileSync(file,'utf8').split('\n')){
    const match=line.match(/^([A-Z_]+)\s*=\s*(.*)$/);if(match)values[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');
  }
}
const required=['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','RESEND_API_KEY','RESEND_FROM_EMAIL','ADMIN_EMAIL','CRON_SECRET','ORDER_ACCESS_SECRET'];
let missing=0;
for(const key of required){const valid=Boolean(values[key])&&(!['CRON_SECRET','ORDER_ACCESS_SECRET'].includes(key)||values[key].length>=32);console.log(`${valid?'OK':'FEHLT/UNGÜLTIG'} ${key}`);if(!valid)missing++;}
console.log(`Fulfillment: ${values.FULFILLMENT_PROVIDER||'mock'} (Mock löst keine echte Lieferung aus)`);
console.log('Keine Schlüsselwerte ausgegeben. Anbieter-Verbindung und Domain-Verifikation separat testen.');
process.exitCode=missing?1:0;
