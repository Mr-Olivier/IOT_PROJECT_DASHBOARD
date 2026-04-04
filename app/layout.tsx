import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";

export const metadata: Metadata = {
  title: "AquaSense — Smart Irrigation & Soil Monitoring",
  description: "Real-time irrigation monitoring and control dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <Nav />
        {children}
      </body>
    </html>
  );
}
// layout update
