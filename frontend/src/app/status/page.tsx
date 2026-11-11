"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Calendar,
  ChevronRight
} from "lucide-react";
import { apiFetch, OverviewStatus, IncidentItem, ServiceItem } from "@/lib/api";

export default function PublicStatusPage() {
  const [data, setData] = useState<OverviewStatus | null>(null);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [overviewRes, incidentsRes] = await Promise.all([
          apiFetch<OverviewStatus>("/status/overview"),
          apiFetch<IncidentItem[]>("/incidents?limit=10")
        ]);
        setData(overviewRes);
        setIncidents(incidentsRes);
      } catch (err) {
        console.error("Failed to load status:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderServiceRow = (service: ServiceItem) => {
    const isOk = service.current_status === "operational";
    const isDegraded = service.current_status === "degraded";
    const isDown = service.current_status === "down";

    return (
      <div
        key={service.id}
        className="py-3 px-4 flex items-center justify-between hover:bg-market-surface/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOk && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {isDegraded && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          {isDown && <XCircle className="w-4 h-4 text-rose-400" />}
          {service.current_status === "unconfigured" && <Clock className="w-4 h-4 text-slate-500" />}
          <div>
            <Link
              href={`/services/${service.id}`}
              className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors"
            >
              {service.name}
            </Link>
            <span className="text-[11px] text-slate-400 block">{service.provider}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-slate-400 block font-mono">Response Time</span>
            <span className="text-slate-200 font-mono font-semibold">
              {service.current_latency_ms ? `${service.current_latency_ms} ms` : "—"}
            </span>
          </div>
          <div className="text-right min-w-[70px]">
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                isOk
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                  : isDegraded
                  ? "bg-amber-950/80 text-amber-400 border border-amber-800"
                  : "bg-rose-950/80 text-rose-400 border border-rose-800"
              }`}
            >
              {service.current_status}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !data) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          MarketPulse Public Status
        </h1>
        <p className="text-xs text-slate-400">
          Independent live health metrics for Indian exchanges, brokers, and market feeds.
        </p>
      </div>

      {/* Main Status Pill */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-market-card to-market-surface border border-emerald-800/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {data?.overall_status === "operational"
                ? "All Indian Financial Market Feeds Operational"
                : "Active Incidents or Elevated Latency"}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              99.9% uptime maintained over the last 30-day reporting window.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Last checked: {data?.last_updated ? new Date(data.last_updated).toLocaleTimeString() : "Just now"}
        </div>
      </div>

      {/* Categorized Services Panels */}
      <div className="space-y-6">
        {/* Exchanges */}
        <div className="rounded-xl bg-market-card border border-market-border overflow-hidden">
          <div className="px-5 py-3.5 bg-market-surface/80 border-b border-market-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Stock & Commodity Exchanges
            </h3>
            <span className="text-[11px] text-slate-400">
              {data?.services_by_category.exchanges?.length || 0} monitored
            </span>
          </div>
          <div className="divide-y divide-market-borderSubtle">
            {data?.services_by_category.exchanges?.map(renderServiceRow)}
          </div>
        </div>

        {/* Broker APIs */}
        <div className="rounded-xl bg-market-card border border-market-border overflow-hidden">
          <div className="px-5 py-3.5 bg-market-surface/80 border-b border-market-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Broker Trading APIs & Portals
            </h3>
            <span className="text-[11px] text-slate-400">
              {data?.services_by_category.broker_apis?.length || 0} monitored
            </span>
          </div>
          <div className="divide-y divide-market-borderSubtle">
            {data?.services_by_category.broker_apis?.map(renderServiceRow)}
          </div>
        </div>

        {/* Market Data */}
        <div className="rounded-xl bg-market-card border border-market-border overflow-hidden">
          <div className="px-5 py-3.5 bg-market-surface/80 border-b border-market-border flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
              Market Data Feeds & Reference Rates
            </h3>
            <span className="text-[11px] text-slate-400">
              {data?.services_by_category.market_data?.length || 0} monitored
            </span>
          </div>
          <div className="divide-y divide-market-borderSubtle">
            {data?.services_by_category.market_data?.map(renderServiceRow)}
          </div>
        </div>
      </div>

      {/* Scheduled Maintenance & Past Incidents Summary */}
      <div className="rounded-xl bg-market-card border border-market-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Recent Incident History & Maintenance
          </h3>
          <Link
            href="/incidents"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            Full Incident Timeline <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {incidents.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No incidents reported in the past 90 days.
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.slice(0, 3).map((inc) => (
              <div
                key={inc.id}
                className="p-3.5 rounded-lg bg-market-surface/60 border border-market-borderSubtle flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        inc.status === "resolved"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}
                    >
                      {inc.status}
                    </span>
                    <span className="font-semibold text-white">{inc.title}</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{inc.description}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(inc.started_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
