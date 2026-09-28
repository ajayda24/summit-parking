import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AppProvider } from "@/components/AppProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Summit Parking — park it, earn it",
  description: "A marketplace for parking spaces: owners list, drivers book, everyone gets there.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
