"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX, Waves } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

export function ProductDemo({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).productDemo;
  const [nearby, setNearby] = useState(false);
  const [available, setAvailable] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoError, setVideoError] = useState("");
  const region = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!region.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setNearby(true); observer.disconnect(); } }, { rootMargin: "150px" });
    observer.observe(region.current);
    return () => observer.disconnect();
  }, []);

  async function togglePlaying() {
    if (!video.current) return;
    setVideoError("");
    if (playing) { video.current.pause(); setPlaying(false); }
    else {
      try { await video.current.play(); setPlaying(true); }
      catch { setVideoError(dict.playbackError); }
    }
  }

  return <section className="demo-section" aria-labelledby="demo-heading"><div className="container"><div className="demo-panel" ref={region}><div className="demo-copy"><p className="eyebrow"><Waves size={16} />{dict.eyebrow}</p><h2 id="demo-heading">{dict.line1}<br />{dict.line2Plain}<span>{dict.line2Highlight}</span></h2><p><Lines text={dict.intro} /></p><div className="demo-note">{available ? dict.noteAvailable : dict.noteMissing}</div></div><div className="demo-media"><Image src="/images/wakpu-demo-poster.jpg" alt={dict.imageAlt} fill sizes="(max-width: 700px) 100vw, 55vw" className="demo-image" />{nearby && !failed && <video ref={video} src="/video/wakpu-demo.mp4" playsInline loop muted={muted} preload="metadata" poster="/images/wakpu-demo-poster.jpg" onLoadedData={() => setAvailable(true)} onError={() => { setFailed(true); setAvailable(false); }} aria-label={dict.videoAria} className={playing ? "is-playing" : ""} />}{available && <div className="demo-controls"><button className="demo-play" onClick={togglePlaying} aria-label={playing ? dict.pauseAria : dict.playAria}>{playing ? <Pause size={20} /> : <Play size={20} />}<span>{playing ? dict.pause : dict.playWithSound}</span></button><button className="icon-button" onClick={() => setMuted((current) => !current)} aria-label={muted ? dict.unmuteAria : dict.muteAria}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}</button></div>}<span className="demo-detail-label">{dict.detailLabel}</span></div>{videoError && <p className="demo-error" role="status">{videoError}</p>}</div></div></section>;
}
