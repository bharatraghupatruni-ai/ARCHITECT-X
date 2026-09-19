"use client";

import React from "react";
import { ReviewDecision } from "@/lib/api";

interface ReviewDecisionsViewProps {
  decisions: ReviewDecision[];
}

export function ReviewDecisionsView({ decisions }: ReviewDecisionsViewProps) {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "approved_with_conditions":
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
      case "overruled":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400";
      default:
        return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
    }
  };

  return (
    <div className="space-y-4">
      {decisions.map((decision, index) => (
        <div
          key={index}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 shadow-lg shadow-black/20"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                {decision.category}
              </span>
              {decision.evidence_used ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Grounded in Literature
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                  Zero Forced Evidence
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {decision.evidence_confidence != null && (
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                  Confidence: {Math.round(decision.evidence_confidence * 100)}%
                </span>
              )}
              <span
                className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${getStatusBadge(
                  decision.review_status
                )}`}
              >
                {decision.review_status.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Chosen Option Banner */}
          <div className="bg-slate-950/80 rounded-lg p-3.5 border border-slate-800 mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Authoritative Choice
              </p>
            </div>
            <p className="text-base font-semibold text-emerald-300 font-mono">
              {decision.chosen_option}
            </p>
          </div>

          {/* Rationale */}
          <div className="mb-4">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Engineering Rationale
            </p>
            <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800/50">
              {decision.rationale}
            </p>
          </div>

          {/* Evidence Literature Callout (Phase 5 Grounding) */}
          {decision.evidence_summary && (
            <div className="mb-4 bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 text-xs">📖</span>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                    Empirical Knowledge Base Grounding
                  </p>
                </div>
                {decision.evidence_sources && decision.evidence_sources.length > 0 && (
                  <span className="text-[10px] font-mono text-emerald-300/80">
                    {decision.evidence_sources.length} Cited Source{decision.evidence_sources.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/90 leading-relaxed font-sans mb-2">
                {decision.evidence_summary}
              </p>

              {decision.evidence_sources && decision.evidence_sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-emerald-900/30">
                  <span className="text-[10px] font-mono text-emerald-400/80">Citations:</span>
                  {decision.evidence_sources.map((src, srcIdx) => (
                    <span
                      key={srcIdx}
                      className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rejected Alternatives */}
          {decision.rejected_options && decision.rejected_options.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Evaluated & Rejected Alternatives
              </p>
              <div className="flex flex-wrap gap-2">
                {decision.rejected_options.map((opt, optIdx) => (
                  <span
                    key={optIdx}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-rose-300/90 bg-rose-950/30 border border-rose-900/40 px-2.5 py-1 rounded-md line-through"
                  >
                    <span>✕</span>
                    <span>{opt}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Accepted Trade-offs */}
          {decision.trade_offs && decision.trade_offs.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Accepted Secondary Trade-Offs
              </p>
              <ul className="space-y-1">
                {decision.trade_offs.map((to, toIdx) => (
                  <li
                    key={toIdx}
                    className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-900/30 p-2 rounded-md flex items-start gap-2"
                  >
                    <span className="text-amber-400 mt-0.5">⚠️</span>
                    <span>{to}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Impacted Components */}
          {decision.assigned_to_components && decision.assigned_to_components.length > 0 && (
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                Assigned Components:
              </span>
              {decision.assigned_to_components.map((comp, compIdx) => (
                <span
                  key={compIdx}
                  className="text-xs font-mono text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded"
                >
                  {comp}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
