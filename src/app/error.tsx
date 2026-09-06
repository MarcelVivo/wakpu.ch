'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="main-content" className="page-shell prose"><h1>Ein kurzer Zwischenstopp.</h1><p>Die Seite konnte gerade nicht geladen werden. Bitte versuche es nochmals.</p><button className="button button-dark" onClick={reset}>Nochmals laden</button></main>;}
