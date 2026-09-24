"use client";

import React, { useState } from "react";
import {
  UnifiedArchitectureResponse,
  ArchitectureComponent,
} from "@/lib/api";
import { ArchitectureGraph } from "@/components/ArchitectureGraph";
import { StatusBadge } from "./ui/StatusBadge";
import { SectionHeader } from "./ui/SectionHeader";
import {
  Layers,
  Shield,
  Zap,
  Database,
  Radio,
  Server,
  Globe,
  Download,
  Copy,
  Check,
  ArrowRight,
  Flame,
  Box,
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
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    architecture.components[0]?.id || null
  );
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

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
  };

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(architecture.mermaid_diagram);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <SectionHeader
          title={projectName ? `${projectName} — System Architecture` : "System Architecture"}
          description="Interactive system topology with component-level security zones, communication protocols, and scaling characteristics."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyMermaid}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors"
                title="Copy Mermaid.js Diagram"
              >
                {copiedMermaid ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Mermaid</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              {onChallenge && (
                <button
                  type="button"
                  onClick={onChallenge}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs font-sans transition-all shadow-xs"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Challenge Architecture</span>
                </button>
              )}
            </div>
          }
        />

        {/* 4 Summary Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Components</span>
            <span className="text-xl font-bold text-slate-900">{architecture.components?.length || 0}</span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Connections</span>
            <span className="text-xl font-bold text-slate-900">{architecture.connections?.length || 0}</span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Security Zones</span>
            <span className="text-xl font-bold text-slate-900">{architecture.security_boundaries?.length || 0}</span>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Technologies</span>
            <span className="text-xl font-bold text-slate-900">{architecture.technologies?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Graph (~70%) & Inspector (~30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Architecture Graph */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
              Interactive Topology Graph
            </h3>
            <span className="text-xs text-slate-400">
              Click node to inspect
            </span>
          </div>

          <ArchitectureGraph
            components={architecture.components}
            connections={architecture.connections}
            securityBoundaries={architecture.security_boundaries}
            selectedComponentId={selectedComponentId}
            onSelectComponent={(id) => setSelectedComponentId(id)}
          />
        </div>

        {/* Right: Component Inspector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
              Component Inspector
            </h3>
            {selectedComponent && (
              <StatusBadge variant="default" size="sm">
                {selectedComponent.security_zone.replace(/_/g, " ")}
              </StatusBadge>
            )}
          </div>

          {selectedComponent ? (
            <div className="space-y-4 text-xs font-sans">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedComponent.name}
                </h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {selectedComponent.type}
                  </span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedComponent.technology}
                  </span>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <div className="text-[11px] font-semibold uppercase text-slate-500 mb-1">
                  Purpose & Role:
                </div>
                <p className="text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-lg leading-relaxed">
                  {selectedComponent.purpose}
                </p>
              </div>

              {/* Responsibilities */}
              {selectedComponent.responsibilities?.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase text-slate-500 mb-1">
                    Responsibilities:
                  </div>
                  <ul className="text-slate-700 space-y-1 list-disc pl-4">
                    {selectedComponent.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Security Considerations */}
              {selectedComponent.security_considerations && (
                <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-0.5">
                  <div className="font-semibold text-emerald-800 text-[11px]">
                    Security:
                  </div>
                  <p className="text-emerald-950 leading-relaxed">
                    {selectedComponent.security_considerations}
                  </p>
                </div>
              )}

              {/* Scaling Considerations */}
              {selectedComponent.scaling_considerations && (
                <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg space-y-0.5">
                  <div className="font-semibold text-amber-800 text-[11px]">
                    Scaling:
                  </div>
                  <p className="text-amber-950 leading-relaxed">
                    {selectedComponent.scaling_considerations}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Select a component on the graph to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* Below the Graph: Key Decisions & Technologies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Technologies Selected */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold uppercase text-slate-700">
            Validated Technology Stack ({architecture.technologies?.length || 0})
          </h4>
          <div className="space-y-2">
            {architecture.technologies?.map((tech, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-0.5 text-xs font-sans"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{tech.name}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded font-medium">
                    {tech.category}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-snug">
                  {tech.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Scaling Invariants */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h4 className="text-xs font-bold uppercase text-slate-700">
            Resilience & Scaling Strategy
          </h4>
          <div className="space-y-2 text-xs font-sans">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-800 block mb-0.5">
                Throughput Strategy:
              </span>
              <span className="text-slate-600">
                {architecture.scaling?.throughput_strategy || "Horizontal autoscaling with transaction connection pooling"}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-800 block mb-0.5">
                Caching Topology:
              </span>
              <span className="text-slate-600">
                {architecture.scaling?.caching_strategy || "Multi-layer cache-aside with WAL change data capture invalidation"}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-800 block mb-0.5">
                Failover & Recovery:
              </span>
              <span className="text-slate-600">
                {architecture.scaling?.failover_strategy || "Multi-AZ active-passive database with automatic replica promotion"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA to Challenge */}
      {onChallenge && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Stress-Test this Architecture</span>
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Simulate chaos failure conditions to identify failure cascades, blast radiuses, and mitigation playbooks.
            </p>
          </div>
          <button
            type="button"
            onClick={onChallenge}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs font-sans transition-all shadow-xs shrink-0"
          >
            <span>Challenge My Architecture</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
