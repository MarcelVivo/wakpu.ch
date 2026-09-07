import { ArrowDownRight } from "lucide-react";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

export function HowItWorks({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale).howItWorks;
  return <section className="how-section section-space" id="so-funktionierts" aria-labelledby="how-heading"><div className="container"><div className="section-topline"><p className="eyebrow">{dict.eyebrow}</p><span className="section-counter">{dict.counter}</span></div><div className="section-heading-row"><h2 id="how-heading">{dict.heading1}<br /><span className="muted-heading">{dict.heading2}</span></h2><p><Lines text={dict.intro} /></p></div><div className="steps-grid">{dict.steps.map((step) => <article className={`step-card step-${["press", "crack", "feel"][Number(step.number) - 1]}`} key={step.number}><div className="step-card-top"><span>{step.number}</span><ArrowDownRight size={23} strokeWidth={1.3} aria-hidden="true" /></div><div className="step-title-wrap"><span className="step-material" aria-hidden="true" /><h3>{step.title}</h3></div><p>{step.text}</p><span className="step-caption">{step.label}</span></article>)}</div></div></section>;
}
