import Link from "next/link";
import { Activity } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-market-border bg-market-darkest mt-16 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-sm">MarketPulse India</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Real-time API availability, response latency, and reliability monitoring for Indian stock exchanges, broker trading gateways, and market data infrastructure.
            </p>
            <div className="p-3 rounded-lg bg-market-surface/40 border border-market-borderSubtle text-[11px] text-slate-400 leading-normal">
              <span className="font-semibold text-slate-300">Technical Note:</span> A web portal being accessible does not guarantee order execution or market data socket health. MarketPulse strictly segregates web endpoint health, API gateways, and exchange operational announcements.
            </div>
          </div>

          {/* Infrastructure Coverage */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Monitored Categories
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="text-slate-400 hover:text-white transition-colors">Exchanges (NSE, BSE, MCX)</li>
              <li className="text-slate-400 hover:text-white transition-colors">Broker Gateways (Kite, Angel One, Upstox, Groww)</li>
              <li className="text-slate-400 hover:text-white transition-colors">Market Data (Yahoo Finance, RBI Rates)</li>
              <li className="text-slate-400 hover:text-white transition-colors">Clearing & Settlement Gateways</li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white text-xs uppercase tracking-wider mb-3">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-cyan-400 transition-colors">
                  Overview Dashboard
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-cyan-400 transition-colors">
                  Public Status Page
                </Link>
              </li>
              <li>
                <Link href="/incidents" className="hover:text-cyan-400 transition-colors">
                  Incident History
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-cyan-400 transition-colors">
                  Administrator Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-market-borderSubtle pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {new Date().getFullYear()} MarketPulse. All rights reserved. Indian Financial Markets Monitoring.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              All Monitoring Workers Active
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
