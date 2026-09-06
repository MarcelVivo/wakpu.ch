import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import type { SiteSettings } from "@/types/catalog";

export function FAQ({ settings }: { settings: SiteSettings }) {
  const questions = [
    ["Was ist ein WAKPU?", "WAKPU ist ein Wax-Cracking-Ball mit einer dünnen, knackenden Aussenschicht und einem weichen Inneren. Beim Drücken bricht die Wachsschicht Stück für Stück auf."],
    ["Wie funktioniert WAKPU?", "Nimm den Ball in die Hand und drücke ihn vorsichtig zusammen. Die äussere Wachsschicht bekommt Risse und bricht auf. Darunter spürst du das weiche Innere. Beachte die mitgelieferten Produktinformationen."],
    ["Kann WAKPU mehrfach verwendet werden?", settings.product_reuse_text || "Die aufgebrochene Wachsschicht stellt sich nicht von selbst wieder her. Der erste Crack ist deshalb ein besonderer Moment. Weitere Hinweise zur Verwendung werden mit den bestätigten Produktinformationen ergänzt."],
    ["Welche Farbe bekomme ich?", "Aktuell setzen wir auf Mystery Color: Welche Farbe dein WAKPU hat, bleibt bis zum Auspacken eine Überraschung. Eine bestimmte Farbe kann bei Mystery Color nicht ausgewählt oder zugesichert werden."],
    ["Wie lange dauert die Lieferung?", settings.shipping_text || "Die Lieferzeit wird vor Verkaufsstart mit dem Lieferpartner bestätigt. Solange keine verbindlichen Lieferinformationen vorliegen, sind Bestellungen nicht möglich."],
    ["Woher wird WAKPU verschickt?", settings.shipping_origin || "Der Versandstandort wird nach Auswahl des Lieferpartners hier veröffentlicht. Wir behaupten keinen Versand aus der Schweiz, solange dieser nicht bestätigt ist."],
    ["Wie kann ich meine Bestellung verfolgen?", "In deiner Bestellbestätigung findest du einen persönlichen Link zu deinem Bestellstatus. Sobald eine Sendungsnummer vorliegt, erhältst du die Trackinginformationen per E-Mail."],
    ["Welche Zahlungsmöglichkeiten gibt es?", "Wir wickeln deine Zahlung über Stripe Checkout ab. Welche Zahlungsmittel für deine Bestellung verfügbar sind, siehst du direkt im Checkout. Bezahlt wird in Schweizer Franken (CHF)."],
    ["Was mache ich, wenn mein Produkt beschädigt ankommt?", "Kontaktiere uns mit deiner Bestellnummer und einer kurzen Beschreibung. Fotos von Produkt und Verpackung helfen uns, den Fall zu prüfen. Du findest unsere Kontaktangaben auf der Kontaktseite."],
    ["Ist WAKPU für Kinder geeignet?", settings.product_safety_text || "Die Altersempfehlung, Materialangaben und Sicherheitshinweise sind noch in Abklärung und werden vor Verkaufsstart veröffentlicht. Eine Eignung für ein bestimmtes Alter können wir aktuell nicht bestätigen. Bitte beachte die endgültigen Produkt- und Sicherheitshinweise."],
  ];
  return <section className="faq-section section-space" id="faq" aria-labelledby="faq-heading"><div className="container faq-layout"><div className="faq-intro"><p className="eyebrow">NOCH EIN FRAGEZEICHEN?</p><h2 id="faq-heading">Gut gefragt.<br /><span className="muted-heading">Klar gesagt.</span></h2><p>Alles rund um deinen WAKPU.<br />Und wenn noch etwas offen ist:</p><Link href="/kontakt" className="text-link">Schreib uns<ArrowUpRight size={16} /></Link><span className="faq-asterisk" aria-hidden="true">✳</span></div><div className="faq-list">{questions.map(([question, answer], index) => <details className="faq-item" key={question}><summary><span className="faq-number">{String(index + 1).padStart(2, "0")}</span><span>{question}</span><Plus size={19} strokeWidth={1.5} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div></section>;
}
