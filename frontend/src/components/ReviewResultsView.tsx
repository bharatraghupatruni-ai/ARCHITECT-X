"use client";

import React, { useState } from "react";
import { ReviewRunResponse } from "@/lib/api";
import { ConflictCard } from "./ConflictCard";
import { ReviewDecisionsView } from "./ReviewDecisionsView";
import { EvidenceCard } from "./EvidenceCard";

interface ReviewResultsViewProps {
  review: ReviewRunResponse;
  onRerunReview?: () => void;
  isLoading?: boolean;
  onGenerateExplainability?: () => void;
  isGeneratingExplainability?: boolean;
}

type TabType = "overview" | "evidence" | "conflicts" | "decisions" | "tradeoffs" | "risks" | "actions" | "raw_json";

export function ReviewResultsView({
  review,
  onRerunReview,
  isLoading = false,
  onGenerateExplainability,
  isGeneratingExplainability = false,
}: ReviewResultsViewProps) {

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [copied, setCopied] = useState(false);

  const output = review.output;
  const conflicts = review.conflicts || [];
  const decisions = output?.adjudicated_decisions || [];
  const tradeoffs = output?.trade_off_analysis || [];
  const risks = output?.synthesis_risks || [];
  const actionItems = output?.action_items || [];
  const keyFindings = output?.key_findings || [];
  const evidenceList = output?.retrieved_evidence || review.retrieved_evidence || [];

  const groundedDecisionsCount = decisions.filter((d) => d.evidence_used).length;

  const getVerdictStyle = (verdict?: string) => {
    switch (verdict?.toUpperCase()) {
      case "APPROVED":
        return {
          banner: "bg-emerald-950/30 border-emerald-500/40 text-emerald-300",
          badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
          glow: "from-emerald-500/10",
        };
      case "APPROVED WITH CONDITIONS":
        return {
          banner: "bg-amber-950/30 border-amber-500/40 text-amber-300",
          badge: "bg-amber-500/20 text-amber-300 border-amber-500/50",
          glow: "from-amber-500/10",
        };
      case "REVISE ARCHITECTURE":
        return {
          banner: "bg-rose-950/30 border-rose-500/40 text-rose-300",
          badge: "bg-rose-500/20 text-rose-300 border-rose-500/50",
          glow: "from-rose-500/10",
        };
      default:
        return {
          banner: "bg-cyan-950/30 border-cyan-500/40 text-cyan-300",
          badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/50",
          glow: "from-cyan-500/10",
        };
    }
  };

  const getRiskSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      case "high":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "medium":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-400";
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(review, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verdictStyle = getVerdictStyle(output?.overall_verdict);

  return (
    <div className="space-y-6">
      {/* 1. Header & Verdict Banner */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 md:p-8 bg-gradient-to-b ${verdictStyle.glow} to-slate-900/90 ${verdictStyle.banner} shadow-2xl backdrop-blur-sm`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/50">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Phase 5 Evidence-Grounded Synthesis
              </span>
              <span className="text-xs font-mono text-slate-400">
                ID: {review.id.slice(0, 8)}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">
              Principal Architect Review & Evidence Synthesis
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-xl border text-sm md:text-base font-mono font-bold tracking-wide shadow-lg ${verdictStyle.badge}`}
            >
              {output?.overall_verdict || "SYNTHESIS EVALUATION"}
            </div>

            {onRerunReview && (
              <button
                onClick={onRerunReview}
                disabled={isLoading}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-lg border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-2"
                title="Re-run architecture review"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Re-Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive Summary */}
        <div className="pt-5">
          <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans">
            {output?.summary || review.summary}
          </p>
        </div>

        {/* Synthesis Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-800/60">
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              RAG Citations
            </p>
            <p className="text-2xl font-bold text-emerald-400 font-mono mt-0.5">
              {evidenceList.length}
            </p>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Detected Conflicts
            </p>
            <p className="text-2xl font-bold text-cyan-400 font-mono mt-0.5">
              {conflicts.length}
            </p>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Grounded Decisions
            </p>
            <p className="text-2xl font-bold text-indigo-400 font-mono mt-0.5">
              {groundedDecisionsCount}/{decisions.length}
            </p>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Trade-Offs
            </p>
            <p className="text-2xl font-bold text-amber-400 font-mono mt-0.5">
              {tradeoffs.length}
            </p>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Synthesized Risks
            </p>
            <p className="text-2xl font-bold text-rose-400 font-mono mt-0.5">
              {risks.length}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "overview", label: "Executive Synthesis", count: null },
          { id: "evidence", label: "Grounding Literature", count: evidenceList.length },
          { id: "conflicts", label: "Detected Conflicts", count: conflicts.length },
          { id: "decisions", label: "Adjudicated Decisions", count: decisions.length },
          { id: "tradeoffs", label: "Trade-Off Analysis", count: tradeoffs.length },
          { id: "risks", label: "Risk Matrix", count: risks.length },
          { id: "actions", label: "Action Items", count: actionItems.length },
          { id: "raw_json", label: "Raw JSON Audit", count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all shrink-0 flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  activeTab === tab.id
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 3. Tab Contents */}

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Findings */}
          {keyFindings.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-semibold">
                  Key Architectural Insights & Synthesis Findings
                </h3>
              </div>
              <ul className="space-y-2.5">
                {keyFindings.map((finding, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-200 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800/60"
                  >
                    <span className="text-cyan-400 font-mono text-xs mt-0.5 font-bold">
                      0{idx + 1}.
                    </span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence Literature Preview */}
          {evidenceList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Retrieved Architectural Literature & Evidence Grounding ({evidenceList.length})
                </h3>
                <button
                  onClick={() => setActiveTab("evidence")}
                  className="text-xs font-mono text-emerald-400 hover:text-emerald-300 hover:underline"
                >
                  View all literature →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evidenceList.slice(0, 2).map((item, idx) => (
                  <EvidenceCard key={idx} evidence={item} />
                ))}
              </div>
            </div>
          )}

          {/* Top Conflicts Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Detected Architectural Disagreements & Tensions ({conflicts.length})
              </h3>
              <button
                onClick={() => setActiveTab("conflicts")}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conflicts.slice(0, 4).map((c, idx) => (
                <ConflictCard key={c.id || idx} conflict={c} />
              ))}
            </div>
          </div>

          {/* Decisions Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Authoritative Adjudicated Decisions ({decisions.length})
              </h3>
              <button
                onClick={() => setActiveTab("decisions")}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                View all →
              </button>
            </div>
            <ReviewDecisionsView decisions={decisions.slice(0, 2)} />
          </div>

          {/* Action Items Preview */}
          {actionItems.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  Immediate Engineering Action Items
                </h3>
                <button
                  onClick={() => setActiveTab("actions")}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  View all →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {actionItems.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-slate-200 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80"
                  >
                    <span className="text-indigo-400 font-mono font-bold mt-0.5">
                      ✓
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence Tab */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span className="text-emerald-400">📚</span>
                Empirical Technical Knowledge Base & Vector Retrieval
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Curated architectural literature ingested and retrieved to substantiate Reviewer decisions and resolve cross-agent tensions.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-800/50">
                {evidenceList.length} Ingested Reference{evidenceList.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {evidenceList.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
              <p className="text-sm text-slate-400 font-mono">
                No technical literature was queried or retrieved for this review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evidenceList.map((item, idx) => (
                <EvidenceCard key={idx} evidence={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conflicts Tab */}
      {activeTab === "conflicts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-slate-400">
              Disagreements, trade-offs, and risk disparities identified across Architecture, Security, and Performance agents.
            </p>
            <span className="text-xs font-mono text-slate-500">
              {conflicts.length} Tensions Cataloged
            </span>
          </div>

          {conflicts.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-800">
              <p className="text-sm text-slate-400 font-mono">
                No architectural conflicts detected among agent evaluations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conflicts.map((c, idx) => (
                <ConflictCard key={c.id || idx} conflict={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decisions Tab */}
      {activeTab === "decisions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-slate-400">
              Authoritative technical choices adjudicated by Principal Architect with empirical knowledge grounding.
            </p>
            <span className="text-xs font-mono text-slate-500">
              {decisions.length} Decisions Formulated
            </span>
          </div>
          <ReviewDecisionsView decisions={decisions} />
        </div>
      )}

      {/* Tradeoffs Tab */}
      {activeTab === "tradeoffs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-slate-400">
              Rigorous comparative analysis of conflicting architecture parameters (Latency vs. Security, Consistency vs. Throughput).
            </p>
            <span className="text-xs font-mono text-slate-500">
              {tradeoffs.length} Dimensions Analyzed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tradeoffs.map((to, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                      {to.category}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-100">
                      {to.name}
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    Impact: <strong className="text-amber-300">{to.impact_score}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {/* Pros */}
                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-2">
                      Architectural Advantages (Pros)
                    </p>
                    <ul className="space-y-1.5">
                      {to.pros.map((p, pIdx) => (
                        <li
                          key={pIdx}
                          className="text-xs text-emerald-200/90 flex items-start gap-1.5"
                        >
                          <span className="text-emerald-400">✓</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons */}
                  <div className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg">
                    <p className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold mb-2">
                      Operational Burdens & Risks (Cons)
                    </p>
                    <ul className="space-y-1.5">
                      {to.cons.map((c, cIdx) => (
                        <li
                          key={cIdx}
                          className="text-xs text-rose-200/90 flex items-start gap-1.5"
                        >
                          <span className="text-rose-400">✕</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Synthesis Recommendation */}
                <div className="bg-cyan-950/30 border border-cyan-800/40 p-3 rounded-lg">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold mb-1">
                    Reviewer Synthesis Recommendation
                  </p>
                  <p className="text-xs text-cyan-100/90 leading-relaxed">
                    {to.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks Tab */}
      {activeTab === "risks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-slate-400">
              Consolidated and prioritized risk matrix across all architectural disciplines.
            </p>
            <span className="text-xs font-mono text-slate-500">
              {risks.length} Synthesized Risks
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {risks.map((risk, idx) => (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${getRiskSeverityBadge(
                        risk.severity
                      )}`}
                    >
                      {risk.severity}
                    </span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {risk.category.toUpperCase()}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-200">
                      {risk.title}
                    </h4>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800 mb-3">
                  {risk.description}
                </p>

                <div className="bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-lg">
                  <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                    Mandated Mitigation
                  </p>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    {risk.mitigation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-slate-400">
              Mandatory engineering roadmap items before initiating detailed design and infrastructure provisioning.
            </p>
            <span className="text-xs font-mono text-slate-500">
              {actionItems.length} Checklist Items
            </span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            {actionItems.map((action, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 hover:border-slate-700 transition-all"
              >
                <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold shrink-0 mt-0.5">
                  0{idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-200 leading-relaxed">
                    {action}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/40 shrink-0">
                  PENDING ACTION
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON Audit Tab */}
      {activeTab === "raw_json" && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 relative shadow-2xl">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400">
              ReviewRun JSON Record (ID: {review.id})
            </span>
            <button
              onClick={handleCopyJson}
              className="text-xs font-mono px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              {copied ? (
                <>
                  <span className="text-emerald-400">✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
          <pre className="text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-[500px] p-2 leading-relaxed">
            {JSON.stringify(review, null, 2)}
          </pre>
        </div>
      )}

      {/* Phase 6 Call-To-Action Banner */}
      {onGenerateExplainability && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-surface-200 to-cyan-950/70 border border-indigo-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <h4 className="text-sm font-bold text-white font-mono">
                Proceed to Phase 6 — Decision & Explainability Engine
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              Generate formalized MADR Architecture Decision Records & interactive 3-tier C4 Model Diagrams.
            </p>
          </div>

          <button
            onClick={onGenerateExplainability}
            disabled={isGeneratingExplainability}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold transition-all shadow-lg shadow-indigo-600/30 flex-shrink-0 disabled:opacity-50"
          >
            {isGeneratingExplainability ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Synthesizing ADRs & C4...</span>
              </>
            ) : (
              <>
                <span>Generate ADRs & C4 Visualizer →</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}


