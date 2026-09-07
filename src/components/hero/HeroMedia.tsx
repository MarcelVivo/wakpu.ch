"use client";

import { useEffect, useRef, useState } from "react";
import { Asterisk } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

export function HeroMedia({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).hero;
  const [videoFailed, setVideoFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);
  const startYRef = useRef(0);

  useEffect(() => {
    const video: HTMLVideoElement | null = videoRef.current;
    const container: HTMLDivElement | null = containerRef.current;
    if (!video || !container) return;
    let frame = 0;
    startYRef.current = container.getBoundingClientRect().top + window.scrollY;

    // Scrubs the video by scroll position instead of playing it: it sits at
    // its first frame until the hero reaches the top of the viewport, then
    // scrolling down moves forward through the collision and back up reverses it.
    function setFrameFromScroll() {
      frame = 0;
      if (!durationRef.current) return;
      const progress = Math.min(1, Math.max(0, (window.scrollY - startYRef.current) / container!.offsetHeight));
      video!.currentTime = progress * durationRef.current;
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(setFrameFromScroll);
    }
    function onLoadedMetadata() {
      durationRef.current = video!.duration;
      setFrameFromScroll();
    }
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The metadata can already be loaded (cache, fast local network) before
    // this listener attaches, in which case the event above never fires.
    if (video.readyState >= 1 && !Number.isNaN(video.duration)) onLoadedMetadata();
    else setFrameFromScroll();
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="hero-media" ref={containerRef} aria-label={dict.mediaAlt}>
    {!videoFailed && <video ref={videoRef} className="hero-video" muted playsInline preload="auto" poster="/images/wakpu-hero-collision.jpg" aria-hidden="true" onError={() => setVideoFailed(true)}><source src="/video/wakpu-hero.mp4" type="video/mp4" /></video>}
    <div className="product-orbit-label"><Asterisk className="little-spark" strokeWidth={1.2} aria-hidden="true" /><span><Lines text={dict.orbitLabel} /></span></div>
    <div className="hero-product-note"><svg width="65" height="49" viewBox="0 0 65 49" fill="none" aria-hidden="true"><path d="M61 7C46 1 17 6 16 37M8 30L16 40L25 31" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span><Lines text={dict.noteText} /></span></div>
  </div>;
}
