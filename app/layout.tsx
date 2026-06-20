import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mnelo | AI Workspace for Estimation & Procurement",
  description:
    "Mnelo turns BOQs, tenders, and project documents into estimates, procurement packages, and supplier intelligence.",
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
