"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const navItems = [
  { label: "Platform", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/projects" },
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
    <nav className={clsx("items-center gap-2 text-sm font-medium text-[#64748b]", className)}>
      {navItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            className={clsx(
              "rounded-xl px-3 py-2 transition hover:bg-[#f8faf8] hover:text-[#0f172a]",
              active && "bg-[#ecfdf3] text-[#087a36] ring-1 ring-[#bbf7d0]",
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
