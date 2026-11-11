"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  Server,
  Zap,
  TrendingUp,
  ShieldAlert,
  Search
} from "lucide-react";
import { apiFetch, OverviewStatus, ServiceItem } from "@/lib/api";

export default function OverviewDashboard() {
  const [data, setData] = useState<OverviewStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());

  const loadData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await apiFetch<OverviewStatus>("/status/overview");
      setData(res);
      setError(null);
      setLastFetchTime(new Date());
    } catch (err: any) {
      console.error("Failed to load overview data:", err);
      setError(err.message || "Failed to connect to MarketPulse monitoring backend.");
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Filter services
  const allServices: ServiceItem[] = data
    ? [
        ...(data.services_by_category.exchanges || []),
        ...(data.services_by_category.broker_apis || []),
        ...(data.services_by_category.market_data || []),
      ]
    : [];

  const filteredServices = allServices.filter((svc) => {
    const matchesCategory =
      activeCategory === "all" || svc.category === activeCategory;
    const matchesSearch =
      svc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      svc.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Operational
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/80 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            Degraded Latency
          </span>
        );
      case "down":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            Service Down
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-700">
            Unconfigured
          </span>
        );
    }
  };

  const getOverallStatusBanner = () => {
    if (!data) return null;
    if (data.overall_status === "operational") {
      return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-950/40 via-market-card to-market-surface border border-emerald-800/50 p-6 shadow-lg shadow-emerald-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  All Systems Fully Operational
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  NSE, BSE, MCX, broker gateways, and financial data feeds are responding normally.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="hidden sm:inline">Last check:</span>
              <span className="text-slate-300">
                {lastFetchTime.toLocaleTimeString()}
              </span>
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="p-1.5 rounded-md hover:bg-market-surface text-slate-400 hover:text-white transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      );
    } else if (data.overall_status === "degraded") {
      return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-950/40 via-market-card to-market-surface border border-amber-800/50 p-6 shadow-lg shadow-amber-950/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-300 tracking-tight">
                Partial Degradation Detected
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Elevated latency or endpoint degradation detected on one or more services.
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-rose-950/40 via-market-card to-market-surface border border-rose-800/50 p-6 shadow-lg shadow-rose-950/20">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-300 tracking-tight">
                Major Service Outage Detected
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Multiple monitored financial endpoints are unreachable or returning errors.
              </p>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-4">
        <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Connecting to MarketPulse Monitoring Engine...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 rounded-xl bg-market-card border border-rose-800/60 max-w-xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Monitoring Backend Unreachable</h3>
        <p className="text-xs text-slate-400">{error}</p>
        <button
          onClick={() => loadData(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Overall System Status Banner */}
      {getOverallStatusBanner()}

      {/* 2. Active Incidents Alert (if any) */}
      {data?.active_incidents && data.active_incidents.length > 0 && (
        <div className="space-y-3">
          {data.active_incidents.map((inc) => (
            <div
              key={inc.id}
              className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-900/60 border border-rose-700/60">
                      {inc.severity} incident
                    </span>
                    <h4 className="text-sm font-semibold text-white">{inc.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{inc.description}</p>
                  {inc.updates.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      Latest update: {inc.updates[inc.updates.length - 1].message}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href="/incidents"
                className="text-xs text-rose-300 hover:text-white underline underline-offset-4 shrink-0"
              >
                View Incident Details →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* 3. Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Monitored</span>
            <Server className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {data?.total_monitored || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Endpoints active</div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium">Operational</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {data?.operational_count || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Healthy feeds</div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-medium">Degraded</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {data?.degraded_count || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">High latency / warnings</div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-xs font-medium">Down</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {data?.down_count || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Outages detected</div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <div className="flex items-center justify-between text-cyan-400 mb-1">
            <span className="text-xs font-medium">Avg Latency</span>
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold text-cyan-300 font-mono">
            {data?.avg_response_time_ms ? `${data.avg_response_time_ms}ms` : "—"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Response speed</div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-xs font-medium">24h Uptime</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {data?.overall_uptime_pct ? `${data.overall_uptime_pct}%` : "100%"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Reliability rating</div>
        </div>
      </div>

      {/* 4. Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-market-border pb-4">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === "all"
                ? "bg-cyan-500 text-white font-semibold shadow-sm shadow-cyan-500/20"
                : "bg-market-card text-slate-400 hover:text-white border border-market-borderSubtle"
            }`}
          >
            All Services ({allServices.length})
          </button>
          <button
            onClick={() => setActiveCategory("exchanges")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === "exchanges"
                ? "bg-cyan-500 text-white font-semibold shadow-sm shadow-cyan-500/20"
                : "bg-market-card text-slate-400 hover:text-white border border-market-borderSubtle"
            }`}
          >
            Exchanges ({data?.services_by_category.exchanges?.length || 0})
          </button>
          <button
            onClick={() => setActiveCategory("broker_apis")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === "broker_apis"
                ? "bg-cyan-500 text-white font-semibold shadow-sm shadow-cyan-500/20"
                : "bg-market-card text-slate-400 hover:text-white border border-market-borderSubtle"
            }`}
          >
            Broker APIs ({data?.services_by_category.broker_apis?.length || 0})
          </button>
          <button
            onClick={() => setActiveCategory("market_data")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === "market_data"
                ? "bg-cyan-500 text-white font-semibold shadow-sm shadow-cyan-500/20"
                : "bg-market-card text-slate-400 hover:text-white border border-market-borderSubtle"
            }`}
          >
            Market Data ({data?.services_by_category.market_data?.length || 0})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search NSE, Zerodha, BSE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-market-surface border border-market-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* 5. Monitored Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((svc) => (
          <div
            key={svc.id}
            className="p-5 rounded-xl bg-market-card hover:bg-market-cardHover border border-market-border hover:border-market-accent/40 transition-all shadow-sm flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400 font-mono">
                    {svc.category.replace("_", " ")}
                  </span>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors mt-0.5">
                    {svc.name}
                  </h3>
                  <span className="text-xs text-slate-400">{svc.provider}</span>
                </div>
                {getStatusBadge(svc.current_status)}
              </div>

              {/* Endpoint URL Pill */}
              <div className="px-2.5 py-1.5 rounded-md bg-market-surface/60 border border-market-borderSubtle text-[11px] text-slate-400 font-mono truncate mb-4">
                <span className="text-cyan-400 font-semibold mr-1.5">{svc.method}</span>
                {svc.url}
              </div>
            </div>

            {/* Metrics Footer */}
            <div className="pt-3 border-t border-market-borderSubtle/60 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Response Time</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {svc.current_latency_ms !== null ? `${svc.current_latency_ms} ms` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">24h Uptime</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {svc.uptime_24h}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  {svc.last_checked_at
                    ? `Checked ${new Date(svc.last_checked_at).toLocaleTimeString()}`
                    : "Pending first run"}
                </span>
                <Link
                  href={`/services/${svc.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-cyan-400 hover:text-cyan-300 group-hover:translate-x-0.5 transition-all"
                >
                  View Details
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12 rounded-xl bg-market-card border border-market-border">
          <p className="text-sm text-slate-400">No services match the active filter or query.</p>
        </div>
      )}
    </div>
  );
}
