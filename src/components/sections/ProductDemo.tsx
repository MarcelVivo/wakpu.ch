"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX, Waves } from "lucide-react";

export function ProductDemo() {
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
      catch { setVideoError("Das Video kann gerade nicht abgespielt werden."); }
    }
  }

  return <section className="demo-section" aria-labelledby="demo-heading"><div className="container"><div className="demo-panel" ref={region}><div className="demo-copy"><p className="eyebrow"><Waves size={16} />EIN KLEINER CRACK. EIN GROSSES GEFÜHL.</p><h2 id="demo-heading">DAS MUSST<br />DU <span>HÖREN.</span></h2><p>Ton an. Drücken. Cracken.<br />Manche Momente brauchen keine Worte.</p><div className="demo-note">{available ? "Dein kurzer Moment zum Abschalten." : "Der Sound zum Bild kommt bald."}</div></div><div className="demo-media"><Image src="/images/wakpu-hero.png" alt="Nahaufnahme der aufgebrochenen pinken Wachsschicht mit weichem violettem Inneren." fill sizes="(max-width: 700px) 100vw, 55vw" className="demo-image" />{nearby && !failed && <video ref={video} src="/video/wakpu-demo.mp4" playsInline loop muted={muted} preload="metadata" onLoadedData={() => setAvailable(true)} onError={() => { setFailed(true); setAvailable(false); }} aria-label="WAKPU Crack-Demonstration mit Produktsound" className={playing ? "is-playing" : ""} />}{available && <div className="demo-controls"><button className="demo-play" onClick={togglePlaying} aria-label={playing ? "Produktvideo pausieren" : "Produktvideo mit Ton abspielen"}>{playing ? <Pause size={20} /> : <Play size={20} />}<span>{playing ? "PAUSE" : "TON AN. MOMENT AN."}</span></button><button className="icon-button" onClick={() => setMuted((current) => !current)} aria-label={muted ? "Ton einschalten" : "Ton ausschalten"}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}</button></div>}<span className="demo-detail-label">GANZ NAH. GANZ VIEL GEFÜHL.</span></div>{videoError && <p className="demo-error" role="status">{videoError}</p>}</div></div></section>;
}
