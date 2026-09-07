'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
import type { Locale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export function CheckoutComplete({paid,valid,locale}:{paid:boolean;valid:boolean;locale:Locale}){
  const router=useRouter();const {clearCart}=useCart();const [attempts,setAttempts]=useState(0);
  const dict=getDictionary(locale).checkoutSuccess;
  useEffect(()=>{if(paid){clearCart();return;}if(!valid||attempts>=12)return;const timeout=setTimeout(()=>{setAttempts(n=>n+1);router.refresh();},2500);return ()=>clearTimeout(timeout);},[paid,valid,attempts,router,clearCart]);
  return !paid?<button className="button button-outline" onClick={()=>router.refresh()}>{dict.refresh}</button>:null;
}
