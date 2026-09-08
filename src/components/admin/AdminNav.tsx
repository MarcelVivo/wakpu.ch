"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, Mail, Settings, LogOut } from "lucide-react";
import { logout } from "@/app/dashboard/actions";

const links = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Bestellungen", icon: ShoppingBag },
  { href: "/dashboard/products", label: "Produkte", icon: Package },
  { href: "/dashboard/waitlist", label: "Warteliste", icon: Mail },
  { href: "/dashboard/settings", label: "Einstellungen", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return <header className="admin-header">
    <div className="admin-header-top">
      <span className="wordmark admin-wordmark">WAKPU<span>INTERN</span></span>
      <form action={logout}><button type="submit" className="button button-outline admin-logout"><LogOut size={14} aria-hidden="true" />Abmelden</button></form>
    </div>
    <nav className="admin-nav" aria-label="Administration">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}><Icon size={15} aria-hidden="true" />{label}</Link>;
      })}
    </nav>
  </header>;
}

export function AdminNotice({ status }: { status?: string }) {
  return status ? <p role="status" className={`admin-notice ${status === "error" ? "is-error" : ""}`}>{status === "saved" ? "Änderung gespeichert." : "Die Aktion konnte nicht abgeschlossen werden. Bitte prüfe die Eingaben und den Auftragsstatus."}</p> : null;
}
