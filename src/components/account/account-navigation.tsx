import Link from "next/link";

type AccountSection = "overview" | "wardrobe" | "orders" | "transfers" | "resale" | "profile";

const sections: { id: AccountSection; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: "/account" },
  { id: "wardrobe", label: "Wardrobe", href: "/account/wardrobe" },
  { id: "orders", label: "Orders", href: "/account/orders" },
  { id: "transfers", label: "Transfers", href: "/account/transfers" },
  { id: "resale", label: "Resale", href: "/account/resale" },
  { id: "profile", label: "Profile", href: "/account/profile" },
];

export function AccountNavigation({ active }: { active: AccountSection }) {
  return (
    <nav className="account-tabs" aria-label="Account sections">
      {sections.map((section) => (
        <Link
          href={section.href}
          key={section.id}
          aria-current={section.id === active ? "page" : undefined}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
