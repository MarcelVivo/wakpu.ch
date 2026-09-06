'use client';
export default function GlobalError({reset}:{reset:()=>void}){return <html lang="de-CH"><body style={{fontFamily:'Arial,sans-serif',padding:40}}><h1>WAKPU</h1><p>Der Shop ist vorübergehend nicht erreichbar. Bitte versuche es später nochmals.</p><button onClick={reset}>Nochmals laden</button></body></html>;}
