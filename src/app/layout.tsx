import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deep-Shine — Appointment booking for clinics & doctors",
  description:
    "Interactive demo of a modern appointment-booking SaaS for clinics and doctors in Madagascar — patient, doctor and clinic-admin portals.",
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
