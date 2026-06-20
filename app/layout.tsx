import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mnelo | Estimation & Procurement Workspace",
  description:
    "Mnelo helps teams turn BOQs, tenders, and project documents into estimates, procurement packages, and supplier decisions.",
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
