"use client";

import React, { useState } from "react";
import { RequirementAnalysisResponse } from "@/lib/api";
import {
  Layers,
  Users,
  Gauge,
  HardDrive,
  Globe,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  Code2,
  Tag,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Loader2,
} from "lucide-react";

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
  const [showRawJson, setShowRawJson] = useState(false);

  const formatDomain = (domainStr: string) => {
    return domainStr
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const formatSystemType = (st: string) => {
    return st
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="bg-surface-200/95 border border-indigo-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/50 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-50">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Analysis Specification v{version}
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
              Pydantic Validated
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">
            {projectName ? `${projectName} — Architecture Specification` : "Structured Requirement Specification"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Generated: {new Date(created_at).toLocaleString()}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {onReanalyze && (
            <button
              onClick={onReanalyze}
              disabled={isReanalyzing || isRunningAgents}
              type="button"
              className="px-3.5 py-2 text-xs font-mono text-slate-300 bg-surface-100 hover:bg-surface-50 border border-surface-50 rounded-lg hover:text-white transition-all disabled:opacity-50"
            >
              {isReanalyzing ? "Re-Analyzing..." : "Re-Analyze"}
            </button>
          )}

          {onRunAgents && (
            <button
              onClick={onRunAgents}
              disabled={isRunningAgents || isReanalyzing}
              type="button"
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition-all flex items-center space-x-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50"
            >
              {isRunningAgents ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Running 3 Agents...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Run Architecture Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 1. System Overview & Archetype */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-300/90 border border-surface-50 p-4 rounded-xl">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Application Domain
          </span>
          <div className="text-lg font-bold text-indigo-300 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>{formatDomain(analysis.domain)}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">
            Normalized identifier: {analysis.domain}
          </span>
        </div>

        <div className="bg-surface-300/90 border border-surface-50 p-4 rounded-xl">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            System Archetype
          </span>
          <div className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-slate-400" />
            <span>{formatSystemType(analysis.system_type)}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1 block">
            Archetype: {analysis.system_type}
          </span>
        </div>

        <div className="bg-surface-300/90 border border-surface-50 p-4 rounded-xl">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Specification Confidence
          </span>
          <div className="flex items-center space-x-3 mt-1">
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {(analysis.confidence * 100).toFixed(0)}%
            </div>
            <div className="flex-1 bg-surface-100 h-2 rounded-full overflow-hidden border border-surface-50">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${analysis.confidence * 100}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-1.5 block">
            Confidence score based on clarity & completeness
          </span>
        </div>
      </div>

      {/* 2. Scale & Volumetric Metrics Matrix */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
          <Gauge className="w-4 h-4 text-indigo-400" />
          <span>Scale & Volumetric Invariants (Zero Inventions Rule)</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-surface-300/70 border border-surface-50 p-3.5 rounded-xl">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono mb-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Concurrent Users</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {scale.expected_concurrent_users !== null ? (
                <span className="text-indigo-300">
                  {scale.expected_concurrent_users.toLocaleString()} CCU
                </span>
              ) : (
                <span className="text-slate-500 text-xs font-normal">Not specified</span>
              )}
            </div>
          </div>

          <div className="bg-surface-300/70 border border-surface-50 p-3.5 rounded-xl">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono mb-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Total Users</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {scale.expected_total_users !== null ? (
                <span className="text-indigo-300">
                  {scale.expected_total_users.toLocaleString()}
                </span>
              ) : (
                <span className="text-slate-500 text-xs font-normal">Not specified</span>
              )}
            </div>
          </div>

          <div className="bg-surface-300/70 border border-surface-50 p-3.5 rounded-xl">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono mb-1">
              <Gauge className="w-3.5 h-3.5 text-slate-500" />
              <span>Throughput (RPS)</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {scale.expected_requests_per_second !== null ? (
                <span className="text-indigo-300">
                  {scale.expected_requests_per_second.toLocaleString()} req/s
                </span>
              ) : (
                <span className="text-slate-500 text-xs font-normal">Not specified</span>
              )}
            </div>
          </div>

          <div className="bg-surface-300/70 border border-surface-50 p-3.5 rounded-xl">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono mb-1">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Storage Footprint</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {scale.expected_storage ? (
                <span className="text-indigo-300">{scale.expected_storage}</span>
              ) : (
                <span className="text-slate-500 text-xs font-normal">Not specified</span>
              )}
            </div>
          </div>

          <div className="bg-surface-300/70 border border-surface-50 p-3.5 rounded-xl col-span-2 sm:col-span-1">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono mb-1">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>Geographic Scope</span>
            </div>
            <div className="text-base font-bold font-mono text-white">
              {scale.geographic_scope ? (
                <span className="text-indigo-300">{scale.geographic_scope}</span>
              ) : (
                <span className="text-slate-500 text-xs font-normal">Not specified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Functional & Non-Functional Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Functional */}
        <div className="bg-surface-300/80 border border-surface-50 p-5 rounded-xl space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>Functional Requirements ({analysis.functional_requirements.length})</span>
          </h4>
          <ul className="space-y-2">
            {analysis.functional_requirements.map((req, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-200 flex items-start space-x-2.5 bg-surface-200/60 p-2.5 rounded-lg border border-surface-50/70"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                <span className="capitalize">{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Non-Functional */}
        <div className="bg-surface-300/80 border border-surface-50 p-5 rounded-xl space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Non-Functional Requirements ({analysis.non_functional_requirements.length})</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.non_functional_requirements.map((nfr, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 capitalize"
              >
                {nfr}
              </span>
            ))}
          </div>

          <div className="pt-3 border-t border-surface-50/80">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Trade-off Priorities
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analysis.priorities.map((priority, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 uppercase"
                >
                  {priority}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Constraints & External Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Constraints */}
        <div className="bg-surface-300/80 border border-surface-50 p-5 rounded-xl space-y-2">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <span>Explicit Technical Constraints</span>
          </h4>
          {analysis.constraints.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono italic py-2">
              None specified by user (unconstrained architecture choice).
            </p>
          ) : (
            <ul className="space-y-1.5">
              {analysis.constraints.map((c, idx) => (
                <li
                  key={idx}
                  className="text-xs font-mono text-slate-200 bg-surface-200/80 px-3 py-2 rounded-md border border-surface-50"
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* External Integrations */}
        <div className="bg-surface-300/80 border border-surface-50 p-5 rounded-xl space-y-2">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>External System Integrations</span>
          </h4>
          {analysis.external_integrations.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono italic py-2">
              No third-party integrations detected.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {analysis.external_integrations.map((ext, idx) => (
                <li
                  key={idx}
                  className="text-xs font-mono text-slate-200 bg-surface-200/80 px-3 py-2 rounded-md border border-surface-50 flex items-center space-x-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>{ext}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 5. Ambiguities & Missing Information Inspection Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ambiguities */}
        <div className="bg-amber-950/20 border border-amber-800/40 p-5 rounded-xl space-y-2.5">
          <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Detected Ambiguities ({analysis.ambiguities.length})</span>
          </h4>
          {analysis.ambiguities.length === 0 ? (
            <p className="text-xs text-slate-400 font-mono italic">
              No unquantified buzzwords or ambiguous statements detected.
            </p>
          ) : (
            <ul className="space-y-2">
              {analysis.ambiguities.map((amb, idx) => (
                <li
                  key={idx}
                  className="text-xs font-mono text-amber-200 bg-amber-950/40 p-2.5 rounded-md border border-amber-800/50"
                >
                  {amb}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Missing Information */}
        <div className="bg-surface-300/80 border border-surface-50 p-5 rounded-xl space-y-2.5">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Missing Architectural Information</span>
          </h4>
          {analysis.missing_information.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono italic">
              All architectural parameters are fully specified.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {analysis.missing_information.map((m, idx) => (
                <li
                  key={idx}
                  className="text-xs font-mono text-slate-300 bg-surface-200/80 px-3 py-1.5 rounded-md border border-surface-50 flex items-center space-x-2"
                >
                  <span className="text-cyan-400">•</span>
                  <span className="capitalize">{m}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 6. Assumptions Section */}
      <div className="bg-surface-300/60 border border-surface-50 p-4 rounded-xl space-y-2">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
          Operational Assumptions (Non-Prescriptive)
        </h4>
        <ul className="space-y-1 text-xs text-slate-400 font-mono">
          {analysis.assumptions.map((a, idx) => (
            <li key={idx} className="flex items-start space-x-2">
              <span className="text-slate-600 font-bold">»</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom CTA to trigger Multi-Agent Review */}
      {onRunAgents && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-950/60 via-surface-300 to-indigo-950/40 border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white font-mono">
              Ready for Multi-Agent Architecture Review
            </h4>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Dispatches Architecture, Security, and Performance agents independently.
            </p>
          </div>
          <button
            onClick={onRunAgents}
            disabled={isRunningAgents || isReanalyzing}
            type="button"
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {isRunningAgents ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Review...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Run Architecture Review</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* 7. Collapsible Raw JSON Schema */}
      <div className="pt-2 border-t border-surface-50">
        <button
          type="button"
          onClick={() => setShowRawJson(!showRawJson)}
          className="text-xs font-mono text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showRawJson ? "Hide Raw JSON Specification" : "View Raw JSON Specification"}</span>
        </button>

        {showRawJson && (
          <pre className="mt-3 p-4 rounded-xl bg-surface-300 border border-surface-50 text-slate-300 text-xs font-mono overflow-x-auto max-h-96">
            {JSON.stringify(response, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
