"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  FileSearch,
  GitBranch,
  MapPin,
  Play,
  Radio,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sliders,
  Terminal,
  Truck,
} from "lucide-react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  Position,
  useEdgesState,
  useNodesState,
  addEdge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import NodeInspectorDrawer, { type ServiceNodeData } from "./NodeInspectorDrawer";
import "./page.css";

// ─── 8-Stage Enterprise Logistics Pipeline Definition ────────────
interface PipelineStage {
  id: string;
  stageNumber: number;
  name: string;
  engine: string;
  description: string;
  detail: string;
  latency: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  status: "idle" | "running" | "completed" | "bypassed";
  parameters: Record<string, string>;
  isBypassable?: boolean;
}

const INITIAL_STAGES: PipelineStage[] = [
  {
    id: "stage-1",
    stageNumber: 1,
    name: "Document OCR & Multimodal Ingestion",
    engine: "AWS Textract + Gemini 2.5 Flash",
    description: "Ingests Bills of Lading, Commercial Invoices, and Packing Lists with multimodal OCR.",
    detail: "Parses PDF, TIFF, scanned manifests with 99.4% field precision.",
    latency: "1.2s",
    icon: FileSearch,
    enabled: true,
    status: "idle",
    parameters: {
      inputFormats: "PDF, TIFF, JPEG, PNG, EDIFACT",
      ocrPrecision: "99.4% Dual-Pass",
      multimodalEngine: "Gemini 2.5 Flash Document Processor",
      autoDeskew: "Enabled",
    },
  },
  {
    id: "stage-2",
    stageNumber: 2,
    name: "Entity Extraction & Address Normalizer",
    engine: "Claude 3.5 Sonnet NER",
    description: "Standardizes shipper, consignee, notify party, and port codes with fuzzy geo-normalization.",
    detail: "Validates against UN/LOCODE database and postal authority schemas.",
    latency: "1.4s",
    icon: MapPin,
    enabled: true,
    status: "idle",
    parameters: {
      nerModel: "Claude 3.5 Sonnet Specialized NER",
      geoDictionary: "UN/LOCODE 2026.1 Global Index",
      fuzzyThreshold: "94.2% Levenshtein Matrix",
      addressStandard: "ISO 19160-4 Compliant",
    },
  },
  {
    id: "stage-3",
    stageNumber: 3,
    name: "Tariff & Customs HS Code Classifier",
    engine: "Voyage AI + Qdrant Vector Vault",
    description: "Autonomous Harmonized Tariff System (HTS) code matching and duty rate determination.",
    detail: "Matches 6-digit & 10-digit HS codes against 180+ national tariff schedules.",
    latency: "1.8s",
    icon: Scale,
    enabled: true,
    status: "idle",
    parameters: {
      vectorIndex: "Qdrant Global Tariff HNSW-128",
      embeddingModel: "Voyage AI Legal-Multimodal-3",
      topKMatches: "5 candidates reranked",
      dutySchedules: "WCO 2026 HTS Master Schedule",
    },
  },
  {
    id: "stage-4",
    stageNumber: 4,
    name: "Multi-Modal Route Optimization",
    engine: "Logixa Cognitive Route Solver",
    description: "Evaluates ocean, air, rail, and drayage combinations for lowest landed cost and CO2 impact.",
    detail: "Calculates transit time vs emission tradeoffs with real-time fuel surcharges.",
    latency: "2.5s",
    icon: GitBranch,
    enabled: true,
    status: "idle",
    parameters: {
      solverAlgorithm: "Constrained Dijkstra + MIP Pareto Solver",
      carbonWeight: "0.35 (Green Corridor Prioritized)",
      modalMatrix: "Ocean (FCL/LCL), Rail Intermodal, Air Express, Truckload",
      bunkerSurchargeFeed: "Brent / Platts Daily Spot Index",
    },
  },
  {
    id: "stage-5",
    stageNumber: 5,
    name: "Sanctions & Anti-Fraud Guard",
    engine: "DeepSeek R1 Sanctions Gate",
    description: "Autonomous screening against OFAC SDN, BIS Entity List, and transshipment risk patterns.",
    detail: "Monitors dark AIS events and ultimate beneficial ownership anomalies.",
    latency: "1.1s",
    icon: ShieldAlert,
    enabled: true,
    status: "idle",
    isBypassable: true,
    parameters: {
      watchlists: "OFAC SDN, EU Consolidated, UK HMT, UN Sanctions",
      vesselTracking: "Global AIS Dark Voyage Detector",
      uboVerification: "OpenSanctions + Bureau van Dijk Graph",
      autoBypassOnTrusted: "Bypassed for Pre-Cleared Tier-1 Shippers",
    },
  },
  {
    id: "stage-6",
    stageNumber: 6,
    name: "Automated Carrier RFQ & Dispatch",
    engine: "FreightOS + Project44 Direct API",
    description: "Issues automated spot tenders and confirms bookings across digital carrier networks.",
    detail: "Executes EDI 301 / API booking requests under target contract tariffs.",
    latency: "2.2s",
    icon: Truck,
    enabled: true,
    status: "idle",
    parameters: {
      carrierProtocols: "EDI 204/301, REST Webhooks, AS2 Connector",
      contractRateFallback: "Enabled (Primary Carrier Ceiling)",
      rfqWindowMinutes: "15 minutes auto-award",
      allocatedCarriers: "Maersk, MSC, Hapag-Lloyd, CMA CGM, BNSF",
    },
  },
  {
    id: "stage-7",
    stageNumber: 7,
    name: "Milestone Telemetry & IoT Tracker",
    engine: "Carrier AIS & Port Webhook Mesh",
    description: "Aggregates real-time GPS telemetry, geofence arrivals, and port terminal gate moves.",
    detail: "Maintains immutable timestamped voyage logs and ETA predictions.",
    latency: "1.6s",
    icon: Radio,
    enabled: true,
    status: "idle",
    parameters: {
      telemetryIngest: "Kafka High-Throughput Stream",
      geofenceRadiusKm: "5.0 km Port Boundary",
      etaPredictionModel: "XGBoost Historical Dwell Predictor",
      anomalyAlarm: "Threshold: >4 hours deviation",
    },
  },
  {
    id: "stage-8",
    stageNumber: 8,
    name: "Financial Settlement & ERP Push",
    engine: "SAP ERP & Ledger Settlement",
    description: "Three-way invoice match, freight accrual generation, and financial ledger settlement.",
    detail: "Dispatches automated payment authorization upon verified delivery POD.",
    latency: "1.5s",
    icon: DollarSign,
    enabled: true,
    status: "idle",
    parameters: {
      erpTarget: "SAP S/4HANA TM & NetSuite OneWorld",
      matchTolerance: "±0.5% Fuel Surcharge Variance",
      settlementMode: "Automated ACH / Commercial Virtual Card",
      auditTrail: "WORM Encrypted Ledger Entry",
    },
  },
];

