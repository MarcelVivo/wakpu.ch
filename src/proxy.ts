import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { WAKPU_SCHEMA } from '@/lib/supabase/schema';
import { defaultLocale, isLocale } from '@/i18n/locales';

function detectLocale(request: NextRequest): string {
  const header = request.headers.get('accept-language') || '';
  for (const part of header.split(',')) {
    const code = part.trim().split(';')[0].split('-')[0].toLowerCase();
    if (isLocale(code)) return code;
  }
  return defaultLocale;
}

export async function proxy(request: NextRequest) {
  const host=(request.headers.get('host')??'').split(':')[0].toLowerCase();
  if(['wakppu.ch','www.wakppu.ch','www.wakpu.ch'].includes(host)){
    return NextResponse.redirect(new URL(request.nextUrl.pathname+request.nextUrl.search,'https://wakpu.ch'),301);
  }
  const {pathname}=request.nextUrl;
  const isAppRoute=!pathname.startsWith('/dashboard')&&!pathname.startsWith('/api')&&!pathname.includes('.');
  if(isAppRoute){
    const segment=pathname.split('/')[1]??'';
    if(!isLocale(segment)){
      const locale=detectLocale(request);
      const url=request.nextUrl.clone();
      url.pathname=pathname==='/'?`/${locale}`:`/${locale}${pathname}`;
      return NextResponse.redirect(url,307);
    }
    request.headers.set('x-locale',segment);
  }
  let response=NextResponse.next({request});
  if(pathname.startsWith('/dashboard')&&process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){
    const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{db:{schema:WAKPU_SCHEMA},cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll:values=>{values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));},
    }});
    // Refresh cookies here; every protected page/action independently verifies user and role.
    await supabase.auth.getUser();
  }
  return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']};
