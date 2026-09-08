import type { Metadata } from 'next';
import './admin.css';
export const metadata:Metadata={title:'Administration | WAKPU',robots:{index:false,follow:false}};
export default function AdminLayout({children}:{children:React.ReactNode}){return <main id="main-content" className="admin-shell">{children}</main>;}
