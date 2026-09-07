"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, LockKeyhole, PackageCheck } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

const PIN_VH = 260; // total scroll distance the whole sequence takes, in vh
const TEXT_EXIT_END = 0.32; // headline/subline finish sliding away by this fraction
const VIDEO_END = 0.72; // video reaches its last frame by this fraction
const FADE_START = 0.8; // the white fade-to-white starts here and finishes at 1

export function Hero({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).hero;
  const [videoFailed, setVideoFailed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    if (!wrapper || !video) return;
    let frame = 0;

    // Everything below is driven directly by scroll position, not by playback
    // or CSS transitions, so the video/text/fade always match where the user
    // actually is on the page, in both scroll directions.
    function apply() {
      frame = 0;
      const scrollRange = wrapper!.offsetHeight - window.innerHeight;
      const rect = wrapper!.getBoundingClientRect();
      const progress = scrollRange > 0 ? Math.min(1, Math.max(0, -rect.top / scrollRange)) : 0;

      if (durationRef.current) {
        const videoProgress = Math.min(1, progress / VIDEO_END);
        video!.currentTime = videoProgress * durationRef.current;
      }
      if (textRef.current) {
        const textProgress = Math.min(1, progress / TEXT_EXIT_END);
        textRef.current.style.transform = `translateY(${-textProgress * 14}vh)`;
        textRef.current.style.opacity = String(1 - textProgress);
      }
      const fadeProgress = Math.max(0, Math.min(1, (progress - FADE_START) / (1 - FADE_START)));
      if (fadeRef.current) fadeRef.current.style.opacity = String(fadeProgress);
      if (ctaRef.current) ctaRef.current.style.opacity = String(1 - fadeProgress);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(apply);
    }
    function onLoadedMetadata() {
      durationRef.current = video!.duration;
      apply();
    }
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // The metadata can already be loaded (cache, fast network) before this
    // listener attaches, in which case the event above never fires.
    if (video.readyState >= 1 && !Number.isNaN(video.duration)) onLoadedMetadata();
    else apply();
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <section className="hero-scroll-wrapper" style={{ height: `${PIN_VH}vh` }} ref={wrapperRef} id="hero" aria-labelledby="hero-heading">
    <div className="hero-pinned">
      {!videoFailed && <video ref={videoRef} className="hero-bg-video" muted playsInline preload="auto" poster="/images/wakpu-hero-collision.jpg" aria-hidden="true" onError={() => setVideoFailed(true)}><source src="/video/wakpu-hero.mp4" type="video/mp4" /></video>}
      <div className="hero-overlay">
        <div className="hero-slide-text" ref={textRef}>
          <div className="trend-label"><span aria-hidden="true" />{dict.trendLabel}</div>
          <h1 id="hero-heading">{dict.heading1}<br /><span>{dict.heading2}</span></h1>
          <p className="hero-subline"><Lines text={dict.subline} /></p>
          <a href="#so-funktionierts" className="text-link">{dict.howItWorks}<ArrowRight size={15} /></a>
          <div className="hero-trust"><span><LockKeyhole size={13} />{dict.trustPayment}</span><span className="hero-trust-divider" /><span><PackageCheck size={14} />{dict.trustShipping}</span></div>
        </div>
        <div className="hero-cta-fixed" ref={ctaRef}>
          <a href="#shop" className="button button-dark">{dict.tryNow}<ArrowUpRightIcon /></a>
        </div>
      </div>
      <div className="hero-white-fade" ref={fadeRef} aria-hidden="true" />
    </div>
  </section>;
}

function ArrowUpRightIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18L18 6M6 6H18V18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
