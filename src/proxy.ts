import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
export async function proxy(request: NextRequest) {
  const host=(request.headers.get('host')??'').split(':')[0].toLowerCase();
  if(['wakppu.ch','www.wakppu.ch','www.wakpu.ch'].includes(host)){
    return NextResponse.redirect(new URL(request.nextUrl.pathname+request.nextUrl.search,'https://wakpu.ch'),301);
  }
  let response=NextResponse.next({request});
  if(request.nextUrl.pathname.startsWith('/admin')&&process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY){
    const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{
      getAll:()=>request.cookies.getAll(),
      setAll:values=>{values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));},
    }});
    // Refresh cookies here; every protected page/action independently verifies user and role.
    await supabase.auth.getUser();
  }
  return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};
