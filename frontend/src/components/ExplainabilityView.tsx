"use client";

import React, { useState } from "react";
import {
  ExplainabilityResponse,
  ADRExportResponse,
  api,
} from "@/lib/api";
import { ADRViewer } from "@/components/ADRViewer";
import { C4Visualizer } from "@/components/C4Visualizer";
import {
  FileCode,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  CheckCircle2,
  BookOpen,
  Server,
  Shield,
  Zap,
} from "lucide-react";

interface ExplainabilityViewProps {
  explainability: ExplainabilityResponse;
  projectName?: string;
  onRerunExplainability?: () => void;
  isLoading?: boolean;
  onOpenArchitecture?: () => void;
}

export function ExplainabilityView({
  explainability,
  projectName,
  onRerunExplainability,
  isLoading = false,
  onOpenArchitecture,
}: ExplainabilityViewProps) {

  const [activeTab, setActiveTab] = useState<"adrs" | "c4">("adrs");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  const totalAdrs = explainability.adrs.length;
  const c4 = explainability.c4_diagram;
  const totalContainers = c4?.level_2_container.nodes.length || 0;
  const totalCitations = explainability.adrs.reduce(
    (acc, adr) => acc + (adr.evidence_citations?.length || 0),
    0
  );

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const res: ADRExportResponse = await api.exportADRs(explainability.project_id);
      const blob = new Blob([res.bundled_markdown], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ADR-BUNDLE-${projectName || "ARCHITECT-X"}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to export ADR bundle:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full p-6 sm:p-8 rounded-2xl bg-surface-200/90 border border-indigo-500/40 shadow-2xl backdrop-blur-md space-y-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-surface-50 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700">
              Architecture Decisions & Blueprint
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {projectName ? `Project: ${projectName}` : "Architectural Blueprints"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight flex items-center space-x-2">
            <span>Decision Records & C4 Architecture Blueprint</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {explainability.summary}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-surface-300 border border-surface-50 text-xs font-mono text-slate-200 transition-all shadow-md disabled:opacity-50"
            title="Download full MADR bundle as Markdown"
          >
            {exportSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Downloaded ADRs</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export ADRs (.md)</span>
              </>
            )}
          </button>

          {onRerunExplainability && (
            <button
              onClick={onRerunExplainability}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Generating..." : "Re-Synthesize"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">Formal ADRs</span>
            <div className="text-base font-bold text-white font-mono">{totalAdrs} Records</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">C4 Hierarchy</span>
            <div className="text-base font-bold text-cyan-300 font-mono">3 Tiers Active</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">RAG Citations</span>
            <div className="text-base font-bold text-emerald-400 font-mono">{totalCitations} Grounded</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">L2 Topology</span>
            <div className="text-base font-bold text-purple-300 font-mono">{totalContainers} Containers</div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-surface-50 pb-2 relative z-10">
        <button
          onClick={() => setActiveTab("adrs")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
            activeTab === "adrs"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-surface-100"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Architecture Decision Records ({totalAdrs})</span>
        </button>

        <button
          onClick={() => setActiveTab("c4")}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
            activeTab === "c4"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-surface-100"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Interactive C4 Visualizer</span>
        </button>
      </div>

      {/* Active Tab Content Area */}
      <div className="relative z-10">
        {activeTab === "adrs" && (
          <ADRViewer
            adrs={explainability.adrs}
            projectId={explainability.project_id}
            projectName={projectName}
          />
        )}

        {activeTab === "c4" && c4 && (
          <C4Visualizer
            c4Diagram={c4}
            projectName={projectName}
          />
        )}
      </div>

      {/* Phase 7 Call-To-Action Banner */}
      {onOpenArchitecture && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-surface-200 to-emerald-950/80 border border-emerald-500/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h4 className="text-sm font-bold text-white font-mono">
                Proceed to Architecture Workspace & Traceability
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              View the normalized architecture graph, component inspector, and end-to-end requirement lineage.
            </p>
          </div>

          <button
            onClick={onOpenArchitecture}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-emerald-600/30 flex-shrink-0"
          >
            <span>Launch Architecture Workspace →</span>
          </button>
        </div>
      )}
    </div>
  );
}

