import { z } from 'zod';
export const checkoutSchema = z.object({
  requestId: z.uuid(),
  items:z.array(z.object({variantId:z.uuid(),quantity:z.number().int().min(1).max(10)}).strict()).min(1).max(10),
}).strict().superRefine((data,ctx)=>{
  if(new Set(data.items.map(i=>i.variantId)).size!==data.items.length) ctx.addIssue({code:'custom',message:'Duplicate variants'});
  if(data.items.reduce((n,i)=>n+i.quantity,0)>30) ctx.addIssue({code:'custom',message:'Too many items'});
});
export const customerSchema = z.object({email:z.email(),first_name:z.string().min(1).max(200),last_name:z.string().max(200),phone:z.string().nullable(),address_line1:z.string().min(1).max(300),address_line2:z.string().nullable(),postal_code:z.string().regex(/^\d{4}$/),city:z.string().min(1).max(200),country:z.literal('CH')});
