"use client";

import React, { useState } from "react";
import {
  ADRRecord,
  ADRExportResponse,
  api,
} from "@/lib/api";
import {
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Shield,
  BookOpen,
  Copy,
  Check,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ExternalLink,
} from "lucide-react";

interface ADRViewerProps {
  adrs: ADRRecord[];
  projectId: string;
  projectName?: string;
}

export function ADRViewer({ adrs, projectId, projectName }: ADRViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedAdrId, setExpandedAdrId] = useState<string | null>(adrs[0]?.id || null);
  const [viewMode, setViewMode] = useState<Record<string, "structured" | "markdown">>({});
  const [copiedAdrId, setCopiedAdrId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Extract categories
  const categories = Array.from(new Set(adrs.map((a) => a.category))).filter(Boolean);

  const filteredAdrs = adrs.filter((adr) => {
    const matchesCategory = selectedCategory === "all" || adr.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      adr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adr.decision.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adr.context.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adr.adr_id_formatted.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopyMarkdown = (adrId: string, markdown: string) => {
    navigator.clipboard.writeText(markdown);
    setCopiedAdrId(adrId);
    setTimeout(() => setCopiedAdrId(null), 2000);
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const res: ADRExportResponse = await api.exportADRs(projectId);
      const blob = new Blob([res.bundled_markdown], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ADR-BUNDLE-${projectName || "ARCHITECT-X"}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to export ADR bundle:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleViewMode = (adrId: string) => {
    setViewMode((prev) => ({
      ...prev,
      [adrId]: prev[adrId] === "markdown" ? "structured" : "markdown",
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-100/70 border border-surface-50">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 mr-2">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Category:</span>
          </div>
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedCategory === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            All ({adrs.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-surface-200 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search ADRs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-200/90 border border-surface-50 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Export button */}
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-700/60 text-indigo-300 text-xs font-mono transition-all flex-shrink-0 disabled:opacity-50"
            title="Export all ADRs as a unified Markdown bundle"
          >
            {exportSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Bundle Downloaded</span>
              </>
            ) : isExporting ? (
              <>
                <Download className="w-3.5 h-3.5 animate-bounce" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export ADRs (.md)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ADR Records List */}
      <div className="space-y-4">
        {filteredAdrs.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-surface-100/40 border border-surface-50 text-slate-500 font-mono text-xs">
            No Architecture Decision Records found matching your filter criteria.
          </div>
        ) : (
          filteredAdrs.map((adr) => {
            const isExpanded = expandedAdrId === adr.id;
            const isMarkdown = viewMode[adr.id] === "markdown";
            const isCopied = copiedAdrId === adr.id;

            return (
              <div
                key={adr.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? "bg-surface-100/90 border-indigo-500/50 shadow-xl shadow-indigo-950/20"
                    : "bg-surface-100/50 border-surface-50 hover:border-surface-50/80"
                }`}
              >
                {/* Collapsible Header */}
                <div
                  onClick={() => setExpandedAdrId(isExpanded ? null : adr.id)}
                  className="p-4 sm:p-5 flex items-start justify-between cursor-pointer select-none space-x-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-950 border border-indigo-800/80 text-indigo-300">
                        {adr.adr_id_formatted}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-surface-200 text-slate-300 border border-surface-50">
                        {adr.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          adr.status.toLowerCase() === "accepted"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                            : "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                        }`}
                      >
                        {adr.status}
                      </span>
                      {adr.evidence_citations && adr.evidence_citations.length > 0 && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/70 border border-cyan-800/50 text-cyan-300">
                          <BookOpen className="w-3 h-3 text-cyan-400" />
                          <span>{adr.evidence_citations.length} Grounded Citations</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-mono leading-snug">
                      {adr.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1 font-sans">
                      {adr.decision}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 pt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyMarkdown(adr.id, adr.markdown_content);
                      }}
                      className="p-1.5 rounded-lg bg-surface-200/80 hover:bg-surface-300 border border-surface-50 text-slate-400 hover:text-white transition-all"
                      title="Copy ADR Markdown (MADR format)"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <div className="text-slate-400 p-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Body */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-surface-50/80 space-y-6">
                    {/* View Switcher: Structured UI vs Raw MADR Markdown */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-slate-400">
                        Formalized MADR Architectural Specification
                      </div>
                      <button
                        onClick={() => toggleViewMode(adr.id)}
                        className="px-2.5 py-1 rounded bg-surface-200 hover:bg-surface-300 border border-surface-50 text-[11px] font-mono text-indigo-300 transition-all flex items-center space-x-1"
                      >
                        <FileCode className="w-3 h-3" />
                        <span>{isMarkdown ? "Show Visual Breakdown" : "View Raw MADR (.md)"}</span>
                      </button>
                    </div>

                    {isMarkdown ? (
                      /* Raw MADR Markdown View */
                      <div className="relative">
                        <pre className="p-4 rounded-xl bg-surface-300/90 border border-surface-50 text-xs font-mono text-slate-200 whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-96 overflow-y-auto">
                          {adr.markdown_content}
                        </pre>
                        <button
                          onClick={() => handleCopyMarkdown(adr.id, adr.markdown_content)}
                          className="absolute top-3 right-3 px-2.5 py-1 rounded bg-surface-200 hover:bg-surface-100 border border-surface-50 text-[11px] font-mono text-slate-300 flex items-center space-x-1"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Copy Markdown</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Structured Visual Breakdown */
                      <div className="space-y-5">
                        {/* Context & Problem Statement */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                            Context & Problem Statement
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-surface-200/40 p-3.5 rounded-lg border border-surface-50/60 font-sans">
                            {adr.context}
                          </p>
                        </div>

                        {/* Decision Outcome */}
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                            Decision Outcome
                          </h4>
                          <div className="p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs sm:text-sm text-indigo-100 font-sans leading-relaxed">
                            {adr.decision}
                          </div>
                        </div>

                        {/* Consequences (Positive vs Negative) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Positive Consequences */}
                          <div className="space-y-2 p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center space-x-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Positive Consequences</span>
                            </h4>
                            <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                              {adr.consequences_positive.map((pos, pIdx) => (
                                <li key={pIdx} className="flex items-start space-x-2">
                                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                                  <span>{pos}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Negative Consequences & Mitigations */}
                          <div className="space-y-2 p-3.5 rounded-lg bg-rose-950/20 border border-rose-800/40">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold flex items-center space-x-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Trade-offs & Operational Costs</span>
                            </h4>
                            <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                              {adr.consequences_negative.map((neg, nIdx) => (
                                <li key={nIdx} className="flex items-start space-x-2">
                                  <span className="text-rose-400 font-bold mt-0.5">•</span>
                                  <span>{neg}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Security, Compliance & Blast Radius */}
                        {adr.compliance_and_security && (
                          <div className="space-y-1.5 p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center space-x-1.5">
                              <Shield className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Security, Compliance & Blast Radius Isolation</span>
                            </h4>
                            <p className="text-xs text-slate-300 font-sans leading-relaxed">
                              {adr.compliance_and_security}
                            </p>
                          </div>
                        )}

                        {/* Literature Citations */}
                        {adr.evidence_citations && adr.evidence_citations.length > 0 && (
                          <div className="space-y-2 pt-1">
                            <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center space-x-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Grounding Technical Evidence & Citations</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {adr.evidence_citations.map((cite, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-cyan-300 font-mono">
                                      {cite.source}
                                    </span>
                                    <span className="text-[10px] font-mono text-emerald-400">
                                      Score: {Math.round(cite.relevance_score * 100)}%
                                    </span>
                                  </div>
                                  {cite.section && (
                                    <div className="text-[11px] text-cyan-400 font-mono">
                                      Section: {cite.section}
                                    </div>
                                  )}
                                  <p className="text-[11px] text-slate-300 italic">
                                    "{cite.excerpt}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
