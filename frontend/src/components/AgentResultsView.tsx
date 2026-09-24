"use client";

import React, { useState } from "react";
import { ProjectAgentResultsResponse, AgentOutput } from "@/lib/api";
import { AgentCard } from "./AgentCard";
import { Drawer } from "./ui/Drawer";
import { SectionHeader } from "./ui/SectionHeader";
import { StatusBadge } from "./ui/StatusBadge";
import {
  ArrowRight,
  Loader2,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Server,
  Radio,
} from "lucide-react";

interface AgentResultsViewProps {
  results: ProjectAgentResultsResponse;
  onRerunAgents?: () => void;
  isRerunning?: boolean;
  onRunReview?: () => void;
  isRunningReview?: boolean;
}

export function AgentResultsView({
  results,
  onRerunAgents,
  isRerunning = false,
  onRunReview,
  isRunningReview = false,
}: AgentResultsViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentOutput | null>(null);

  const agents: AgentOutput[] = [
    results.architecture,
    results.security,
    results.performance,
  ].filter(Boolean) as AgentOutput[];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <SectionHeader
          badge="Stage 3 • Specialized Agent Outputs"
          title="Independent AI Agent Proposals"
          description="Three specialized architects formulated domain-specific strategies in isolation. Inspect their independent recommendations before running conflict synthesis."
          actions={
            <div className="flex items-center gap-2">
              {onRerunAgents && (
                <button
                  type="button"
                  onClick={onRerunAgents}
                  disabled={isRerunning || isRunningReview}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRerunning ? "animate-spin" : ""}`} />
                  <span>{isRerunning ? "Re-Evaluating..." : "Re-Run Agents"}</span>
                </button>
              )}

              {onRunReview && (
                <button
                  type="button"
                  onClick={onRunReview}
                  disabled={isRunningReview || isRerunning}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs font-mono transition-all shadow-sm disabled:opacity-50"
                >
                  {isRunningReview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Adjudicating Decisions...</span>
                    </>
                  ) : (
                    <>
                      <span>Run Reviewer & Conflict Synthesis</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          }
        />

        {/* 3 Compact Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <AgentCard
              key={agent.agent_type}
              agent={agent}
              onViewDetails={(a) => setSelectedAgent(a)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Action Card */}
      {onRunReview && (
        <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-indigo-950 font-mono">
              Proceed to Conflict Detection & Adjudication
            </h4>
            <p className="text-xs text-indigo-900/80 mt-0.5">
              The Reviewer Agent identifies architectural trade-offs between these 3 proposals and grounds decisions in empirical RAG literature.
            </p>
          </div>
          <button
            type="button"
            onClick={onRunReview}
            disabled={isRunningReview || isRerunning}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm shrink-0 disabled:opacity-50"
          >
            {isRunningReview ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running Review...</span>
              </>
            ) : (
              <>
                <span>Run Reviewer & Synthesis</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Detailed Analysis Drawer */}
      <Drawer
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        title={selectedAgent?.summary ? `${selectedAgent.agent_type.toUpperCase()} Agent Analysis` : "Agent Analysis"}
        subtitle="Complete architectural decisions, proposed components, connections, and risks"
        widthClass="max-w-2xl"
      >
        {selectedAgent && (
          <div className="space-y-6">
            {/* Executive Summary */}
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-2">
                Executive Evaluation
              </h4>
              <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 p-4 rounded-xl leading-relaxed font-sans">
                {selectedAgent.summary}
              </p>
            </div>

            {/* Recommendations */}
            {selectedAgent.recommendations?.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-2">
                  Tactical Recommendations ({selectedAgent.recommendations.length})
                </h4>
                <div className="space-y-2">
                  {selectedAgent.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 bg-white border border-slate-200 rounded-lg text-xs font-sans text-slate-800 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decisions List */}
            {selectedAgent.decisions?.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-2">
                  Architectural Decisions ({selectedAgent.decisions.length})
                </h4>
                <div className="space-y-3">
                  {selectedAgent.decisions.map((d, i) => (
                    <div
                      key={i}
                      className="p-4 bg-white border border-slate-200 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono text-slate-900">
                          {d.decision}
                        </span>
                        <StatusBadge variant="default" size="sm">
                          {d.choice}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        <span className="font-semibold text-slate-700">Rationale: </span>
                        {d.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proposed Components */}
            {selectedAgent.components?.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-2">
                  Proposed Components ({selectedAgent.components.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedAgent.components.map((c, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 rounded text-slate-700">
                          {c.type}
                        </span>
                      </div>
                      {c.technology && (
                        <div className="text-[11px] font-mono text-indigo-700">
                          Tech: {c.technology}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-600 leading-tight">
                        {c.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risks & Mitigations */}
            {selectedAgent.risks?.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-2">
                  Identified Risks & Mitigations ({selectedAgent.risks.length})
                </h4>
                <div className="space-y-2.5">
                  {selectedAgent.risks.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-900 font-mono">
                          {r.title}
                        </span>
                        <StatusBadge variant="danger" size="sm">
                          {r.severity}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-rose-950 leading-relaxed">
                        <span className="font-semibold text-rose-800">Mitigation: </span>
                        {r.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
