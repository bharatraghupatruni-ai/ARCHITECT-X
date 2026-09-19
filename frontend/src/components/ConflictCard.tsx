"use client";

import React from "react";
import { ReviewConflict } from "@/lib/api";

interface ConflictCardProps {
  conflict: ReviewConflict;
}

export function ConflictCard({ conflict }: ConflictCardProps) {
  const getSeverityBadge = (severity: string) => {
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

  const getTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "disagreement":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "tradeoff":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "missing_decision":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "risk_disagreement":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "component_clash":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getAgentLabelStyle = (agent: string) => {
    switch (agent.toLowerCase()) {
      case "architecture":
        return "text-indigo-400 border-indigo-500/30 bg-indigo-950/40";
      case "security":
        return "text-emerald-400 border-emerald-500/30 bg-emerald-950/40";
      case "performance":
        return "text-amber-400 border-amber-500/30 bg-amber-950/40";
      default:
        return "text-slate-400 border-slate-700 bg-slate-900";
    }
  };

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 shadow-lg shadow-black/20 flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${getTypeBadge(
                conflict.conflict_type
              )}`}
            >
              {conflict.conflict_type.replace(/_/g, " ")}
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
              {formatCategory(conflict.category)}
            </span>
          </div>
          <span
            className={`text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${getSeverityBadge(
              conflict.severity
            )}`}
          >
            {conflict.severity}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm font-medium text-slate-200 leading-relaxed mb-4">
          {conflict.description}
        </p>

        {/* Agent Stances */}
        {conflict.agent_positions && Object.keys(conflict.agent_positions).length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Agent Positions
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {Object.entries(conflict.agent_positions).map(([agent, stance]) => (
                <div
                  key={agent}
                  className="flex items-start gap-2 text-xs bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/60"
                >
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold shrink-0 mt-0.5 ${getAgentLabelStyle(
                      agent
                    )}`}
                  >
                    {agent}
                  </span>
                  <span className="text-slate-300 font-mono text-[11px] leading-snug">
                    {String(stance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Adjudicated Resolution */}
      {conflict.resolution && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 bg-cyan-950/20 -mx-5 -mb-5 p-4 rounded-b-xl border-cyan-500/10">
          <div className="flex items-center gap-1.5 mb-1 text-cyan-400 text-xs font-mono font-semibold">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Reviewer Resolution</span>
          </div>
          <p className="text-xs text-cyan-200/90 leading-relaxed">
            {conflict.resolution}
          </p>
        </div>
      )}
    </div>
  );
}
