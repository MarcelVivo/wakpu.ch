import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { processFulfillmentJobs, syncFulfillment } from '@/lib/services/fulfillment';
import { processEmailJobs } from '@/lib/services/email';
import { logEvent } from '@/lib/logger';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
  try{
    const expected=process.env.CRON_SECRET?`Bearer ${process.env.CRON_SECRET}`:'';const actual=request.headers.get('authorization')||'';
    if(!expected||expected.length!==actual.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(actual)))return NextResponse.json({error:'Nicht autorisiert.'},{status:401});
    const fulfillment=await processFulfillmentJobs();const sync=await syncFulfillment();const email=await processEmailJobs();
    return NextResponse.json({fulfillment,sync,email});
  }catch{logEvent('cron.failed');return NextResponse.json({error:'Verarbeitung fehlgeschlagen.'},{status:500});}
}
