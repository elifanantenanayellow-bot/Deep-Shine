import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deep-Shine — Booking platform for clinics",
  description:
    "Multi-tenant SaaS for appointment booking. Built for dentists, doctors and clinics — expandable to any service business.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
