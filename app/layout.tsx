import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mnelo | AI Workforce for MEP Estimation & Procurement",
  description:
    "Mnelo turns MEP drawings into BOQs, procurement packages, and project intelligence for estimation teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
