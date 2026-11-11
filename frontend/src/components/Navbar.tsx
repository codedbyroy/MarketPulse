"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Activity, ShieldCheck, Clock } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [istTime, setIstTime] = useState<string>("");
  const [marketStatus, setMarketStatus] = useState<{ open: boolean; label: string }>({
    open: false,
    label: "Market Closed",
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format to IST
      const istString = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      setIstTime(istString);

      // Indian market hours: Monday-Friday 09:15 to 15:30 IST
      const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const day = istDate.getDay(); // 0 is Sunday, 6 is Saturday
      const hour = istDate.getHours();
      const minute = istDate.getMinutes();
      const timeInMins = hour * 60 + minute;

      if (day >= 1 && day <= 5) {
        if (timeInMins >= 555 && timeInMins <= 930) {
          setMarketStatus({ open: true, label: "NSE/BSE Regular Session" });
        } else if (timeInMins >= 540 && timeInMins < 555) {
          setMarketStatus({ open: true, label: "Pre-Open Session" });
        } else if (timeInMins > 930 && timeInMins <= 1410) {
          setMarketStatus({ open: true, label: "MCX Evening Session" });
        } else {
          setMarketStatus({ open: false, label: "Market Closed" });
        }
      } else {
        setMarketStatus({ open: false, label: "Weekend (Market Closed)" });
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { label: "Overview", href: "/" },
    { label: "Public Status", href: "/status" },
    { label: "Incidents", href: "/incidents" },
    { label: "Admin Portal", href: "/admin" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-market-border bg-market-darkest/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-market-accent/20 to-blue-600/30 border border-market-accent/40 flex items-center justify-center text-market-accent group-hover:border-market-accent transition-colors shadow-sm shadow-cyan-500/10">
                <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                    MarketPulse
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                    IN
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 tracking-wide font-medium">
                  Indian Market API Health
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? "bg-market-card text-white border border-market-border shadow-sm"
                      : "text-slate-400 hover:text-slate-100 hover:bg-market-surface/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* IST Market Session Clock */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-market-surface/80 border border-market-borderSubtle text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-slate-300">{istTime || "--:--:-- IST"}</span>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    marketStatus.open ? "bg-emerald-400 animate-ping" : "bg-slate-500"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    marketStatus.open ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {marketStatus.label}
                </span>
              </div>
            </div>

            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-600/30 hover:border-cyan-400 text-xs font-semibold transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
