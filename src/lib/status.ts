export const statusLabels:Record<string,string>={pending:'Ausstehend',paid:'Bezahlt',failed:'Fehlgeschlagen',refunded:'Erstattet',fulfillment_pending:'In Vorbereitung',fulfillment_submitted:'Übermittelt',processing:'In Bearbeitung',shipped:'Versendet',delivered:'Zugestellt',manual_review:'In Abklärung',cancelled:'Storniert',not_started:'Noch nicht gestartet',submitted:'Übermittelt',completed:'Abgeschlossen'};
export function statusLabel(value:string){return statusLabels[value]||value;}
export function formatCHF(cents:number){return `CHF ${(cents/100).toFixed(2)}`;}
export function formatDate(date:string,locale='de'){return new Intl.DateTimeFormat(`${locale}-CH`,{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Zurich'}).format(new Date(date));}
