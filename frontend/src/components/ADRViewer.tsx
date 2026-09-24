"use client";

import React, { useState } from "react";
import { ADRRecord, ADRExportResponse, api } from "@/lib/api";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Copy,
  Check,
  Download,
  Search,
  Filter,
  ArrowUpRight,
} from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";
import { Drawer } from "./ui/Drawer";

interface ADRViewerProps {
  adrs: ADRRecord[];
  projectId: string;
  projectName?: string;
}

export function ADRViewer({ adrs, projectId, projectName }: ADRViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [selectedAdr, setSelectedAdr] = useState<ADRRecord | null>(null);
  const [copiedAdrId, setCopiedAdrId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

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
    } catch (err) {
      console.error("Failed to export ADR bundle:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Category:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedCategory === "all"
                ? "bg-indigo-600 text-white font-semibold"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
            }`}
          >
            All ({adrs.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all capitalize ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white font-semibold"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ADRs..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={handleExportAll}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Bundle</span>
          </button>
        </div>
      </div>

      {/* ADR Decision Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAdrs.map((adr) => (
          <div
            key={adr.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {adr.adr_id_formatted}
                  </span>
                  <StatusBadge variant="neutral" size="sm">
                    {adr.category}
                  </StatusBadge>
                </div>
                <StatusBadge variant="success" size="sm">
                  {adr.status}
                </StatusBadge>
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-slate-900 font-mono line-clamp-1">
                {adr.title}
              </h3>

              {/* Decision */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-1">
                <div className="text-[11px] font-mono font-semibold uppercase text-slate-500">
                  Decision
                </div>
                <p className="text-xs text-slate-800 font-sans leading-relaxed line-clamp-2">
                  {adr.decision}
                </p>
              </div>

              {/* Context Summary */}
              <p className="text-xs text-slate-600 font-sans leading-relaxed line-clamp-2">
                <span className="font-semibold text-slate-700">Context: </span>
                {adr.context}
              </p>

              {/* Consequences Badges */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  +{adr.consequences_positive?.length || 0} Benefits
                </span>
                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  -{adr.consequences_negative?.length || 0} Trade-offs
                </span>
                {adr.evidence_citations?.length > 0 && (
                  <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {adr.evidence_citations.length} Citations
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedAdr(adr)}
                className="inline-flex items-center gap-1 text-xs font-mono text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <span>View Full ADR</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleCopyMarkdown(adr.id, adr.markdown_content)}
                className="text-xs font-mono text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
              >
                {copiedAdrId === adr.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Full ADR Drawer */}
      <Drawer
        isOpen={!!selectedAdr}
        onClose={() => setSelectedAdr(null)}
        title={selectedAdr?.title || "Architecture Decision Record"}
        subtitle={`${selectedAdr?.adr_id_formatted} • Category: ${selectedAdr?.category}`}
        widthClass="max-w-3xl"
      >
        {selectedAdr && (
          <div className="space-y-6">
            {/* Status & Category */}
            <div className="flex items-center gap-2">
              <StatusBadge variant="success" size="md">
                Status: {selectedAdr.status.toUpperCase()}
              </StatusBadge>
              <StatusBadge variant="default" size="md">
                Category: {selectedAdr.category}
              </StatusBadge>
            </div>

            {/* Decision */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-1">
              <div className="text-xs font-mono font-bold uppercase text-indigo-900">
                Decision:
              </div>
              <p className="text-sm text-indigo-950 font-medium leading-relaxed font-sans">
                {selectedAdr.decision}
              </p>
            </div>

            {/* Context */}
            <div>
              <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-1.5">
                Problem Context & Requirements:
              </h4>
              <p className="text-xs text-slate-800 bg-slate-50 border border-slate-200 p-3.5 rounded-xl leading-relaxed font-sans">
                {selectedAdr.context}
              </p>
            </div>

            {/* Positive & Negative Consequences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
                <div className="text-xs font-mono font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Positive Consequences (+):</span>
                </div>
                <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4 font-sans">
                  {selectedAdr.consequences_positive?.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2">
                <div className="text-xs font-mono font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Negative Consequences / Trade-offs (-):</span>
                </div>
                <ul className="text-xs text-amber-950 space-y-1.5 list-disc pl-4 font-sans">
                  {selectedAdr.consequences_negative?.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Compliance & Security */}
            {selectedAdr.compliance_and_security && (
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-1.5">
                  Security & Compliance Invariants:
                </h4>
                <p className="text-xs text-slate-800 bg-slate-50 border border-slate-200 p-3.5 rounded-xl leading-relaxed font-sans">
                  {selectedAdr.compliance_and_security}
                </p>
              </div>
            )}

            {/* Citations */}
            {selectedAdr.evidence_citations?.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-semibold uppercase text-slate-500 mb-2">
                  Empirical Evidence Citations ({selectedAdr.evidence_citations.length}):
                </h4>
                <div className="space-y-2">
                  {selectedAdr.evidence_citations.map((cite, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs font-mono"
                    >
                      <div className="font-semibold text-slate-900">
                        {cite.source} {cite.section ? `(${cite.section})` : ""}
                      </div>
                      <p className="text-slate-600 font-sans">{cite.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Markdown Code View */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono font-semibold uppercase text-slate-500">
                  Raw ADR Markdown:
                </h4>
                <button
                  type="button"
                  onClick={() => handleCopyMarkdown(selectedAdr.id, selectedAdr.markdown_content)}
                  className="text-xs font-mono text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed max-h-72">
                {selectedAdr.markdown_content}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
