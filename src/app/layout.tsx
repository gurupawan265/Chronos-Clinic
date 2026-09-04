import type { Metadata } from "next";
import "./globals.css";
import TRPCProvider from "./_trpc/Provider";

export const metadata: Metadata = {
  title: "Chronos Clinic — Multi-Provider Appointment Scheduling",
  description:
    "Integrated clinical scheduling system for front-desk coordination, provider agenda tracking, and proactive alert monitoring.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-glow-container">
          <div className="bg-glow-blob-1" />
          <div className="bg-glow-blob-2" />
        </div>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
