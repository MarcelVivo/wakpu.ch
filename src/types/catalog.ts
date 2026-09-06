export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  price_chf_cents: number;
  active: boolean;
  stock_mode: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  active: boolean;
  featured: boolean;
  image_url?: string | null;
  variants: ProductVariant[];
}

export interface VerifiedClaim {
  id: string;
  title: string;
  description: string;
  active: boolean;
}

export interface SiteSettings {
  shop_maintenance: boolean;
  support_email: string;
  shipping_text: string;
  shipping_origin: string;
  shipping_cost_cents: number | null;
  company_name: string;
  company_address: string;
  company_postcode_city: string;
  swiss_shop_verified: boolean;
  product_safety_text: string;
  product_reuse_text: string;
  verified_claims: VerifiedClaim[];
}
