"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navItems = [
  { label: "Platform", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/projects" },
  { label: "Learning", href: "/learning" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={clsx("items-center gap-2 text-sm font-medium text-ink/60", className)}>
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            className={clsx(
              "rounded-lg px-3 py-2 transition hover:bg-mist hover:text-ink",
              active && "bg-leaf-50 text-leaf-800 ring-1 ring-leaf-200",
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
