"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Layers, LayoutDashboard, Menu, Package, Settings, Shield, ShoppingBag, Tag, UserRound, Users } from "lucide-react";
import type { ReactNode } from "react";

const sections = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Categories", href: "/admin/categories", icon: Tag },
  { title: "Collections", href: "/admin/collections", icon: Layers },
  { title: "New Drops", href: "/admin/drops", icon: Package },
  { title: "Products", href: "/admin/products", icon: Package },
  { title: "Inventory", href: "/admin/inventory", icon: ShoppingBag },
  { title: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { title: "Customers", href: "/admin/customers", icon: Users },
  { title: "Payments", href: "/admin/payments", icon: CreditCard },
  { title: "Coupons", href: "/admin/coupons", icon: Tag },
  { title: "Website Settings", href: "/admin/settings", icon: Settings },
  { title: "Admins", href: "/admin/admins", icon: Shield },
  { title: "Users", href: "/admin/users", icon: Users },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="admin-sidebar-brand" href="/admin">GP <span>Admin</span></Link><nav aria-label="Administration">{sections.map((section) => <Link href={section.href} key={section.href} aria-current={pathname === section.href ? "page" : undefined}><section.icon size={16} />{section.title}</Link>)}</nav></aside><div className="admin-main"><header className="admin-topbar"><details className="admin-mobile-nav"><summary aria-label="Administration menu"><Menu size={20} /></summary><nav aria-label="Mobile administration">{sections.map((section) => <Link key={section.href} href={section.href} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}>{section.title}</Link>)}</nav></details><span>Garieva Prince / Operations</span><Link className="icon-button" href="/account" aria-label="Your account"><UserRound size={20} /></Link></header>{children}</div></div>;
}
