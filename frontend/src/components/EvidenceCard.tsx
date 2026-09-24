"use client";

import React, { useState } from "react";
import { RetrievedEvidence } from "@/lib/api";
import { BookOpen, Copy, Check, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";

interface EvidenceCardProps {
  evidence: RetrievedEvidence;
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const relevancePct = Math.round(evidence.relevance_score * 100);

  const handleCopy = () => {
    navigator.clipboard.writeText(evidence.excerpt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-md">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{evidence.source}</span>
          </span>
          {evidence.section && (
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {evidence.section}
            </span>
          )}
        </div>

        <StatusBadge
          variant={relevancePct >= 80 ? "success" : "default"}
          size="sm"
        >
          {relevancePct}% Relevance
        </StatusBadge>
      </div>

      {/* Query */}
      {evidence.query && (
        <div className="text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
          <span className="font-semibold text-slate-700">Topic Query: </span>
          <span>{evidence.query}</span>
        </div>
      )}

      {/* Excerpt */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 relative">
        <p
          className={`text-xs text-slate-800 font-mono leading-relaxed whitespace-pre-wrap ${
            isExpanded ? "" : "line-clamp-4"
          }`}
        >
          {evidence.excerpt}
        </p>
      </div>

      {/* Footer / Toggle */}
      <div className="flex items-center justify-between pt-1 text-xs font-mono">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {isExpanded ? (
            <>
              <span>Collapse</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Expand Excerpt</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Copied</span>
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
