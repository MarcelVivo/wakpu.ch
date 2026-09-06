import { ArrowDownRight } from "lucide-react";

const steps = [
  { number: "01", title: "PRESS.", text: "Nimm deinen WAKPU in die Hand. Ein leichter Druck – und der Moment beginnt.", label: "DAS ERSTE GEFÜHL", className: "press" },
  { number: "02", title: "CRACK.", text: "Die dünne Wachsschicht bricht Stück für Stück auf. Genau das ist der Crack.", label: "DER GUTE KNACK", className: "crack" },
  { number: "03", title: "FEEL.", text: "Unter der knackenden Schale wartet das weiche Innere. Fühl den Unterschied.", label: "DEIN WOW-MOMENT", className: "feel" },
];

export function HowItWorks() {
  return <section className="how-section section-space" id="so-funktionierts" aria-labelledby="how-heading"><div className="container"><div className="section-topline"><p className="eyebrow">WAS IST WAKPU?</p><span className="section-counter">01 / DAS GEFÜHL</span></div><div className="section-heading-row"><h2 id="how-heading">Drücken. Cracken.<br /><span className="muted-heading">Kurz alles fühlen.</span></h2><p>Eine dünne, knackende Aussenschicht.<br />Ein weiches Inneres. WAKPU ist der<br className="desktop-break" /> Wax-Cracking-Ball für deinen kleinen Wow-Moment.</p></div><div className="steps-grid">{steps.map((step) => <article className={`step-card step-${step.className}`} key={step.number}><div className="step-card-top"><span>{step.number}</span><ArrowDownRight size={23} strokeWidth={1.3} aria-hidden="true" /></div><div className="step-title-wrap"><span className="step-material" aria-hidden="true" /><h3>{step.title}</h3></div><p>{step.text}</p><span className="step-caption">{step.label}</span></article>)}</div></div></section>;
}
