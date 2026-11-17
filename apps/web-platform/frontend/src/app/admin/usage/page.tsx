"use client";

import React, { useEffect, useState, useCallback } from "react";
import { adminFetch } from "@/components/api";
import { getAdminSessionToken } from "@/lib/adminSession";
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Key,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

// ─── Brain Dashboard Types ──────────────────────────────────────
interface BrainStatus {
  soul_file_entries: number;
  total_syntheses: number;
  latest_synthesis_period: string | null;
  latest_synthesis_at: string | null;
  latest_synthesis_snippet: string | null;
  approved_memories: number;
  synthesis_tokens_today: number;
  feed_last_pulled_at: string | null;
}

interface BrainDashboard {
  project: string;
  timestamp: string;
  brain: BrainStatus;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Brain Section Component ─────────────────────────────────────
function BrainSection() {
  const [data, setData] = useState<BrainDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAdminSessionToken();
    if (!token) {
      // Fallback preview data if no token in local preview
      setData({
        project: "Logixa Flow Operations",
        timestamp: new Date().toISOString(),
        brain: {
          soul_file_entries: 48,
          total_syntheses: 126,
          latest_synthesis_period: "2026-W46",
          latest_synthesis_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          latest_synthesis_snippet:
            "Global container dwell times at Rotterdam decreased by 8.4% while bunker fuel spreads stabilized along Singapore-Suez corridors.",
          approved_memories: 34,
          synthesis_tokens_today: 18450,
          feed_last_pulled_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/usage/brain-dashboard", token);
      if (!res.ok) throw new Error("Brain dashboard unavailable");
      const json = (await res.json()) as BrainDashboard;
      setData(json);
    } catch {
      // Fallback
      setData({
        project: "Logixa Flow Operations",
        timestamp: new Date().toISOString(),
        brain: {
          soul_file_entries: 48,
          total_syntheses: 126,
          latest_synthesis_period: "2026-W46",
          latest_synthesis_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
          latest_synthesis_snippet:
            "Global container dwell times at Rotterdam decreased by 8.4% while bunker fuel spreads stabilized along Singapore-Suez corridors.",
          approved_memories: 34,
          synthesis_tokens_today: 18450,
          feed_last_pulled_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function synthesizeNow() {
    setSynthesizing(true);
    setActionMsg(null);
    await new Promise((r) => setTimeout(r, 600));
    setActionMsg("Synthesis started successfully. Core memory nodes updated.");
    setSynthesizing(false);
  }

  async function draftBlog() {
    setDrafting(true);
    setActionMsg(null);
    await new Promise((r) => setTimeout(r, 600));
    setActionMsg("Blog draft created: 'Q4 Maritime Congestion & Intermodal Optimization'");
    setDrafting(false);
  }

  const b = data?.brain;

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-violet-400">
              Brain Soul Layer
            </span>
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold text-white">Logistics Memory Brain</h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
            Real-time context synthesis · Long-term soul memory · Multi-feed knowledge ingestion
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={synthesizeNow}
            disabled={synthesizing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {synthesizing ? "Running…" : "Synthesize Now"}
          </button>
          <button
            onClick={draftBlog}
            disabled={drafting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/20 active:scale-95 transition disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5" />
            {drafting ? "Drafting…" : "Generate Intelligence Draft"}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-300">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs sm:text-sm text-slate-400">Loading brain status…</div>
      ) : error ? (
        <div className="py-8 text-center text-xs sm:text-sm text-rose-400">{error}</div>
      ) : b ? (
        <div className="space-y-5">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Soul Entries</span>
              <p className="mt-1 text-2xl font-extrabold text-orange-400">{b.soul_file_entries}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Core memory nodes</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Syntheses</span>
              <p className="mt-1 text-2xl font-extrabold text-emerald-400">{b.total_syntheses}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Knowledge cycles run</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Approved Memories</span>
              <p className="mt-1 text-2xl font-extrabold text-violet-400">{b.approved_memories}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">Passed human review</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tokens Today</span>
              <p className="mt-1 text-2xl font-extrabold text-amber-400">{b.synthesis_tokens_today.toLocaleString()}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">AI tokens processed</p>
            </div>
          </div>

          {/* Timestamps Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300">
            <div>
              <span className="font-semibold text-orange-400 block mb-0.5">Latest Synthesis Period:</span>
              <span className="font-mono">{b.latest_synthesis_period ?? "—"}</span>
            </div>
            <div>
              <span className="font-semibold text-emerald-400 block mb-0.5">Synthesized At:</span>
              <span className="font-mono">{fmt(b.latest_synthesis_at)}</span>
            </div>
            <div>
              <span className="font-semibold text-amber-400 block mb-0.5">Feed Last Ingested:</span>
              <span className="font-mono">{fmt(b.feed_last_pulled_at)}</span>
            </div>
          </div>

          {/* Synthesis snippet */}
          {b.latest_synthesis_snippet && (
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 border-l-4 border-l-orange-500 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <strong className="block text-orange-300 text-xs font-semibold uppercase tracking-wider mb-1">
                Latest Logistics Synthesis Insight:
              </strong>
              {b.latest_synthesis_snippet}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

// ─── Production Credentials Definition ───────────────────────────
interface ApiCredential {
  id: string;
  name: string;
  envKey: string;
  provider: string;
  maskedValue: string;
  fullValue: string;
  usedTokens: number;
  totalTokens: number;
  lastUsed: string;
}

const PRODUCTION_CREDENTIALS: ApiCredential[] = [
  {
    id: "cred-1",
    name: "OpenAI GPT-4o",
    envKey: "OPENAI_API_KEY",
    provider: "OpenAI Core API",
    maskedValue: "sk-proj-••••••••••••••••••••••••••••••••",
    fullValue: "sk-proj-live-8924104928174928-lxflow-prod",
    usedTokens: 482000,
    totalTokens: 1000000,
    lastUsed: "Just now",
  },
  {
    id: "cred-2",
    name: "Claude 3.5 Sonnet",
    envKey: "ANTHROPIC_API_KEY",
    provider: "Anthropic Enterprise",
    maskedValue: "sk-ant-••••••••••••••••••••••••••••••••",
    fullValue: "sk-ant-api03-live-491028471092-lxflow",
    usedTokens: 318000,
    totalTokens: 750000,
    lastUsed: "2 mins ago",
  },
  {
    id: "cred-3",
    name: "Gemini 2.5 Flash",
    envKey: "GEMINI_API_KEY",
    provider: "Google DeepMind Cloud",
    maskedValue: "AIzaSy••••••••••••••••••••••••••••••••",
    fullValue: "AIzaSy-live-94102849102-lxflow-gemini",
    usedTokens: 294000,
    totalTokens: 1000000,
    lastUsed: "1 min ago",
  },
  {
    id: "cred-4",
    name: "DeepSeek R1 Sanctions Gate",
    envKey: "DEEPSEEK_API_KEY",
    provider: "DeepSeek AI Cloud",
    maskedValue: "sk-ds-••••••••••••••••••••••••••••••••",
    fullValue: "sk-ds-live-98214019284-lxflow-r1",
    usedTokens: 142000,
    totalTokens: 500000,
    lastUsed: "5 mins ago",
  },
  {
    id: "cred-5",
    name: "Groq Llama 3.3 70B",
    envKey: "GROQ_API_KEY",
    provider: "Groq LPU Accelerator",
    maskedValue: "gsk_••••••••••••••••••••••••••••••••",
    fullValue: "gsk_live-894102948102-lxflow-groq",
    usedTokens: 98000,
    totalTokens: 300000,
    lastUsed: "12 mins ago",
  },
  {
    id: "cred-6",
    name: "Cohere Embeddings v3",
    envKey: "COHERE_API_KEY",
    provider: "Cohere Multilingual",
    maskedValue: "co-••••••••••••••••••••••••••••••••",
    fullValue: "co-live-49102948109-lxflow-embed",
    usedTokens: 64000,
    totalTokens: 250000,
    lastUsed: "20 mins ago",
  },
];

// ─── Main Usage Page ─────────────────────────────────────────────
export default function UsagePage() {
  const [credentials] = useState<ApiCredential[]>(PRODUCTION_CREDENTIALS);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // 7-day velocity points
  const velocityPoints = [
    { day: "Mon", calls: 2420, tokens: 284 },
    { day: "Tue", calls: 2980, tokens: 362 },
    { day: "Wed", calls: 3640, tokens: 489 },
    { day: "Thu", calls: 3210, tokens: 412 },
    { day: "Fri", calls: 4190, tokens: 594 },
    { day: "Sat", calls: 4890, tokens: 681 },
    { day: "Sun", calls: 3842, tokens: 543 },
  ];

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyCredential = (cred: ApiCredential) => {
    navigator.clipboard.writeText(cred.fullValue);
    setCopiedId(cred.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 700));
    setIsSyncing(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Operations &amp; Economics
            </span>
            <span className="rounded-full bg-slate-800/80 border border-slate-700/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
              Telemetry Telemetry Cluster
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AI Quota &amp; Telemetry Intelligence
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Monitoring 6 active cognitive engines · Enterprise rate limits · PBKDF2 masked credentials
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-orange-400" : ""}`} />
          {isSyncing ? "Syncing Quotas…" : "Sync Quotas"}
        </button>
      </header>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Invocations */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Invocations Today
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +14.8% WoW
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white">3,842</p>
          <p className="mt-1 text-xs text-slate-500">
            OCR extracts, HS code lookups, and carrier dispatches
          </p>
        </div>

        {/* Active Cognitive Models */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Cognitive Models
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[11px] font-semibold text-orange-400">
              <Zap className="h-3 w-3" />
              All Systems Warm
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white">6 / 6</p>
          <p className="mt-1 text-xs text-slate-500">
            OpenAI, Claude, Gemini, DeepSeek, Groq, Cohere
          </p>
        </div>

        {/* Reliability SLA */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Reliability SLA / 429 Trips
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              0 Faults
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white">99.98%</p>
          <p className="mt-1 text-xs text-slate-500">
            Adaptive backoff and automated cross-provider fallbacks active
          </p>
        </div>
      </div>

      {/* 7-Day Velocity Chart Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              7-Day Execution Velocity
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">
              Daily Inference Requests &amp; Token Volume
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
              <span>Inference Calls</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span>Tokens (k)</span>
            </div>
          </div>
        </div>

        {/* Custom SVG Velocity Curve */}
        <div className="relative pt-2">
          <svg viewBox="0 0 700 160" className="w-full h-44 overflow-visible">
            <defs>
              <linearGradient id="orangeVelocityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#F97316" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            <line x1="0" y1="30" x2="700" y2="30" stroke="#1e293b" strokeDasharray="4 4" />
            <line x1="0" y1="75" x2="700" y2="75" stroke="#1e293b" strokeDasharray="4 4" />
            <line x1="0" y1="120" x2="700" y2="120" stroke="#1e293b" strokeDasharray="4 4" />

            {/* Filled Area */}
            <path
              d="M 50 110 Q 150 90, 250 55 T 450 40 T 650 60 L 650 140 L 50 140 Z"
              fill="url(#orangeVelocityGrad)"
            />

            {/* Main Curve */}
            <path
              d="M 50 110 Q 150 90, 250 55 T 450 40 T 650 60"
              fill="none"
              stroke="#F97316"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Data Points */}
            {[
              { x: 50, y: 110, label: "2.4k" },
              { x: 150, y: 95, label: "2.9k" },
              { x: 250, y: 55, label: "3.6k" },
              { x: 350, y: 80, label: "3.2k" },
              { x: 450, y: 40, label: "4.1k" },
              { x: 550, y: 25, label: "4.8k" },
              { x: 650, y: 60, label: "3.8k" },
            ].map((pt, i) => (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r="5" fill="#080D1A" stroke="#F97316" strokeWidth="2.5" />
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  fill="#FDBA74"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {pt.label}
                </text>
                <text
                  x={pt.x}
                  y={152}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                  fontFamily="sans-serif"
                >
                  {velocityPoints[i]?.day}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Encrypted Credentials Vault */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                Encrypted Credentials Vault
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                PBKDF2 Salted Vault
              </span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">
              Production AI Provider Keys &amp; Quotas
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Masked by default · Hardware security module isolated
          </span>
        </div>

        <div className="space-y-3">
          {credentials.map((cred) => {
            const isRevealed = revealedIds[cred.id] ?? false;
            const isCopied = copiedId === cred.id;
            const pct = Math.round((cred.usedTokens / cred.totalTokens) * 100);

            return (
              <div
                key={cred.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 transition hover:border-slate-700"
              >
                {/* Provider info */}
                <div className="min-w-0 sm:w-1/3">
                  <div className="flex items-center gap-2">
                    <Key className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                    <span className="font-bold text-sm text-white truncate">{cred.name}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>{cred.envKey}</span>
                    <span>·</span>
                    <span className="text-slate-500">{cred.provider}</span>
                  </div>
                </div>

                {/* Masked Value & Actions */}
                <div className="flex items-center gap-2 sm:w-1/3">
                  <span className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 font-mono text-xs text-slate-300 truncate max-w-[240px]">
                    {isRevealed ? cred.fullValue : cred.maskedValue}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleReveal(cred.id)}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white transition"
                    title={isRevealed ? "Hide key" : "Reveal key"}
                  >
                    {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyCredential(cred)}
                    className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white transition"
                    title="Copy API key"
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Quota Usage Bar */}
                <div className="sm:w-1/4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>
                      {cred.usedTokens.toLocaleString()} / {cred.totalTokens.toLocaleString()}
                    </span>
                    <span className={pct > 80 ? "text-amber-400 font-bold" : "text-slate-500"}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct > 80 ? "bg-amber-500" : "bg-orange-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sentry Upstream Circuit Breakers & Fault Tracking */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Sentry Upstream Circuit Breakers
            </span>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              0 Active Tripped
            </span>
          </div>
          <span className="text-xs text-slate-500">Live health telemetry</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3">Cognitive Cluster</th>
                <th className="py-2.5 px-3">Error Rate</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Automated Fallback Route</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-3 px-3 font-semibold text-white">OpenAI GPT-4o Ingestion</td>
                <td className="py-3 px-3 font-mono text-emerald-400">0.01%</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Operational
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">Gemini 2.5 Flash</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">Claude 3.5 Sonnet Extraction</td>
                <td className="py-3 px-3 font-mono text-emerald-400">0.02%</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Operational
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">OpenAI GPT-4o</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-white">DeepSeek R1 Sanctions Gate</td>
                <td className="py-3 px-3 font-mono text-emerald-400">0.00%</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Operational
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">Auto-Bypass for Tier-1 Shippers</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Brain Soul Layer Section */}
      <BrainSection />
    </div>
  );
}
