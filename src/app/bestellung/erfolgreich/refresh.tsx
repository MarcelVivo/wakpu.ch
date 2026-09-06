'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
export function CheckoutComplete({paid,valid}:{paid:boolean;valid:boolean}){
  const router=useRouter();const {clearCart}=useCart();const [attempts,setAttempts]=useState(0);
  useEffect(()=>{if(paid){clearCart();return;}if(!valid||attempts>=12)return;const timeout=setTimeout(()=>{setAttempts(n=>n+1);router.refresh();},2500);return ()=>clearTimeout(timeout);},[paid,valid,attempts,router,clearCart]);
  return !paid?<button className="button button-outline" onClick={()=>router.refresh()}>Status aktualisieren</button>:null;
}
