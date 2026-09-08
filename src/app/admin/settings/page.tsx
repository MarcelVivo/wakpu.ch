import { requireAdmin } from '@/lib/auth/admin';
import { getRawSettings } from '@/lib/catalog';
import { AdminNav,AdminNotice } from '@/components/admin/AdminNav';
import { saveSettings } from '../actions';
export default async function SettingsPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  await requireAdmin();const {status}=await searchParams;const s=await getRawSettings();if(!s)throw new Error('SETTINGS_UNAVAILABLE');
  const businessTexts=[['support_email','Support-E-Mail'],['business_name','Name / Firma'],['business_address','Strasse und Hausnummer'],['business_postal_city','PLZ und Ort']] as const;
  const contentTexts=[['default_shipping_text','Lieferzeit und Versandhinweis'],['shipping_origin_text','Tatsächlicher Versandursprung'],['product_safety_text','Belegte Produkt- und Sicherheitshinweise'],['product_use_text','Hinweis zur Wiederverwendung']] as const;
  const legalTexts=[['legal_terms','Freigegebene AGB'],['privacy_notice','Freigegebene Datenschutzerklärung']] as const;
  return <><AdminNav/><p className="eyebrow">KONFIGURATION</p><h1>Einstellungen.</h1><AdminNotice status={status}/><form action={saveSettings} className="admin-form">
    <fieldset>
      <legend>Shop-Status</legend>
      <label className="check-label"><input type="checkbox" name="shop_maintenance" defaultChecked={s.shop_maintenance}/>Bestellungen pausieren (Wartungsmodus)</label>
      <label className="check-label"><input type="checkbox" name="fulfillment_enabled" defaultChecked={s.fulfillment_enabled}/>Automatisches Fulfillment aktivieren</label>
      <p className="admin-fieldset-hint">Gilt auch für Mock-Tests. Aktueller Provider: {process.env.FULFILLMENT_PROVIDER||'mock'}. Ein echter Provider muss vor dem Live-Verkauf eingerichtet werden.</p>
    </fieldset>
    <hr className="admin-form-divider"/>
    <fieldset>
      <legend>Versand &amp; Kosten</legend>
      <div className="admin-form-row">
        <label>Maximale Lieferantenkosten pro Bestellung, Rappen<input type="number" name="max_supplier_order_cost_cents" min={0} step={1} required defaultValue={s.max_supplier_order_cost_cents}/></label>
        <label>Versandkosten, Rappen<input type="number" name="shipping_cost_cents" min={0} step={1} required defaultValue={s.shipping_cost_cents}/></label>
      </div>
    </fieldset>
    <hr className="admin-form-divider"/>
    <fieldset>
      <legend>Geschäftsangaben</legend>
      <div className="admin-form-row">{businessTexts.map(([field,label])=><label key={field}>{label}<input name={field} type={field==='support_email'?'email':'text'} defaultValue={s[field]}/></label>)}</div>
    </fieldset>
    <hr className="admin-form-divider"/>
    <fieldset>
      <legend>Kunden-Texte (FAQ, Footer, Versand)</legend>
      {contentTexts.map(([field,label])=><label key={field}>{label}<textarea name={field} defaultValue={s[field]} rows={3}/></label>)}
    </fieldset>
    <hr className="admin-form-divider"/>
    <fieldset>
      <legend>Rechtliches</legend>
      {legalTexts.map(([field,label])=><label key={field}>{label}<textarea name={field} defaultValue={s[field]} rows={10}/></label>)}
      <label className="check-label"><input type="checkbox" name="swiss_shop_verified" defaultChecked={s.swiss_shop_verified}/>Schweizer Shop-Angabe ist belegt</label>
      <label className="check-label"><input type="checkbox" name="legal_ready" defaultChecked={s.legal_ready}/>Unternehmensangaben und Rechtstexte sind geprüft und freigegeben</label>
    </fieldset>
    <button type="submit">Einstellungen speichern</button>
  </form></>;
}
