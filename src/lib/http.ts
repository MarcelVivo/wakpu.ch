import 'server-only';
import { NextResponse } from 'next/server';
import { siteUrl } from './env';
export { readBoundedJson as readJson } from './validation/request';
export function assertSameOrigin(request:Request):void {
  if(request.headers.get('origin')!==siteUrl())throw new Error('ORIGIN');
}
export function apiError(message='Bei deiner Bestellung ist etwas schiefgelaufen. Bitte versuche es nochmals.',status=500) {
  return NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
}