export default function AdminWorkflowPage() {
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES);
  const [selectedStageId, setSelectedStageId] = useState<string>("stage-1");
  const [simulating, setSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"pipeline" | "canvas">("pipeline");
  const [canvasInspectNode, setCanvasInspectNode] = useState<Node<ServiceNodeData> | null>(null);

  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [ORCHESTRATOR] Logixa Flow Autonomous Pipeline initialized.`,
    `[${new Date().toLocaleTimeString()}] [TELEMETRY] 8 enterprise stages loaded and verified.`,
    `[${new Date().toLocaleTimeString()}] [ROUTING] Stage 5 [Sanctions & Fraud Guard] enabled with auto-bypass capability.`,
    `[${new Date().toLocaleTimeString()}] [STATUS] Ready for containerized dispatch simulation.`,
  ]);

  const activeStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId) || stages[0],
    [stages, selectedStageId]
  );

  // Toggle stage enabled/disabled
  const toggleStage = (stageId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setStages((prev) =>
      prev.map((s) => {
        if (s.id === stageId) {
          const nextState = !s.enabled;
          const logMsg = nextState
            ? `[${new Date().toLocaleTimeString()}] [CONFIG] Stage ${s.stageNumber} [${s.name}] enabled.`
            : `[${new Date().toLocaleTimeString()}] [ROUTING] Stage ${s.stageNumber} [${s.name}] auto-bypassed. Traffic routed to downstream stage.`;
          setLogs((l) => [logMsg, ...l].slice(0, 12));
          return {
            ...s,
            enabled: nextState,
            status: nextState ? "idle" : "bypassed",
          };
        }
        return s;
      })
    );
  };

  // Run full simulation
  const runSimulation = async () => {
    if (simulating) return;
    setSimulating(true);
    setSimulationProgress(0);

    setLogs((l) => [
      `[${new Date().toLocaleTimeString()}] [SIMULATOR] Starting end-to-end autonomous dispatch simulation...`,
      ...l,
    ]);

    // Reset statuses
    setStages((prev) =>
      prev.map((s) => ({
        ...s,
        status: s.enabled ? "idle" : "bypassed",
      }))
    );

    for (let index = 0; index < stages.length; index++) {
      const stage = stages[index];
      if (!stage.enabled) {
        setLogs((l) => [
          `[${new Date().toLocaleTimeString()}] [BYPASS] Stage ${stage.stageNumber} [${stage.name}] bypassed. Bridge route active.`,
          ...l,
        ]);
        continue;
      }

      // Set stage to running
      setStages((prev) =>
        prev.map((s) => (s.id === stage.id ? { ...s, status: "running" } : s))
      );
      setSelectedStageId(stage.id);

      setLogs((l) => [
        `[${new Date().toLocaleTimeString()}] [EXEC] Stage ${stage.stageNumber} [${stage.name}] executing via ${stage.engine}...`,
        ...l,
      ]);

      await new Promise((r) => setTimeout(r, 650));

      // Set stage to completed
      setStages((prev) =>
        prev.map((s) => (s.id === stage.id ? { ...s, status: "completed" } : s))
      );

      setLogs((l) => [
        `[${new Date().toLocaleTimeString()}] [SUCCESS] Stage ${stage.stageNumber} finished in ${stage.latency}. Checkpoint committed.`,
        ...l,
      ]);

      const completedCount = index + 1;
      setSimulationProgress(Math.round((completedCount / stages.length) * 100));
    }

    setLogs((l) => [
      `[${new Date().toLocaleTimeString()}] [COMPLETE] Autonomous logistics pipeline executed successfully. All telemetry logged.`,
      ...l,
    ]);

    setSimulating(false);
  };

  // ─── XYFlow Canvas Setup for "Canvas Studio" Tab ───────────────
  const initialCanvasNodes: Node<ServiceNodeData>[] = useMemo(
    () =>
      INITIAL_STAGES.map((s, idx) => ({
        id: s.id,
        position: { x: 80 + (idx % 4) * 280, y: 80 + Math.floor(idx / 4) * 220 },
        data: {
          label: s.name,
          detail: s.detail,
          status: s.enabled ? "green" : "amber",
          nodeType: "task",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        type: "default",
      })),
    []
  );

  const initialCanvasEdges: Edge[] = useMemo(
    () =>
      INITIAL_STAGES.slice(0, -1).map((s, idx) => ({
        id: `edge-${s.id}-${INITIAL_STAGES[idx + 1].id}`,
        source: s.id,
        target: INITIAL_STAGES[idx + 1].id,
        animated: true,
        style: { stroke: "#F97316", strokeWidth: 2 },
      })),
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialCanvasNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialCanvasEdges);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: "#F97316", strokeWidth: 2 } },
          eds
        )
      ),
    [setEdges]
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-orange-400">
              Pipeline Orchestration
            </span>
            <span className="rounded-full bg-slate-800/80 border border-slate-700/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
              8 Enterprise Stages
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Autonomous Logistics Workflows
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Multi-modal freight intelligence, tariff classification, automated carrier RFQ, and ERP settlement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("pipeline")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                viewMode === "pipeline"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pipeline Simulator
            </button>
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                viewMode === "canvas"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Graph Canvas
            </button>
          </div>

          {/* Simulate Pipeline Button */}
          <button
            type="button"
            onClick={runSimulation}
            disabled={simulating}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 active:scale-95 transition disabled:opacity-50"
          >
            {simulating ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Simulating ({simulationProgress}%)
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                Simulate Pipeline
              </>
            )}
          </button>
        </div>
      </header>

      {/* Progress Bar during simulation */}
      {simulating && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-3">
          <div className="flex items-center justify-between text-xs text-orange-300 font-semibold mb-1.5">
            <span>Executing Autonomous Pipeline...</span>
            <span>{simulationProgress}% Complete</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${simulationProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* VIEW MODE 1: 8-STAGE INTERACTIVE PIPELINE SIMULATOR */}
      {viewMode === "pipeline" && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Main 8 Stages List (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Execution Pipeline (Sequential)
              </span>
              <span className="text-xs text-slate-500">
                {stages.filter((s) => s.enabled).length} of {stages.length} stages active
              </span>
            </div>

            {stages.map((stage, idx) => {
              const Icon = stage.icon;
              const isSelected = stage.id === selectedStageId;
              const isBypassed = !stage.enabled;

              return (
                <div key={stage.id} className="relative">
                  {/* Connecting bridge line */}
                  {idx < stages.length - 1 && (
                    <div
                      className={`absolute left-8 top-full h-3 w-0.5 z-0 transition-colors ${
                        stage.status === "completed"
                          ? "bg-orange-500"
                          : isBypassed
                          ? "bg-amber-500/40 border-l border-dashed border-amber-400"
                          : "bg-slate-800"
                      }`}
                    />
                  )}

                  <div
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`group relative z-10 flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? "border-orange-500/60 bg-slate-900/90 shadow-xl shadow-orange-500/5 ring-1 ring-orange-500/30"
                        : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/70"
                    } ${isBypassed ? "opacity-60 bg-slate-950/40" : ""}`}
                  >
                    {/* Stage Number & Icon Badge */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        stage.status === "running"
                          ? "border-orange-500 bg-orange-500/20 text-orange-400 animate-pulse"
                          : stage.status === "completed"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : isBypassed
                          ? "border-slate-800 bg-slate-950 text-slate-600"
                          : isSelected
                          ? "border-orange-500/40 bg-orange-500/10 text-orange-400"
                          : "border-slate-800 bg-slate-950/80 text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                          STAGE {stage.stageNumber}
                        </span>
                        <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                          {stage.engine}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono ml-auto">
                          <Clock className="h-3 w-3" />
                          {stage.latency}
                        </span>
                      </div>

                      <h3 className="mt-1 text-sm font-bold text-white truncate">
                        {stage.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                        {stage.description}
                      </p>

                      {/* Status / Bypass Indicator */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {stage.status === "running" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/20 px-2.5 py-0.5 text-[10px] font-bold text-orange-300">
                              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                              PROCESSING
                            </span>
                          )}
                          {stage.status === "completed" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              VERIFIED
                            </span>
                          )}
                          {isBypassed && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                              <ShieldAlert className="h-2.5 w-2.5" />
                              BYPASS ROUTE
                            </span>
                          )}
                        </div>

                        {/* Interactive Toggle Switch */}
                        <label
                          className="relative inline-flex items-center cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={stage.enabled}
                            onChange={(e) => toggleStage(stage.id, e as unknown as React.MouseEvent)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Panel: Node Inspector & Telemetry Terminal (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Stage Inspector Card */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Sliders className="h-4 w-4 text-orange-400" />
                  Stage Inspector
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    activeStage.enabled
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {activeStage.enabled ? "Active" : "Bypassed"}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    STAGE {activeStage.stageNumber}
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {activeStage.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {activeStage.detail}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Engine:</span>
                    <span className="text-orange-300 font-semibold">{activeStage.engine}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avg Latency:</span>
                    <span className="text-slate-300">{activeStage.latency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-slate-300 uppercase">{activeStage.status}</span>
                  </div>
                </div>

                {/* Parameters */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                    Runtime Parameters &amp; Config
                  </span>
                  <div className="space-y-1.5">
                    {Object.entries(activeStage.parameters).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg bg-slate-950/40 border border-slate-800/60 px-3 py-2 text-xs"
                      >
                        <span className="font-mono text-slate-400">{key}</span>
                        <span className="font-mono text-slate-200 text-right truncate max-w-[200px]">
                          {val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Pipeline Telemetry Log */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-xl font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <Terminal className="h-3.5 w-3.5 text-orange-400" />
                  Pipeline Telemetry
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE STREAM
                </div>
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto overscroll-contain pr-1 text-[11px] text-slate-300 leading-relaxed">
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-slate-600 select-none">&gt;</span>
                    <span
                      className={
                        log.includes("[ERROR]")
                          ? "text-rose-400"
                          : log.includes("[SUCCESS]")
                          ? "text-emerald-400 font-semibold"
                          : log.includes("[BYPASS]")
                          ? "text-amber-400"
                          : log.includes("[ORCHESTRATOR]")
                          ? "text-orange-400"
                          : "text-slate-300"
                      }
                    >
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: XYFLOW GRAPH CANVAS STUDIO */}
      {viewMode === "canvas" && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Interactive Graph Canvas</h3>
              <p className="text-xs text-slate-400">
                Visual node connections powered by @xyflow/react. Drag, inspect, or connect workflow stages.
              </p>
            </div>
            <span className="rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-xs font-mono text-orange-300">
              {nodes.length} Nodes Connected
            </span>
          </div>

          <div style={{ height: "540px", width: "100%", position: "relative" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setCanvasInspectNode(node)}
              fitView
              nodesDraggable={true}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#1f2a44" gap={24} size={1} />
              <MiniMap
                nodeColor={(node) =>
                  node.data?.status === "red"
                    ? "#EF4444"
                    : node.data?.status === "amber"
                    ? "#F59E0B"
                    : "#F97316"
                }
              />
              <Controls />
            </ReactFlow>

            {/* Node Inspector Drawer for XYFlow */}
            <NodeInspectorDrawer
              selectedNode={canvasInspectNode}
              onClose={() => setCanvasInspectNode(null)}
              onDeleteNode={(id) => {
                setNodes((nds) => nds.filter((n) => n.id !== id));
                setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
                setCanvasInspectNode(null);
              }}
              onUpdateNode={(id, data) => {
                setNodes((nds) =>
                  nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
                );
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
