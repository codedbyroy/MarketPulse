import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MarketPulse — Indian Financial Market API Health & Status",
  description: "Real-time API availability, latency metrics, and historical reliability monitoring for NSE, BSE, MCX, Zerodha, Angel One, Upstox, and Indian financial infrastructure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-market-darkest text-slate-100 flex flex-col min-h-screen antialiased selection:bg-cyan-500/20 selection:text-cyan-300`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
