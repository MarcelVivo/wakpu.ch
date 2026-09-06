import { ArrowDown, ArrowRight, LockKeyhole, PackageCheck } from "lucide-react";
import { HeroMedia } from "./HeroMedia";

export function Hero() {
  return <section className="hero" id="hero" aria-labelledby="hero-heading">
    <div className="hero-inner container">
      <div className="hero-copy"><div className="trend-label"><span aria-hidden="true" />DER CRACKING-TREND</div><h1 id="hero-heading">CRACK IT.<br /><span>FEEL IT.</span></h1><p className="hero-subline">Ein kurzer Druck.<br />Ein ziemlich guter Moment.</p><div className="hero-buttons"><a href="#shop" className="button button-dark">JETZT AUSPROBIEREN<ArrowUpRightIcon /></a><a href="#so-funktionierts" className="text-link">So funktionierts<ArrowRight size={15} /></a></div><div className="hero-trust"><span><LockKeyhole size={13} />Zahlung mit Stripe</span><span className="hero-trust-divider" /><span><PackageCheck size={14} />Lieferung in die Schweiz</span></div></div>
      <HeroMedia />
      <div className="hero-bottom"><span><span className="step-index">01</span> DRÜCKEN <span className="step-dot">·</span><span className="step-index">02</span> CRACKEN <span className="step-dot">·</span><span className="step-index">03</span> FÜHLEN</span><a href="#so-funktionierts" aria-label="WAKPU entdecken, nach unten scrollen"><span>WEITER FÜHLEN</span><ArrowDown size={17} /></a></div>
    </div>
  </section>;
}

function ArrowUpRightIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18L18 6M6 6H18V18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
