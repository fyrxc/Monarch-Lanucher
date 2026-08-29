import type { Metadata } from "next";
import "./globals.css";
import "./server-pagination.css";
import "./no-flash.css";

export const metadata: Metadata = {
  title: "Monarch Launcher",
  description: "Monarch DayZ launcher"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
