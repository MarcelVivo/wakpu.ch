"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";

function subscribeToMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotionSnapshot = () => true;

export function HeroMedia() {
  const [source, setSource] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, motionSnapshot, serverMotionSnapshot);

  return <div className="hero-media" aria-label="Pinker WAKPU-Ball mit aufbrechender Wachsschicht und violettem Inneren">
    <Image className="hero-product-image" src="/images/wakpu-hero.png" alt="Ein glänzender pinker Wax-Cracking-Ball. Unter der knackenden Schale schimmert das violette Innere." fill loading="eager" fetchPriority="high" sizes="(max-width: 700px) 110vw, 68vw" />
    {!reducedMotion && source < 2 && <video key={source} className={`hero-video${playing ? " is-playing" : ""}`} autoPlay muted playsInline loop preload="metadata" poster="/images/wakpu-hero.png" aria-hidden="true" onPlaying={() => setPlaying(true)} onError={() => { setPlaying(false); setSource(source + 1); }}><source src={source === 0 ? "/video/wakpu-hero.mp4" : "/video/wakpu-hero-placeholder.mp4"} type="video/mp4" onError={() => { setPlaying(false); setSource(source + 1); }} /></video>}
    <div className="product-orbit-label"><span className="little-spark" aria-hidden="true">✳</span><span>AUSSEN CRACK.<br />INNEN WOW.</span></div>
    <div className="hero-product-note"><svg width="65" height="49" viewBox="0 0 65 49" fill="none" aria-hidden="true"><path d="M61 7C46 1 17 6 16 37M8 30L16 40L25 31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>dein nächster<br />Lieblingsmoment.</span></div>
  </div>;
}
