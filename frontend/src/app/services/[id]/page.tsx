"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  ExternalLink,
  BarChart2
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { apiFetch, ServiceDetail, HealthCheckItem } from "@/lib/api";

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.id;

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [history, setHistory] = useState<HealthCheckItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [historyHours, setHistoryHours] = useState<number>(24);

  const loadServiceDetails = async () => {
    if (!serviceId) return;
    try {
      const [detailRes, historyRes] = await Promise.all([
        apiFetch<ServiceDetail>(`/services/${serviceId}`),
        apiFetch<HealthCheckItem[]>(`/services/${serviceId}/history?hours=${historyHours}&limit=100`)
      ]);
      setService(detailRes);
      setHistory(historyRes);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load service detail:", err);
      setError(err.message || "Could not load service analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServiceDetails();
    const interval = setInterval(loadServiceDetails, 30000);
    return () => clearInterval(interval);
  }, [serviceId, historyHours]);

  if (loading && !service) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading service performance analytics...</p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="p-8 rounded-xl bg-market-card border border-rose-800/60 max-w-xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error Loading Service</h3>
        <p className="text-xs text-slate-400">{error || "Service not found"}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-market-surface hover:bg-market-card text-white rounded-lg text-xs font-semibold transition-colors border border-market-border"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </Link>
      </div>
    );
  }

  // Format chart data
  const chartData = history.map((item) => ({
    time: new Date(item.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    latency: item.latency_ms || 0,
    status: item.status,
    httpCode: item.http_status_code,
  }));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Operational
          </span>
        );
      case "degraded":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            Degraded Latency
          </span>
        );
      case "down":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            Down
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-700">
            Unconfigured
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Back button & Breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview Dashboard
        </Link>
      </div>

      {/* Service Header Card */}
      <div className="p-6 rounded-xl bg-market-card border border-market-border shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400 font-mono">
                {service.category.replace("_", " ")}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">{service.provider}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{service.name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="px-1.5 py-0.5 rounded bg-market-surface border border-market-borderSubtle text-cyan-400 font-semibold">
                {service.method}
              </span>
              <a
                href={service.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-400 flex items-center gap-1 transition-colors underline underline-offset-2"
              >
                {service.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Current Status</span>
              <div className="mt-1">{getStatusBadge(service.current_status)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 24h / 7d / 30d Uptime Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-market-card border border-market-border">
          <span className="text-xs font-medium text-slate-400 block">Uptime (Last 24 Hours)</span>
          <div className="text-3xl font-bold text-emerald-400 font-mono mt-1">
            {service.uptime_24h}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Rolling 24h health check window</p>
        </div>

        <div className="p-5 rounded-xl bg-market-card border border-market-border">
          <span className="text-xs font-medium text-slate-400 block">Uptime (Last 7 Days)</span>
          <div className="text-3xl font-bold text-emerald-400 font-mono mt-1">
            {service.uptime_7d}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Weekly availability index</p>
        </div>

        <div className="p-5 rounded-xl bg-market-card border border-market-border">
          <span className="text-xs font-medium text-slate-400 block">Uptime (Last 30 Days)</span>
          <div className="text-3xl font-bold text-emerald-400 font-mono mt-1">
            {service.uptime_30d}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Monthly SLA availability</p>
        </div>
      </div>

      {/* Latency Statistics Grid (P95, Avg, Min, Max, Median) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <span className="text-[11px] text-slate-400">Avg Latency</span>
          <div className="text-xl font-bold text-cyan-300 font-mono mt-0.5">
            {service.avg_latency_ms !== null ? `${service.avg_latency_ms} ms` : "—"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <span className="text-[11px] text-slate-400">P95 Latency</span>
          <div className="text-xl font-bold text-cyan-300 font-mono mt-0.5">
            {service.p95_latency_ms !== null ? `${service.p95_latency_ms} ms` : "—"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <span className="text-[11px] text-slate-400">Median Latency</span>
          <div className="text-xl font-bold text-slate-200 font-mono mt-0.5">
            {service.median_latency_ms !== null ? `${service.median_latency_ms} ms` : "—"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <span className="text-[11px] text-slate-400">Min Latency</span>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
            {service.min_latency_ms !== null ? `${service.min_latency_ms} ms` : "—"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-market-card border border-market-border">
          <span className="text-[11px] text-slate-400">Max Latency</span>
          <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
            {service.max_latency_ms !== null ? `${service.max_latency_ms} ms` : "—"}
          </div>
        </div>
      </div>

      {/* Interactive Latency History Chart */}
      <div className="p-6 rounded-xl bg-market-card border border-market-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Response Time History (Real DB Metrics)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live HTTP round-trip latency measured in milliseconds over time.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-market-surface p-1 rounded-lg border border-market-borderSubtle">
            <button
              onClick={() => setHistoryHours(6)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                historyHours === 6 ? "bg-cyan-500 text-white font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              6h
            </button>
            <button
              onClick={() => setHistoryHours(24)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                historyHours === 24 ? "bg-cyan-500 text-white font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setHistoryHours(72)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                historyHours === 72 ? "bg-cyan-500 text-white font-semibold" : "text-slate-400 hover:text-white"
              }`}
            >
              3d
            </button>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2F5E" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#1E2F5E" }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#1E2F5E" }}
                  unit="ms"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-market-darkest border border-market-border p-2.5 rounded-lg text-xs shadow-xl space-y-1 font-mono">
                          <p className="text-slate-400">{data.time}</p>
                          <p className="text-cyan-400 font-bold">Latency: {data.latency} ms</p>
                          <p className="text-slate-300">HTTP Status: {data.httpCode || "N/A"}</p>
                          <p className="text-slate-400 capitalize">Result: {data.status}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#38BDF8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No historical checks recorded for this window yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent Health Check Audit Logs */}
      <div className="p-6 rounded-xl bg-market-card border border-market-border space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Recent Health Check Logs
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-market-surface/60 border-b border-market-border text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Checked At (UTC)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">HTTP Code</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3">Validation</th>
                <th className="py-2.5 px-3">Details / Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-market-borderSubtle">
              {service.recent_checks.map((check) => (
                <tr key={check.id} className="hover:bg-market-surface/30 font-mono">
                  <td className="py-2 px-3 text-slate-300">
                    {new Date(check.checked_at).toISOString().replace("T", " ").substring(0, 19)}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        check.status === "operational"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : check.status === "degraded"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-rose-950 text-rose-400 border border-rose-800"
                      }`}
                    >
                      {check.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {check.http_status_code || "—"}
                  </td>
                  <td className="py-2 px-3 text-cyan-300 font-semibold">
                    {check.latency_ms !== null ? `${check.latency_ms} ms` : "—"}
                  </td>
                  <td className="py-2 px-3">
                    {check.response_valid ? (
                      <span className="text-emerald-400">Valid</span>
                    ) : (
                      <span className="text-rose-400">Invalid</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-400 font-sans truncate max-w-xs">
                    {check.error_message || "All assertions passed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
