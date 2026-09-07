"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

function subscribeToMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const motionSnapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotionSnapshot = () => true;

export function HeroMedia({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).hero;
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, motionSnapshot, serverMotionSnapshot);

  return <div className="hero-media" aria-label={dict.mediaAlt}>
    <Image className="hero-product-image" src="/images/wakpu-hero-green.jpg" alt={dict.imageAlt} fill loading="eager" fetchPriority="high" sizes="(max-width: 700px) 110vw, 68vw" />
    {!reducedMotion && !videoFailed && <video className={`hero-video${playing ? " is-playing" : ""}`} autoPlay muted playsInline loop preload="metadata" poster="/images/wakpu-hero-green.jpg" aria-hidden="true" onPlaying={() => setPlaying(true)} onError={() => { setPlaying(false); setVideoFailed(true); }}><source src="/video/wakpu-hero.mp4" type="video/mp4" /></video>}
    <div className="product-orbit-label"><span className="little-spark" aria-hidden="true">✳</span><span><Lines text={dict.orbitLabel} /></span></div>
    <div className="hero-product-note"><svg width="65" height="49" viewBox="0 0 65 49" fill="none" aria-hidden="true"><path d="M61 7C46 1 17 6 16 37M8 30L16 40L25 31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span><Lines text={dict.noteText} /></span></div>
  </div>;
}
