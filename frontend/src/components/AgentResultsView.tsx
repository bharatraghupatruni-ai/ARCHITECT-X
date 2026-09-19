"use client";

import React, { useState } from "react";
import { ProjectAgentResultsResponse } from "@/lib/api";
import { AgentCard } from "@/components/AgentCard";
import { Cpu, ShieldCheck, Zap, RefreshCw, ChevronDown, ChevronUp, Layers, CheckCircle2 } from "lucide-react";

interface AgentResultsViewProps {
  results: ProjectAgentResultsResponse;
  projectName?: string;
  onRerunAgents?: () => void;
  isRunningAgents?: boolean;
  onRunReview?: () => void;
  isRunningReview?: boolean;
}

export function AgentResultsView({
  results,
  projectName,
  onRerunAgents,
  isRunningAgents = false,
  onRunReview,
  isRunningReview = false,
}: AgentResultsViewProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "architecture" | "security" | "performance">("all");

  const { architecture, security, performance, created_at, status } = results;

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="bg-surface-200/90 border border-surface-50 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-mono font-semibold uppercase px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Phase 3 Multi-Agent Core
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>3 Agents Completed</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">
            {projectName ? `${projectName} — Multi-Agent Architecture Review` : "Multi-Agent Architecture Review"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Independent evaluations produced without cross-agent bias • Ready for Phase 4 Conflict Engine
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {onRerunAgents && (
            <button
              onClick={onRerunAgents}
              disabled={isRunningAgents || isRunningReview}
              type="button"
              className="px-3.5 py-2 text-xs font-mono text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningAgents ? "animate-spin" : ""}`} />
              <span>{isRunningAgents ? "Evaluating..." : "Re-Run Agents"}</span>
            </button>
          )}

          {onRunReview && (
            <button
              onClick={onRunReview}
              disabled={isRunningReview || isRunningAgents}
              type="button"
              className="px-4 py-2 text-xs font-mono font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 text-slate-950 ${isRunningReview ? "animate-spin" : ""}`} />
              <span>{isRunningReview ? "Synthesizing Review..." : "Run Reviewer & Conflict Engine"}</span>
            </button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center space-x-2 border-b border-surface-50 pb-2">
        <button
          onClick={() => setActiveTab("all")}
          type="button"
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            activeTab === "all"
              ? "bg-surface-100 text-white border border-surface-50 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          All 3 Agents (Grid)
        </button>
        {architecture && (
          <button
            onClick={() => setActiveTab("architecture")}
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === "architecture"
                ? "bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Architecture</span>
          </button>
        )}
        {security && (
          <button
            onClick={() => setActiveTab("security")}
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === "security"
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Security</span>
          </button>
        )}
        {performance && (
          <button
            onClick={() => setActiveTab("performance")}
            type="button"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center space-x-1.5 ${
              activeTab === "performance"
                ? "bg-amber-950/80 text-amber-300 border border-amber-800/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Performance</span>
          </button>
        )}
      </div>

      {/* Agents Cards Grid / Tab */}
      {activeTab === "all" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {architecture && <AgentCard agent={architecture} />}
          {security && <AgentCard agent={security} />}
          {performance && <AgentCard agent={performance} />}
        </div>
      ) : activeTab === "architecture" && architecture ? (
        <div className="max-w-3xl mx-auto">
          <AgentCard agent={architecture} />
        </div>
      ) : activeTab === "security" && security ? (
        <div className="max-w-3xl mx-auto">
          <AgentCard agent={security} />
        </div>
      ) : activeTab === "performance" && performance ? (
        <div className="max-w-3xl mx-auto">
          <AgentCard agent={performance} />
        </div>
      ) : null}

      {/* Collapsible Raw JSON Dump */}
      <div className="pt-4 border-t border-surface-50">
        <button
          type="button"
          onClick={() => setShowRawJson(!showRawJson)}
          className="text-xs font-mono text-slate-400 hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showRawJson ? "Hide Multi-Agent Raw JSON" : "View Multi-Agent Raw JSON Response"}</span>
        </button>

        {showRawJson && (
          <pre className="mt-3 p-4 rounded-xl bg-surface-300 border border-surface-50 text-slate-300 text-xs font-mono overflow-x-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
