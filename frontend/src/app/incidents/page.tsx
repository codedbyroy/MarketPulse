"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  MessageSquare
} from "lucide-react";
import { apiFetch, IncidentItem } from "@/lib/api";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadIncidents = async () => {
      try {
        const query = filter === "all" ? "" : `?status=${filter}`;
        const data = await apiFetch<IncidentItem[]>(`/incidents${query}`);
        setIncidents(data);
      } catch (err) {
        console.error("Failed to load incidents:", err);
      } finally {
        setLoading(false);
      }
    };
    loadIncidents();
  }, [filter]);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-950 border border-rose-800">
            Critical
          </span>
        );
      case "major":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-950 border border-amber-800">
            Major
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
            Minor
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
        <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> Investigating
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Overview
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Market Incident History & Reliability Timeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Transparent records of all detected outages, service degradations, and maintenance events.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-market-card p-1 rounded-lg border border-market-border">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === "all" ? "bg-cyan-500 text-white font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === "active" ? "bg-cyan-500 text-white font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("resolved")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === "resolved" ? "bg-cyan-500 text-white font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Incidents Stream */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Loading incidents timeline...
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-market-card border border-market-border space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No Incidents Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are no reported service disruptions or incidents matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="p-6 rounded-xl bg-market-card border border-market-border shadow-md space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-market-borderSubtle">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(inc.severity)}
                    <h2 className="text-base font-bold text-white">{inc.title}</h2>
                  </div>
                  {inc.service_name && (
                    <span className="text-xs text-cyan-400 font-mono">
                      Affected: {inc.service_name}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(inc.status)}
                  <span className="text-xs text-slate-500 font-mono">
                    {new Date(inc.started_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">{inc.description}</p>

              {/* Timeline of Updates */}
              {inc.updates && inc.updates.length > 0 && (
                <div className="pt-3 space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-mono">
                    <MessageSquare className="w-3.5 h-3.5" /> Updates & Resolution Timeline
                  </h4>
                  <div className="relative border-l-2 border-market-border pl-4 space-y-4 ml-1">
                    {inc.updates.map((upd) => (
                      <div key={upd.id} className="relative text-xs space-y-1">
                        <span className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-cyan-400 ring-4 ring-market-card"></span>
                        <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                          <span>Update</span>
                          <span>{new Date(upd.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-200">{upd.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
