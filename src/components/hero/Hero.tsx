import { ArrowDown, ArrowRight, LockKeyhole, PackageCheck } from "lucide-react";
import { HeroMedia } from "./HeroMedia";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

export function Hero({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).hero;
  return <section className="hero" id="hero" aria-labelledby="hero-heading">
    <div className="hero-inner container">
      <div className="hero-copy"><div className="trend-label"><span aria-hidden="true" />{dict.trendLabel}</div><h1 id="hero-heading">{dict.heading1}<br /><span>{dict.heading2}</span></h1><p className="hero-subline"><Lines text={dict.subline} /></p><div className="hero-buttons"><a href="#shop" className="button button-dark">{dict.tryNow}<ArrowUpRightIcon /></a><a href="#so-funktionierts" className="text-link">{dict.howItWorks}<ArrowRight size={15} /></a></div><div className="hero-trust"><span><LockKeyhole size={13} />{dict.trustPayment}</span><span className="hero-trust-divider" /><span><PackageCheck size={14} />{dict.trustShipping}</span></div></div>
      <HeroMedia locale={locale} />
      <div className="hero-bottom"><span><span className="step-index">01</span> {dict.stepWords[0]} <span className="step-dot">·</span><span className="step-index">02</span> {dict.stepWords[1]} <span className="step-dot">·</span><span className="step-index">03</span> {dict.stepWords[2]}</span><a href="#so-funktionierts" aria-label={dict.scrollAria}><span>{dict.scrollLabel}</span><ArrowDown size={17} /></a></div>
    </div>
  </section>;
}

function ArrowUpRightIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18L18 6M6 6H18V18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
