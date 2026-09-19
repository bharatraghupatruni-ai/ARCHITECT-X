"use client";

import React, { useState } from "react";
import {
  UnifiedArchitectureResponse,
  ArchitectureComponent,
} from "@/lib/api";
import { ArchitectureGraph } from "@/components/ArchitectureGraph";
import { TraceabilityMatrix } from "@/components/TraceabilityMatrix";
import {
  Layers,
  GitCommit,
  FileCode,
  Shield,
  Zap,
  Database,
  Radio,
  Server,
  Globe,
  Download,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Box,
  Terminal,
} from "lucide-react";

interface ArchitectureViewProps {
  architecture: UnifiedArchitectureResponse;
  projectName?: string;
  onRefresh?: () => void;
  onChallenge?: () => void;
  isLoading?: boolean;
}

export function ArchitectureView({
  architecture,
  projectName,
  onRefresh,
  onChallenge,
  isLoading = false,
}: ArchitectureViewProps) {
  const [activeTab, setActiveTab] = useState<"graph" | "inspector" | "traceability" | "summary" | "mermaid">("graph");
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    architecture.components[0]?.id || null
  );
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const selectedComponent =
    architecture.components.find((c) => c.id === selectedComponentId) ||
    architecture.components[0] ||
    null;

  const handleExportJson = () => {
    const dataStr = JSON.stringify(architecture, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ARCHITECTURE-${projectName || architecture.project.name || "UNIFIED"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(architecture.mermaid_diagram);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  const getComponentIcon = (category: string) => {
    switch (category) {
      case "database":
        return <Database className="w-5 h-5 text-emerald-400" />;
      case "cache":
        return <Zap className="w-5 h-5 text-amber-400" />;
      case "queue":
        return <Radio className="w-5 h-5 text-cyan-400" />;
      case "gateway":
        return <Shield className="w-5 h-5 text-sky-400" />;
      case "ui":
        return <Globe className="w-5 h-5 text-purple-400" />;
      case "external":
        return <Box className="w-5 h-5 text-slate-400" />;
      default:
        return <Server className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="w-full p-6 sm:p-8 rounded-2xl bg-surface-200/90 border border-indigo-500/50 shadow-2xl backdrop-blur-md space-y-8 relative overflow-hidden">
      {/* Ambient background lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-surface-50 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-950 border border-indigo-700/60 text-indigo-300">
              Phase 7 Final Architecture Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {projectName || architecture.project.name}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight flex items-center space-x-2">
            <span>Unified Architecture Blueprint & Traceability</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            {architecture.overview.executive_summary}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={handleExportJson}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-surface-100 hover:bg-surface-300 border border-surface-50 text-xs font-mono text-slate-200 transition-all shadow-md"
            title="Download complete unified architecture model as JSON"
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Exported JSON</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Export Architecture (.json)</span>
              </>
            )}
          </button>

          {onChallenge && (
            <button
              onClick={onChallenge}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-red-600/30"
              title="Test system resilience against 7 failure and scale scenarios"
            >
              <Zap className="w-3.5 h-3.5 text-amber-200" />
              <span>Challenge Architecture →</span>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{isLoading ? "Syncing..." : "Sync Architecture"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative z-10">
        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">Components</span>
            <div className="text-base font-bold text-white font-mono">
              {architecture.overview.total_components} Active
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">Connections</span>
            <div className="text-base font-bold text-cyan-300 font-mono">
              {architecture.overview.total_connections} Protocols
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">Security Zones</span>
            <div className="text-base font-bold text-emerald-400 font-mono">
              {architecture.overview.total_security_zones} Perimeters
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">Traceability</span>
            <div className="text-base font-bold text-purple-300 font-mono">
              {architecture.overview.total_traceability_links} Lineages
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-surface-100/60 border border-surface-50 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-mono">ADR Records</span>
            <div className="text-base font-bold text-amber-300 font-mono">
              {architecture.decisions.length} Decisions
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-surface-50 pb-2 relative z-10 flex-wrap gap-y-2">
        <button
          onClick={() => setActiveTab("graph")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
            activeTab === "graph"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-surface-100"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Architecture Graph</span>
        </button>

        <button
          onClick={() => setActiveTab("inspector")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
            activeTab === "inspector"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-surface-100"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Component Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab("traceability")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
            activeTab === "traceability"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-surface-100"
          }`}
        >
          <GitCommit className="w-4 h-4" />
          <span>Traceability Matrix ({architecture.traceability.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("summary")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
            activeTab === "summary"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-surface-100"
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Architecture Summary</span>
        </button>

        <button
          onClick={() => setActiveTab("mermaid")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all ${
            activeTab === "mermaid"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-surface-100"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Mermaid C4 Code</span>
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="relative z-10">
        {/* Tab 1: Architecture Graph */}
        {activeTab === "graph" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <ArchitectureGraph
                components={architecture.components}
                connections={architecture.connections}
                securityBoundaries={architecture.security_boundaries}
                selectedComponentId={selectedComponentId}
                onSelectComponent={(id) => setSelectedComponentId(id)}
              />
            </div>

            {/* Quick Inspector Panel in Graph View */}
            <div className="lg:col-span-4">
              {selectedComponent ? (
                <div className="p-5 rounded-2xl bg-surface-100/90 border border-indigo-500/40 shadow-xl space-y-4 sticky top-6">
                  <div className="flex items-center space-x-3 pb-3 border-b border-surface-50">
                    <div className="w-9 h-9 rounded-lg bg-surface-300 border border-surface-50 flex items-center justify-center">
                      {getComponentIcon(selectedComponent.category)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono leading-tight">
                        {selectedComponent.name}
                      </h4>
                      <span className="text-[10px] font-mono text-indigo-300 uppercase">
                        [{selectedComponent.category}] • {selectedComponent.type}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Technology Stack
                    </span>
                    <div className="p-2 rounded bg-surface-300 border border-surface-50 text-xs font-mono text-cyan-300 font-bold">
                      {selectedComponent.technology}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Purpose
                    </span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed bg-surface-200/50 p-2.5 rounded border border-surface-50/60">
                      {selectedComponent.purpose}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Responsibilities
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300 font-sans">
                      {selectedComponent.responsibilities.map((resp, rIdx) => (
                        <li key={rIdx} className="flex items-start space-x-1.5">
                          <span className="text-indigo-400 font-bold mt-0.5">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {selectedComponent.security_considerations && (
                    <div className="space-y-1 pt-1 border-t border-surface-50">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider flex items-center space-x-1">
                        <Lock className="w-3 h-3" />
                        <span>Security Considerations</span>
                      </span>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        {selectedComponent.security_considerations}
                      </p>
                    </div>
                  )}

                  {selectedComponent.scaling_considerations && (
                    <div className="space-y-1 pt-1 border-t border-surface-50">
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                        <Zap className="w-3 h-3" />
                        <span>Scaling Considerations</span>
                      </span>
                      <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                        {selectedComponent.scaling_considerations}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Tab 2: Full Component Inspector & Registry */}
        {activeTab === "inspector" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {architecture.components.map((comp) => (
                <div
                  key={comp.id}
                  className="p-5 rounded-2xl bg-surface-100/70 border border-surface-50 space-y-4 shadow-lg hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between space-x-2 pb-3 border-b border-surface-50">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-surface-300 border border-surface-50 flex items-center justify-center">
                        {getComponentIcon(comp.category)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono leading-tight">
                          {comp.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {comp.category}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-surface-300 text-slate-300 border border-surface-50">
                      {comp.security_zone.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Technology:</span>
                    <div className="text-xs font-mono text-cyan-300 font-bold bg-surface-300/80 p-1.5 rounded border border-surface-50">
                      {comp.technology}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Purpose:</span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {comp.purpose}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-surface-50">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Responsibilities:</span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {comp.responsibilities.map((r, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span className="text-indigo-400 font-bold mt-0.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {comp.security_considerations && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] space-y-0.5">
                      <span className="font-bold text-emerald-400 font-mono">Security:</span>
                      <p className="text-slate-300 font-sans">{comp.security_considerations}</p>
                    </div>
                  )}

                  {comp.scaling_considerations && (
                    <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-[11px] space-y-0.5">
                      <span className="font-bold text-amber-400 font-mono">Scaling:</span>
                      <p className="text-slate-300 font-sans">{comp.scaling_considerations}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Traceability Matrix */}
        {activeTab === "traceability" && (
          <TraceabilityMatrix
            traceability={architecture.traceability}
            components={architecture.components}
          />
        )}

        {/* Tab 4: Architecture Summary */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {/* System Overview */}
            <div className="p-5 rounded-2xl bg-surface-100/70 border border-surface-50 space-y-3">
              <h3 className="text-sm font-bold font-mono text-white flex items-center space-x-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Executive Architectural Blueprint</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {architecture.overview.executive_summary}
              </p>
            </div>

            {/* Scaling Characteristics */}
            <div className="p-5 rounded-2xl bg-surface-100/70 border border-surface-50 space-y-4">
              <h3 className="text-sm font-bold font-mono text-amber-400 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Scaling Characteristics & Concurrency Bounds</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-200/50 border border-surface-50 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Throughput Strategy</span>
                  <p className="text-xs text-slate-200">{architecture.scaling.throughput_strategy}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-200/50 border border-surface-50 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Caching Strategy</span>
                  <p className="text-xs text-slate-200">{architecture.scaling.caching_strategy}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-200/50 border border-surface-50 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Database Scaling</span>
                  <p className="text-xs text-slate-200">{architecture.scaling.database_scaling}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-200/50 border border-surface-50 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Failover Resilience</span>
                  <p className="text-xs text-slate-200">{architecture.scaling.failover_strategy}</p>
                </div>
              </div>
            </div>

            {/* Security Boundaries */}
            <div className="p-5 rounded-2xl bg-surface-100/70 border border-surface-50 space-y-4">
              <h3 className="text-sm font-bold font-mono text-emerald-400 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Security Boundaries & Zero-Trust Perimeters</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {architecture.security_boundaries.map((boundary) => (
                  <div key={boundary.id} className="p-3.5 rounded-xl bg-surface-200/50 border border-surface-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">{boundary.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">[{boundary.zone}]</span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">{boundary.description}</p>
                    <ul className="space-y-1 text-[11px] text-emerald-300 pt-1 border-t border-surface-50">
                      {boundary.enforced_policies.map((p, pIdx) => (
                        <li key={pIdx} className="flex items-center space-x-1.5">
                          <span>✓</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Major Risks & Mitigations */}
            <div className="p-5 rounded-2xl bg-surface-100/70 border border-surface-50 space-y-4">
              <h3 className="text-sm font-bold font-mono text-rose-400 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Major Synthesis Risks & Architectural Mitigations</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {architecture.risks.map((risk, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white font-mono">{risk.title || `Risk #${idx + 1}`}</span>
                      <span className="text-[10px] font-mono uppercase text-rose-400 font-bold bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                        {risk.severity || "medium"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans">{risk.description}</p>
                    <div className="text-[11px] text-emerald-300 pt-1 font-mono">
                      <span className="font-bold text-emerald-400">Mitigation: </span>
                      {risk.mitigation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Mermaid C4 Preview */}
        {activeTab === "mermaid" && (
          <div className="relative">
            <pre className="p-5 rounded-2xl bg-surface-300/90 border border-surface-50 text-xs font-mono text-cyan-300 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
              {architecture.mermaid_diagram}
            </pre>
            <button
              onClick={handleCopyMermaid}
              className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-surface-200 hover:bg-surface-100 border border-surface-50 text-xs font-mono text-slate-200 flex items-center space-x-1.5 transition-all shadow-lg"
            >
              {copiedMermaid ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Mermaid</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Mermaid</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
