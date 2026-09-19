"use client";

import React, { useState } from "react";
import { RetrievedEvidence } from "@/lib/api";
import { BookOpen, Copy, Check, Search, FileText } from "lucide-react";

interface EvidenceCardProps {
  evidence: RetrievedEvidence;
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const [copied, setCopied] = useState(false);

  const getScoreBadge = (score: number) => {
    const pct = Math.round(score * 100);
    if (pct >= 85) {
      return {
        text: `${pct}% Relevance`,
        style: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        indicator: "bg-emerald-400",
      };
    } else if (pct >= 65) {
      return {
        text: `${pct}% Relevance`,
        style: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
        indicator: "bg-cyan-400",
      };
    } else {
      return {
        text: `${pct}% Relevance`,
        style: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        indicator: "bg-amber-400",
      };
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(evidence.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scoreBadge = getScoreBadge(evidence.relevance_score);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 shadow-lg shadow-black/20 flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-indigo-300 bg-indigo-950/50 px-2.5 py-1 rounded border border-indigo-800/50">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>{evidence.source}</span>
            </span>
            {evidence.section && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                {evidence.section}
              </span>
            )}
          </div>

          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${scoreBadge.style}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${scoreBadge.indicator}`}></span>
            <span>{scoreBadge.text}</span>
          </span>
        </div>

        {/* Trigger Query Context */}
        {evidence.query && (
          <div className="flex items-start gap-1.5 mb-3 text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
            <span className="text-slate-400 font-mono text-[11px] leading-snug">
              Query: <strong className="text-slate-300 font-normal">{evidence.query}</strong>
            </span>
          </div>
        )}

        {/* Verbatim Excerpt */}
        <div className="bg-slate-950/90 rounded-lg p-3.5 border border-slate-800/70 mb-2 relative group">
          <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {evidence.excerpt}
          </pre>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-3 pt-2.5 flex items-center justify-between border-t border-slate-800/60 text-xs font-mono">
        <span className="text-slate-500 text-[11px] flex items-center gap-1">
          <FileText className="w-3 h-3" />
          <span>Empirical RAG Vector Chunk</span>
        </span>
        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
          title="Copy excerpt to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
