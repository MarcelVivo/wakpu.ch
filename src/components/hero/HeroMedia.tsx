"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Asterisk, Volume2, VolumeX } from "lucide-react";
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
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, motionSnapshot, serverMotionSnapshot);

  // Toggling React's muted prop directly can make Safari miss the autoplay
  // window; the element is muted from the start via the plain attribute,
  // and only the user-triggered toggle updates the property imperatively.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    // iOS Safari does not reliably honour the autoplay attribute once a
    // video carries an audio track; explicitly muting and calling play()
    // after mount is the documented, reliable path there.
    if (reducedMotion || !videoRef.current) return;
    const node = videoRef.current;
    node.muted = true;
    node.play().catch(() => { /* Autoplay can still be refused; the poster stays visible. */ });
  }, [reducedMotion]);

  return <div className="hero-media" aria-label={dict.mediaAlt}>
    {!videoFailed && <video ref={videoRef} className="hero-video" autoPlay={!reducedMotion} muted playsInline preload="auto" loop={!reducedMotion} poster="/images/wakpu-hero-green.jpg" aria-hidden="true" onError={() => setVideoFailed(true)} {...{ "webkit-playsinline": "true" }}><source src="/video/wakpu-hero.mp4" type="video/mp4" /></video>}
    {!videoFailed && <button className="icon-button hero-sound-toggle" onClick={() => setMuted((current) => !current)} aria-label={muted ? dict.unmuteAria : dict.muteAria}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>}
    <div className="product-orbit-label"><Asterisk className="little-spark" strokeWidth={1.2} aria-hidden="true" /><span><Lines text={dict.orbitLabel} /></span></div>
    <div className="hero-product-note"><svg width="65" height="49" viewBox="0 0 65 49" fill="none" aria-hidden="true"><path d="M61 7C46 1 17 6 16 37M8 30L16 40L25 31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span><Lines text={dict.noteText} /></span></div>
  </div>;
}
