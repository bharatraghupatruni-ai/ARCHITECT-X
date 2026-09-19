"use client";

import React, { useState } from "react";
import { TraceabilityNode, ArchitectureComponent } from "@/lib/api";
import {
  GitCommit,
  Cpu,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  BookOpen,
  Filter,
  Search,
  Server,
  Database,
  Radio,
  Globe,
} from "lucide-react";

interface TraceabilityMatrixProps {
  traceability: TraceabilityNode[];
  components: ArchitectureComponent[];
}

export function TraceabilityMatrix({ traceability, components }: TraceabilityMatrixProps) {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(traceability[0]?.requirement_id || null);

  const filteredTraceability = traceability.filter((node) => {
    const matchesType = selectedType === "all" || node.requirement_type === selectedType;
    const matchesSearch =
      searchQuery === "" ||
      node.requirement_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.requirement_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.adjudicated_decision || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.adr_title || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getAgentIcon = (agentType?: string | null) => {
    switch (agentType?.toLowerCase()) {
      case "security":
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case "performance":
        return <Zap className="w-4 h-4 text-amber-400" />;
      default:
        return <Cpu className="w-4 h-4 text-indigo-400" />;
    }
  };

  const getCategoryBadgeColor = (category?: string) => {
    switch (category) {
      case "database":
        return "bg-emerald-950 text-emerald-300 border-emerald-800/60";
      case "cache":
        return "bg-amber-950 text-amber-300 border-amber-800/60";
      case "queue":
        return "bg-cyan-950 text-cyan-300 border-cyan-800/60";
      case "gateway":
        return "bg-sky-950 text-sky-300 border-sky-800/60";
      case "ui":
        return "bg-purple-950 text-purple-300 border-purple-800/60";
      default:
        return "bg-indigo-950 text-indigo-300 border-indigo-800/60";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-100/70 border border-surface-50">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 mr-2">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Type:</span>
          </div>
          <button
            onClick={() => setSelectedType("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedType === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            All ({traceability.length})
          </button>
          <button
            onClick={() => setSelectedType("functional")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedType === "functional"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            Functional
          </button>
          <button
            onClick={() => setSelectedType("non_functional")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedType === "non_functional"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            Non-Functional
          </button>
          <button
            onClick={() => setSelectedType("scale")}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedType === "scale"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-surface-200 text-slate-400 hover:text-white"
            }`}
          >
            Scale & Constraints
          </button>
        </div>

        {/* Search input */}
        <div className="relative flex-1 sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search lineage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-200/90 border border-surface-50 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Traceability Lineage Cards */}
      <div className="space-y-4">
        {filteredTraceability.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-surface-100/40 border border-surface-50 text-slate-500 font-mono text-xs">
            No requirement traceability paths found matching your criteria.
          </div>
        ) : (
          filteredTraceability.map((node) => {
            const isExpanded = (expandedId || filteredTraceability[0]?.requirement_id) === node.requirement_id;

            return (
              <div
                key={node.requirement_id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? "bg-surface-100/90 border-indigo-500/50 shadow-xl shadow-indigo-950/20"
                    : "bg-surface-100/40 border-surface-50 hover:border-slate-700"
                }`}
              >
                {/* Lineage Card Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : node.requirement_id)}
                  className="p-4 sm:p-5 flex items-start justify-between cursor-pointer select-none space-x-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-950 border border-indigo-800/80 text-indigo-300">
                        {node.requirement_id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface-200 text-slate-300 border border-surface-50">
                        {node.requirement_type}
                      </span>
                      {node.adr_title && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                          {node.adr_title.split(":")[0]}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white font-sans leading-snug">
                      "{node.requirement_text}"
                    </h3>

                    {/* Compact preview of downstream components */}
                    <div className="flex items-center space-x-1.5 flex-wrap pt-1">
                      <span className="text-[10px] font-mono text-slate-500 mr-1">Target Nodes:</span>
                      {node.target_components.map((cid) => {
                        const comp = components.find((c) => c.id === cid);
                        return (
                          <span
                            key={cid}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getCategoryBadgeColor(
                              comp?.category
                            )}`}
                          >
                            {comp?.name || cid}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-indigo-400 p-1 flex-shrink-0">
                    <span className="text-xs font-mono">{isExpanded ? "Collapse ▲" : "Trace Flow ▼"}</span>
                  </div>
                </div>

                {/* Expanded Step-by-Step Traceability Flow */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-surface-50/80 space-y-4">
                    <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold mb-3">
                      End-to-End Decision & Architecture Lineage
                    </div>

                    {/* Step-by-step Pipeline Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                      {/* Step 1: Requirement */}
                      <div className="p-3.5 rounded-xl bg-surface-200/60 border border-indigo-500/30 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">
                            Step 1: Requirement
                          </span>
                          <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-[10px] font-mono text-indigo-300">
                            1
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 font-sans leading-relaxed">
                          {node.requirement_text}
                        </p>
                      </div>

                      {/* Step 2: Agent Recommendation */}
                      <div className="p-3.5 rounded-xl bg-surface-200/60 border border-cyan-500/30 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase flex items-center space-x-1">
                            {getAgentIcon(node.agent_type)}
                            <span>Step 2: Agent Eval</span>
                          </span>
                          <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-[10px] font-mono text-cyan-300">
                            2
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          {node.agent_recommendation || "Specialist agent evaluation."}
                        </p>
                      </div>

                      {/* Step 3: Conflict / Trade-off */}
                      <div className="p-3.5 rounded-xl bg-surface-200/60 border border-amber-500/30 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>Step 3: Tension</span>
                          </span>
                          <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-800 flex items-center justify-center text-[10px] font-mono text-amber-300">
                            3
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          {node.conflict_or_tension || "Cross-agent architectural trade-off."}
                        </p>
                      </div>

                      {/* Step 4: Adjudicated Decision / ADR */}
                      <div className="p-3.5 rounded-xl bg-surface-200/60 border border-emerald-500/30 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Step 4: Decision</span>
                          </span>
                          <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-[10px] font-mono text-emerald-300">
                            4
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-emerald-300 font-bold line-clamp-1">
                          {node.adr_title || "ADR Decision"}
                        </div>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">
                          {node.adjudicated_decision || "Principal Architect approved."}
                        </p>
                      </div>

                      {/* Step 5: Target Architecture Components */}
                      <div className="p-3.5 rounded-xl bg-surface-200/60 border border-purple-500/30 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                            <span>Step 5: Nodes</span>
                          </span>
                          <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center text-[10px] font-mono text-purple-300">
                            5
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {node.target_components.map((cid) => {
                            const comp = components.find((c) => c.id === cid);
                            return (
                              <div
                                key={cid}
                                className={`p-1.5 rounded text-[11px] font-mono border ${getCategoryBadgeColor(
                                  comp?.category
                                )}`}
                              >
                                {comp?.name || cid}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Literature Citation Bar */}
                    {node.evidence_grounding && (
                      <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs flex items-center space-x-2 text-cyan-200">
                        <BookOpen className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="font-mono text-[11px] text-cyan-400 font-bold">
                          Empirical Evidence:
                        </span>
                        <span className="italic font-sans text-slate-300">
                          {node.evidence_grounding}
                        </span>
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
