import 'server-only';
// Explicit allowlist: never log request bodies, email addresses, tokens or vendor errors.
export function logEvent(event: string, details: {orderId?:string;eventId?:string;code?:string;count?:number} = {}) {
  console.info(JSON.stringify({time:new Date().toISOString(),event,...details}));
}
