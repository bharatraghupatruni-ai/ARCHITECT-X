"use client";

import React from "react";
import { ReviewDecision } from "@/lib/api";
import { StatusBadge } from "./ui/StatusBadge";
import { CheckCircle2, XCircle, AlertTriangle, BookOpen, Layers } from "lucide-react";

interface ReviewDecisionsViewProps {
  decisions: ReviewDecision[];
}

export function ReviewDecisionsView({ decisions }: ReviewDecisionsViewProps) {
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "success" as const;
      case "approved_with_conditions":
        return "warning" as const;
      case "overruled":
      case "rejected":
        return "danger" as const;
      default:
        return "default" as const;
    }
  };

  return (
    <div className="space-y-4">
      {decisions.map((decision, index) => (
        <div
          key={index}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-900 uppercase">
                {decision.category}
              </span>
              {decision.evidence_used && (
                <StatusBadge variant="success" size="sm">
                  Grounded in Literature
                </StatusBadge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {decision.evidence_confidence != null && (
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Confidence: {Math.round(decision.evidence_confidence * 100)}%
                </span>
              )}
              <StatusBadge variant={getStatusVariant(decision.review_status)} size="sm">
                {decision.review_status.replace(/_/g, " ")}
              </StatusBadge>
            </div>
          </div>

          {/* Chosen Option */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1">
            <div className="text-[11px] font-mono uppercase font-semibold text-slate-500">
              Adjudicated Technology Choice
            </div>
            <div className="text-sm font-semibold font-mono text-slate-900">
              {decision.chosen_option}
            </div>
          </div>

          {/* Rationale ("Why") */}
          <div>
            <div className="text-xs font-mono font-semibold text-slate-700 mb-1">
              Engineering Rationale (Why):
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              {decision.rationale}
            </p>
          </div>

          {/* Evidence Callout */}
          {decision.evidence_summary && (
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-800">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Empirical Literature Evidence:</span>
              </div>
              <p className="text-xs text-emerald-950 leading-relaxed font-sans">
                {decision.evidence_summary}
              </p>
              {decision.evidence_sources && decision.evidence_sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-emerald-200/50 text-[11px] font-mono text-emerald-800">
                  <span className="font-semibold">Sources:</span>
                  {decision.evidence_sources.map((src, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-emerald-100/70 border border-emerald-200 text-emerald-900"
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
            <div>
              <div className="text-xs font-mono font-semibold text-slate-700 mb-1.5">
                Evaluated & Rejected Alternatives:
              </div>
              <div className="flex flex-wrap gap-2">
                {decision.rejected_options.map((opt, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs font-mono text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-md"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{opt}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trade-offs */}
          {decision.trade_offs && decision.trade_offs.length > 0 && (
            <div>
              <div className="text-xs font-mono font-semibold text-slate-700 mb-1.5">
                Accepted Trade-Offs:
              </div>
              <div className="space-y-1.5">
                {decision.trade_offs.map((to, i) => (
                  <div
                    key={i}
                    className="text-xs text-amber-900 bg-amber-50 border border-amber-200/80 p-2.5 rounded-lg flex items-start gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned Components */}
          {decision.assigned_to_components && decision.assigned_to_components.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs font-mono text-slate-500">
              <span className="font-semibold">Assigned Components:</span>
              {decision.assigned_to_components.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
