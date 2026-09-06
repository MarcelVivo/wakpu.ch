import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') ? [{protocol:'https',hostname:new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,pathname:'/storage/v1/object/public/**'}] : []},
  async headers() {
    return [{source: '/:path*', headers: [
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'no-referrer'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
      {key:'Content-Security-Policy',value:`default-src 'self'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV==='development'?"'unsafe-eval'":''}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self'; connect-src 'self' https://*.supabase.co; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`},
    ]}, {source:'/bestellung/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}, {source:'/admin/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}];
  },
};
export default nextConfig;
