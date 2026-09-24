"use client";

import React, { useState } from "react";
import { ReviewRunResponse } from "@/lib/api";
import { ConflictCard } from "./ConflictCard";
import { ReviewDecisionsView } from "./ReviewDecisionsView";
import { EvidenceCard } from "./EvidenceCard";
import { StatusBadge } from "./ui/StatusBadge";
import { SectionHeader } from "./ui/SectionHeader";
import {
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Layers,
  ArrowRight,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface ReviewResultsViewProps {
  review: ReviewRunResponse;
  onRerunReview?: () => void;
  isLoading?: boolean;
  onProceedToArchitecture?: () => void;
}

type ReviewTab = "conflicts" | "decisions" | "tradeoffs" | "evidence";

export function ReviewResultsView({
  review,
  onRerunReview,
  isLoading = false,
  onProceedToArchitecture,
}: ReviewResultsViewProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>("conflicts");

  const output = review.output;
  const conflicts = review.conflicts || [];
  const decisions = output?.adjudicated_decisions || [];
  const tradeoffs = output?.trade_off_analysis || [];
  const risks = output?.synthesis_risks || [];
  const keyFindings = output?.key_findings || [];
  const evidenceList = output?.retrieved_evidence || review.retrieved_evidence || [];

  const getVerdictBadge = (verdict?: string) => {
    switch (verdict?.toUpperCase()) {
      case "APPROVED":
        return <StatusBadge variant="success" size="lg">APPROVED</StatusBadge>;
      case "APPROVED WITH CONDITIONS":
        return <StatusBadge variant="warning" size="lg">APPROVED WITH CONDITIONS</StatusBadge>;
      case "REVISE ARCHITECTURE":
        return <StatusBadge variant="danger" size="lg">REVISE ARCHITECTURE</StatusBadge>;
      default:
        return <StatusBadge variant="default" size="lg">{verdict || "REVIEWED"}</StatusBadge>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Verdict */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <SectionHeader
          title="Principal Architecture Review"
          description="Authoritative technical synthesis weighing agent trade-offs, adjudicating conflicts, and grounding decisions in empirical documentation."
          actions={
            <div className="flex items-center gap-2">
              {onRerunReview && (
                <button
                  type="button"
                  onClick={onRerunReview}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-sans text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>{isLoading ? "Re-Evaluating..." : "Re-Run Review"}</span>
                </button>
              )}

              {onProceedToArchitecture && (
                <button
                  type="button"
                  onClick={onProceedToArchitecture}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs font-sans transition-all shadow-xs"
                >
                  <span>Open Architecture Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          }
        />

        {/* Verdict Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase text-slate-500 font-sans">
                Review Verdict:
              </span>
              {getVerdictBadge(output?.overall_verdict)}
            </div>
            <span className="text-xs text-slate-500 font-sans">
              {conflicts.length} Conflicts Adjudicated • {decisions.length} Decisions Grounded
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
            {output?.summary || review.summary}
          </p>

          {/* Key Findings List */}
          {keyFindings.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-700 uppercase font-sans">
                Key Findings:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {keyFindings.map((kf, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-sans text-slate-800 flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{kf}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visual Sequence Bar */}
        <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-lg flex items-center justify-between overflow-x-auto text-xs font-sans text-slate-600 gap-2">
          <span className="flex items-center gap-1.5 shrink-0 text-slate-800 font-semibold">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>Agent Opinions</span>
          </span>
          <span className="text-slate-400">→</span>
          <span className="flex items-center gap-1.5 shrink-0 text-slate-800 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Conflicts Detected ({conflicts.length})</span>
          </span>
          <span className="text-slate-400">→</span>
          <span className="flex items-center gap-1.5 shrink-0 text-slate-800 font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Evidence Grounding ({evidenceList.length})</span>
          </span>
          <span className="text-slate-400">→</span>
          <span className="flex items-center gap-1.5 shrink-0 text-indigo-700 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Final Decisions ({decisions.length})</span>
          </span>
        </div>
      </div>

      {/* Reviewer Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto font-sans text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("conflicts")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === "conflicts"
              ? "border-indigo-600 text-indigo-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Architectural Conflicts ({conflicts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("decisions")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === "decisions"
              ? "border-indigo-600 text-indigo-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Final Decisions ({decisions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("evidence")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === "evidence"
              ? "border-indigo-600 text-indigo-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Retrieved Evidence ({evidenceList.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tradeoffs")}
          className={`px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeTab === "tradeoffs"
              ? "border-indigo-600 text-indigo-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Trade-offs & Risks ({tradeoffs.length + risks.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "conflicts" && (
        <div className="space-y-4">
          {conflicts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
              No architectural conflicts detected among agent proposals.
            </div>
          ) : (
            conflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))
          )}
        </div>
      )}

      {activeTab === "decisions" && (
        <ReviewDecisionsView decisions={decisions} />
      )}

      {activeTab === "evidence" && (
        <div className="space-y-4">
          {evidenceList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
              No empirical RAG evidence required for this evaluation.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {evidenceList.map((e, idx) => (
                <EvidenceCard key={idx} evidence={e} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "tradeoffs" && (
        <div className="space-y-4">
          {tradeoffs.map((t, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs sm:text-sm font-bold text-slate-900 font-sans">
                  {t.name}
                </span>
                <StatusBadge variant="default" size="sm">
                  {t.category} • Impact: {t.impact_score}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-lg space-y-1">
                  <div className="text-xs font-semibold text-emerald-800">
                    Advantages:
                  </div>
                  <ul className="text-xs text-emerald-950 space-y-1 list-disc pl-4">
                    {t.pros?.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-lg space-y-1">
                  <div className="text-xs font-semibold text-amber-800">
                    Trade-offs Accepted:
                  </div>
                  <ul className="text-xs text-amber-950 space-y-1 list-disc pl-4">
                    {t.cons?.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-semibold text-slate-800">
                  Recommendation:{" "}
                </span>
                <span className="text-slate-700">{t.recommendation}</span>
              </div>
            </div>
          ))}

          {risks.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase text-slate-700">
                Synthesis Risks ({risks.length}):
              </h4>
              <div className="space-y-2.5">
                {risks.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-white border border-slate-200 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {r.title}
                      </span>
                      <StatusBadge
                        variant={r.severity.toLowerCase() === "high" || r.severity.toLowerCase() === "critical" ? "danger" : "warning"}
                        size="sm"
                      >
                        {r.severity}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-slate-600">{r.description}</p>
                    <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700">Mitigation: </span>
                      {r.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      {onProceedToArchitecture && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-sans">
              Proceed to System Architecture
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Explore the interactive system topology graph and inspect component security boundaries.
            </p>
          </div>
          <button
            type="button"
            onClick={onProceedToArchitecture}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs font-sans transition-all shadow-xs shrink-0"
          >
            <span>Open Architecture Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
