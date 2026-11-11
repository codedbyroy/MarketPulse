"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  LogOut,
  Plus,
  Play,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Server,
  FileText,
  Activity,
  X
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface AdminEndpoint {
  id: number;
  name: string;
  provider: string;
  category: string;
  url: string;
  method: string;
  timeout_seconds: number;
  check_interval_seconds: number;
  expected_status_codes: number[];
  validation_config: any;
  authentication_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AdminLog {
  id: number;
  service_id: number;
  service_name: string;
  status: string;
  http_status_code: number | null;
  latency_ms: number | null;
  error_message: string | null;
  response_valid: boolean;
  checked_at: string;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"endpoints" | "incidents" | "logs">("endpoints");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("admin@marketpulse.in");
  const [loginPassword, setLoginPassword] = useState("MarketPulse@2026Admin");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Endpoints state
  const [endpoints, setEndpoints] = useState<AdminEndpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState<number | null>(null);
  const [triggerToast, setTriggerToast] = useState<string | null>(null);

  // New endpoint form
  const [newEndpoint, setNewEndpoint] = useState({
    name: "",
    provider: "",
    category: "exchanges",
    url: "",
    method: "GET",
    timeout_seconds: 10,
    check_interval_seconds: 300,
    expected_status_codes: "200, 301, 302",
    contains_text: "",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Incidents state
  const [incidents, setIncidents] = useState<any[]>([]);
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    service_id: "",
    title: "",
    description: "",
    severity: "minor",
    status: "investigating",
  });
  const [updateMessage, setUpdateMessage] = useState("");
  const [selectedIncidentForUpdate, setSelectedIncidentForUpdate] = useState<number | null>(null);

  // Logs state
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("mp_admin_token");
    if (savedToken) {
      setToken(savedToken);
      verifyAdmin(savedToken);
    }
  }, []);

  const verifyAdmin = async (tok: string) => {
    try {
      const res = await apiFetch<any>("/admin/me", {
        headers: { Authorization: `Bearer ${tok}` },
      });
      setAdminEmail(res.email);
      loadEndpoints(tok);
      loadIncidents();
    } catch {
      handleLogout();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await apiFetch<{ access_token: string }>("/admin/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      localStorage.setItem("mp_admin_token", res.access_token);
      setToken(res.access_token);
      setAdminEmail(loginEmail);
      loadEndpoints(res.access_token);
      loadIncidents();
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("mp_admin_token");
    setToken(null);
    setAdminEmail("");
  };

  const loadEndpoints = async (tok = token) => {
    if (!tok) return;
    setLoadingEndpoints(true);
    try {
      const data = await apiFetch<AdminEndpoint[]>("/admin/endpoints", {
        headers: { Authorization: `Bearer ${tok}` },
      });
      setEndpoints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEndpoints(false);
    }
  };

  const loadIncidents = async () => {
    try {
      const data = await apiFetch<any[]>("/incidents");
      setIncidents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadLogs = async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const data = await apiFetch<AdminLog[]>("/admin/logs?limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Parse status codes
    const codes = newEndpoint.expected_status_codes
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));

    const valConfig = newEndpoint.contains_text
      ? { contains_text: newEndpoint.contains_text }
      : {};

    try {
      await apiFetch("/admin/endpoints", {
        method: "POST",
        body: JSON.stringify({
          name: newEndpoint.name,
          provider: newEndpoint.provider,
          category: newEndpoint.category,
          url: newEndpoint.url,
          method: newEndpoint.method,
          timeout_seconds: Number(newEndpoint.timeout_seconds),
          check_interval_seconds: Number(newEndpoint.check_interval_seconds),
          expected_status_codes: codes.length > 0 ? codes : [200],
          validation_config: valConfig,
          authentication_config: {},
          is_active: true,
        }),
      });
      setShowAddModal(false);
      setNewEndpoint({
        name: "",
        provider: "",
        category: "exchanges",
        url: "",
        method: "GET",
        timeout_seconds: 10,
        check_interval_seconds: 300,
        expected_status_codes: "200, 301, 302",
        contains_text: "",
      });
      loadEndpoints();
      setTriggerToast("Endpoint created and initial health check triggered!");
      setTimeout(() => setTriggerToast(null), 4000);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create endpoint.");
    }
  };

  const handleTriggerCheck = async (serviceId: number, serviceName: string) => {
    setTriggerLoading(serviceId);
    try {
      const res = await apiFetch<any>(`/admin/endpoints/${serviceId}/trigger`, {
        method: "POST",
      });
      setTriggerToast(
        `Immediate check on '${serviceName}': Status ${res.status.toUpperCase()} (${res.http_status_code || "ERR"}) in ${res.latency_ms || 0}ms`
      );
      loadEndpoints();
    } catch (err: any) {
      setTriggerToast(`Check failed: ${err.message}`);
    } finally {
      setTriggerLoading(null);
      setTimeout(() => setTriggerToast(null), 5000);
    }
  };

  const handleDeleteEndpoint = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete monitoring endpoint '${name}'?`)) return;
    try {
      await apiFetch(`/admin/endpoints/${id}`, { method: "DELETE" });
      loadEndpoints();
      setTriggerToast(`Endpoint '${name}' deleted.`);
      setTimeout(() => setTriggerToast(null), 3000);
    } catch (err: any) {
      alert(err.message || "Delete failed");
    }
  };

  const handleToggleActive = async (endpoint: AdminEndpoint) => {
    try {
      await apiFetch(`/admin/endpoints/${endpoint.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !endpoint.is_active }),
      });
      loadEndpoints();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch("/admin/incidents", {
        method: "POST",
        body: JSON.stringify({
          service_id: newIncident.service_id ? parseInt(newIncident.service_id) : null,
          title: newIncident.title,
          description: newIncident.description,
          severity: newIncident.severity,
          status: newIncident.status,
        }),
      });
      setShowNewIncidentModal(false);
      setNewIncident({
        service_id: "",
        title: "",
        description: "",
        severity: "minor",
        status: "investigating",
      });
      loadIncidents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddIncidentUpdate = async (incidentId: number) => {
    if (!updateMessage) return;
    try {
      await apiFetch(`/admin/incidents/${incidentId}/updates`, {
        method: "POST",
        body: JSON.stringify({ message: updateMessage }),
      });
      setUpdateMessage("");
      setSelectedIncidentForUpdate(null);
      loadIncidents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveIncident = async (incidentId: number) => {
    try {
      await apiFetch(`/admin/incidents/${incidentId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      });
      loadIncidents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // If unauthenticated -> Render Login Screen
  if (!token) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-market-card border border-market-border shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">MarketPulse Admin Login</h1>
          <p className="text-xs text-slate-400">
            Authenticate to manage monitoring endpoints, configure alert rules, and declare incidents.
          </p>
        </div>

        {loginError && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Admin Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors flex items-center justify-center gap-2"
          >
            {loginLoading ? <Activity className="w-4 h-4 animate-spin" /> : "Sign In to Admin Console"}
          </button>
        </form>

        <div className="p-3 rounded-lg bg-market-surface/60 border border-market-borderSubtle text-[11px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300">Default Seed Credentials:</p>
          <p>Email: <code className="text-cyan-400">admin@marketpulse.in</code></p>
          <p>Password: <code className="text-cyan-400">MarketPulse@2026Admin</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Admin Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-market-card border border-market-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">MarketPulse Administration</h1>
            <p className="text-[11px] text-slate-400">
              Logged in as <span className="text-cyan-300 font-mono">{adminEmail}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-market-surface hover:bg-market-surface/80 border border-market-border text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {triggerToast && (
        <div className="p-3 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-200 text-xs font-mono shadow-xl flex items-center justify-between animate-fade-in">
          <span>{triggerToast}</span>
          <button onClick={() => setTriggerToast(null)} className="text-cyan-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-market-border pb-3">
        <button
          onClick={() => setActiveTab("endpoints")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "endpoints"
              ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/20"
              : "text-slate-400 hover:text-white hover:bg-market-card"
          }`}
        >
          <Server className="w-4 h-4" />
          Monitored Endpoints ({endpoints.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("incidents");
            loadIncidents();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "incidents"
              ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/20"
              : "text-slate-400 hover:text-white hover:bg-market-card"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Incident Management ({incidents.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("logs");
            loadLogs();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "logs"
              ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/20"
              : "text-slate-400 hover:text-white hover:bg-market-card"
          }`}
        >
          <FileText className="w-4 h-4" />
          Real-Time Audit Logs
        </button>
      </div>

      {/* TAB 1: ENDPOINT MANAGEMENT */}
      {activeTab === "endpoints" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Configured Financial Endpoints</h2>
              <p className="text-xs text-slate-400">
                Manage target exchange portals, broker APIs, intervals, and timeouts.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Endpoint
            </button>
          </div>

          <div className="rounded-xl bg-market-card border border-market-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-market-surface/60 border-b border-market-border text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Target URL</th>
                    <th className="py-3 px-4">Interval</th>
                    <th className="py-3 px-4">Timeout</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-market-borderSubtle">
                  {endpoints.map((ep) => (
                    <tr key={ep.id} className="hover:bg-market-surface/30">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{ep.name}</span>
                        <span className="text-[11px] text-slate-400">{ep.provider}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400 uppercase text-[10px]">
                        {ep.category.replace("_", " ")}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-xs truncate">
                        <span className="text-cyan-400 font-semibold mr-1">{ep.method}</span>
                        {ep.url}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {ep.check_interval_seconds}s
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {ep.timeout_seconds}s
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActive(ep)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            ep.is_active
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-slate-900 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {ep.is_active ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleTriggerCheck(ep.id, ep.name)}
                          disabled={triggerLoading === ep.id}
                          className="p-1.5 rounded bg-market-surface hover:bg-cyan-950 text-cyan-400 border border-market-borderSubtle transition-colors"
                          title="Trigger Immediate Live Check"
                        >
                          <Play className={`w-3.5 h-3.5 ${triggerLoading === ep.id ? "animate-spin" : ""}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteEndpoint(ep.id, ep.name)}
                          className="p-1.5 rounded bg-market-surface hover:bg-rose-950 text-rose-400 border border-market-borderSubtle transition-colors"
                          title="Delete Endpoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCIDENT MANAGEMENT */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Incident Registry & Status Updates</h2>
              <p className="text-xs text-slate-400">
                Post official operational updates, declare maintenance, or resolve outages.
              </p>
            </div>
            <button
              onClick={() => setShowNewIncidentModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Declare Incident
            </button>
          </div>

          <div className="space-y-4">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-xl bg-market-card border border-market-border space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-market-borderSubtle">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono">
                      {inc.severity}
                    </span>
                    <h3 className="text-sm font-bold text-white">{inc.title}</h3>
                  </div>
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
                    {inc.status !== "resolved" && (
                      <button
                        onClick={() => handleResolveIncident(inc.id)}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300">{inc.description}</p>

                {/* Updates */}
                {inc.updates && inc.updates.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase font-mono">
                      Past Updates:
                    </span>
                    {inc.updates.map((u: any) => (
                      <div key={u.id} className="text-xs text-slate-300 bg-market-surface/40 p-2 rounded">
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {new Date(u.created_at).toLocaleString()}
                        </span>
                        {u.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Update Box */}
                {selectedIncidentForUpdate === inc.id ? (
                  <div className="pt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Add investigation update note..."
                      value={updateMessage}
                      onChange={(e) => setUpdateMessage(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-market-surface border border-market-border text-xs text-white"
                    />
                    <button
                      onClick={() => handleAddIncidentUpdate(inc.id)}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                    >
                      Post Note
                    </button>
                    <button
                      onClick={() => setSelectedIncidentForUpdate(null)}
                      className="px-3 py-1.5 bg-market-surface text-slate-400 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedIncidentForUpdate(inc.id)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    + Post Status Update Note
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Real-Time Worker Health Check Stream</h2>
              <p className="text-xs text-slate-400">
                Audited logs recorded by the background monitoring engine into PostgreSQL.
              </p>
            </div>
            <button
              onClick={loadLogs}
              disabled={loadingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-market-card hover:bg-market-surface text-slate-300 rounded-lg text-xs font-semibold border border-market-border"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
              Refresh Logs
            </button>
          </div>

          <div className="rounded-xl bg-market-card border border-market-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-market-surface/60 border-b border-market-border text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Checked At</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">HTTP Code</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Details / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-market-borderSubtle font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-market-surface/30">
                      <td className="py-2 px-3 text-slate-400">
                        {new Date(log.checked_at).toISOString().replace("T", " ").substring(0, 19)}
                      </td>
                      <td className="py-2 px-3 text-white font-sans font-semibold">
                        {log.service_name}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            log.status === "operational"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : log.status === "degraded"
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-rose-950 text-rose-400 border border-rose-800"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {log.http_status_code || "—"}
                      </td>
                      <td className="py-2 px-3 text-cyan-300">
                        {log.latency_ms !== null ? `${log.latency_ms} ms` : "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-sans truncate max-w-sm">
                        {log.error_message || "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Endpoint */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-market-card border border-market-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-market-borderSubtle">
              <h3 className="text-base font-bold text-white">Add Monitoring Endpoint</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-950 border border-rose-800 text-rose-200 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateEndpoint} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NSE Index Feeder"
                  value={newEndpoint.name}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Provider</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NSE India"
                    value={newEndpoint.provider}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newEndpoint.category}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="exchanges">Exchanges</option>
                    <option value="broker_apis">Broker APIs</option>
                    <option value="market_data">Market Data</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target URL (SSRF Protected)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.example.com/v1/health"
                  value={newEndpoint.url}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Method</label>
                  <select
                    value={newEndpoint.method}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, method: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Timeout (s)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={newEndpoint.timeout_seconds}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, timeout_seconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Interval (s)</label>
                  <input
                    type="number"
                    min="30"
                    max="86400"
                    value={newEndpoint.check_interval_seconds}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, check_interval_seconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Expected HTTP Codes (comma separated)
                </label>
                <input
                  type="text"
                  value={newEndpoint.expected_status_codes}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, expected_status_codes: e.target.value })}
                  placeholder="200, 301, 302"
                  className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Response Validation (Optional Text Search)
                </label>
                <input
                  type="text"
                  value={newEndpoint.contains_text}
                  onChange={(e) => setNewEndpoint({ ...newEndpoint, contains_text: e.target.value })}
                  placeholder="e.g. OK or { status: success }"
                  className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-market-surface hover:bg-market-surface/80 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold shadow-md shadow-cyan-600/20"
                >
                  Save & Start Monitoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Declare Incident */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-market-card border border-market-border w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-market-borderSubtle">
              <h3 className="text-base font-bold text-white">Declare Public Incident</h3>
              <button onClick={() => setShowNewIncidentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Affected Service</label>
                <select
                  value={newIncident.service_id}
                  onChange={(e) => setNewIncident({ ...newIncident, service_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">System-Wide / General</option>
                  {endpoints.map((ep) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name} ({ep.provider})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Broker Order Placement Gateway Elevated Latency"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Severity</label>
                  <select
                    value={newIncident.severity}
                    onChange={(e) => setNewIncident({ ...newIncident, severity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Initial Status</label>
                  <select
                    value={newIncident.status}
                    onChange={(e) => setNewIncident({ ...newIncident, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="investigating">Investigating</option>
                    <option value="identified">Identified</option>
                    <option value="monitoring">Monitoring</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Initial Description & Impact</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe observed errors, affected market participants, and technical triage status..."
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-market-surface border border-market-border text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewIncidentModal(false)}
                  className="px-4 py-2 bg-market-surface hover:bg-market-surface/80 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-md shadow-rose-600/20"
                >
                  Publish Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
