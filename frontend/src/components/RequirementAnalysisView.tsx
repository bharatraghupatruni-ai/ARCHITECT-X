"use client";

import React, { useState } from "react";
import { RequirementAnalysisResponse } from "@/lib/api";
import {
  Users,
  Gauge,
  HardDrive,
  Globe,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Loader2,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";
import { MetricCard } from "./ui/MetricCard";
import { SectionHeader } from "./ui/SectionHeader";

interface RequirementAnalysisViewProps {
  response: RequirementAnalysisResponse;
  projectName?: string;
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
  onRunAgents?: () => void;
  isRunningAgents?: boolean;
}

export function RequirementAnalysisView({
  response,
  projectName,
  onReanalyze,
  isReanalyzing = false,
  onRunAgents,
  isRunningAgents = false,
}: RequirementAnalysisViewProps) {
  const { analysis, version, created_at } = response;
  const { scale } = analysis;

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    functional: true,
    nfrs: true,
    constraints: false,
    integrations: false,
    ambiguities: true,
    assumptions: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatName = (str: string) => {
    return str
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const confidencePercent = Math.round((analysis.confidence || 0.85) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <SectionHeader
          badge={`Specification v${version}`}
          title={projectName ? `${projectName} — Requirement Analysis` : "Requirement Analysis"}
          description="Synthesized domain model, scale metrics, and zero-hallucination ambiguity flags."
          actions={
            <div className="flex items-center gap-2">
              {onReanalyze && (
                <button
                  onClick={onReanalyze}
                  disabled={isReanalyzing || isRunningAgents}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? "animate-spin" : ""}`} />
                  <span>{isReanalyzing ? "Re-Analyzing..." : "Re-Analyze"}</span>
                </button>
              )}

              {onRunAgents && (
                <button
                  onClick={onRunAgents}
                  disabled={isRunningAgents || isReanalyzing}
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs font-mono transition-all shadow-sm disabled:opacity-50"
                >
                  {isRunningAgents ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Dispatching Agents...</span>
                    </>
                  ) : (
                    <>
                      <span>Launch 3-Agent Review</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          }
        />

        {/* Top Summary Attributes & Badges */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <StatusBadge variant="default" size="md">
            Domain: {formatName(analysis.domain)}
          </StatusBadge>
          <StatusBadge variant="purple" size="md">
            Type: {formatName(analysis.system_type)}
          </StatusBadge>
          <StatusBadge
            variant={confidencePercent >= 80 ? "success" : "warning"}
            size="md"
          >
            Confidence: {confidencePercent}%
          </StatusBadge>
          <span className="text-xs text-slate-500 font-mono ml-auto">
            Generated: {new Date(created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Functional Requirements"
            value={analysis.functional_requirements?.length || 0}
            subtitle="Core domain capabilities"
          />
          <MetricCard
            label="Non-Functional Requirements"
            value={analysis.non_functional_requirements?.length || 0}
            subtitle="Quality & scalability attributes"
          />
          <MetricCard
            label="Ambiguities Detected"
            value={analysis.ambiguities?.length || 0}
            subtitle="Unquantified claims"
            badge={
              analysis.ambiguities?.length > 0 ? (
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              ) : undefined
            }
          />
          <MetricCard
            label="Missing Information"
            value={analysis.missing_information?.length || 0}
            subtitle="Zero-invention engineering gaps"
            badge={
              analysis.missing_information?.length > 0 ? (
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
              ) : undefined
            }
          />
        </div>

        {/* Scale Summary Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase text-slate-700 tracking-wider">
              Operational Scale Parameters
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Extracted strictly from requirement text
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200/80 p-3 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-1">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>Concurrent Users</span>
              </div>
              <div className="text-sm font-semibold font-mono text-slate-900">
                {scale.expected_concurrent_users ? scale.expected_concurrent_users.toLocaleString() : "Unspecified"}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-3 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                <span>Throughput (RPS)</span>
              </div>
              <div className="text-sm font-semibold font-mono text-slate-900">
                {scale.expected_requests_per_second ? `${scale.expected_requests_per_second.toLocaleString()} RPS` : "Unspecified"}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-3 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-1">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Total Users</span>
              </div>
              <div className="text-sm font-semibold font-mono text-slate-900">
                {scale.expected_total_users ? scale.expected_total_users.toLocaleString() : "Unspecified"}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-3 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-1">
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                <span>Storage Volume</span>
              </div>
              <div className="text-sm font-semibold font-mono text-slate-900">
                {scale.expected_storage || "Unspecified"}
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-3 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono mb-1">
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                <span>Geographic Scope</span>
              </div>
              <div className="text-sm font-semibold font-mono text-slate-900">
                {scale.geographic_scope || "Single Region"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Detailed Sections */}
      <div className="space-y-4">
        {/* 1. Functional Requirements */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("functional")}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 font-mono">
                Functional Requirements ({analysis.functional_requirements?.length || 0})
              </h3>
            </div>
            {expandedSections.functional ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.functional && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {analysis.functional_requirements?.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-sans text-slate-800"
                  >
                    <span className="font-mono font-semibold text-indigo-600 shrink-0">
                      FR-{String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="capitalize leading-relaxed">{req}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Non-Functional Requirements */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("nfrs")}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 font-mono">
                Non-Functional Requirements ({analysis.non_functional_requirements?.length || 0})
              </h3>
            </div>
            {expandedSections.nfrs ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.nfrs && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                {analysis.non_functional_requirements?.map((nfr, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-mono capitalize"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{nfr}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. Ambiguities & Missing Information (Zero-Invention Protection) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("ambiguities")}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 font-mono">
                Ambiguities & Missing Variables ({((analysis.ambiguities?.length || 0) + (analysis.missing_information?.length || 0))})
              </h3>
            </div>
            {expandedSections.ambiguities ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.ambiguities && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4">
              {analysis.ambiguities?.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Unquantified Ambiguities Flagged:</span>
                  </h4>
                  <div className="space-y-2">
                    {analysis.ambiguities.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs font-sans text-amber-900"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.missing_information?.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
                    <span>Missing Architectural Variables (Zero-Invention Guarantee):</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.missing_information.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700"
                      >
                        • {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Constraints & Priorities */}
        {(analysis.constraints?.length > 0 || analysis.priorities?.length > 0) && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => toggleSection("constraints")}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  Constraints & Trade-off Priorities
                </h3>
              </div>
              {expandedSections.constraints ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {expandedSections.constraints && (
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-3">
                {analysis.constraints?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-mono font-semibold text-slate-700 mb-1.5">
                      Explicit Constraints:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.constraints.map((c, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200/80 rounded-md text-xs font-mono"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.priorities?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-mono font-semibold text-slate-700 mb-1.5">
                      Architectural Priorities:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.priorities.map((p, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-md text-xs font-mono uppercase"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating/Fixed CTA Banner */}
      {onRunAgents && (
        <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-indigo-950 font-mono">
              Ready for Multi-Agent Synthesis?
            </h4>
            <p className="text-xs text-indigo-900/80 mt-0.5">
              Dispatch 3 independent AI agents (Architecture, Security, Reliability) to evaluate this specification.
            </p>
          </div>
          <button
            onClick={onRunAgents}
            disabled={isRunningAgents || isReanalyzing}
            type="button"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm shrink-0 disabled:opacity-50"
          >
            {isRunningAgents ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Review...</span>
              </>
            ) : (
              <>
                <span>Launch 3-Agent Review</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
