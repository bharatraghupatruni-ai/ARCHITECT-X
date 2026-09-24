"use client";

import React from "react";
import { ReviewConflict } from "@/lib/api";
import { StatusBadge } from "./ui/StatusBadge";
import { AlertCircle, ArrowDown, CheckCircle2, Shield, Zap, Cpu, BookOpen, Layers } from "lucide-react";

interface ConflictCardProps {
  conflict: ReviewConflict;
}

export function ConflictCard({ conflict }: ConflictCardProps) {
  const getSeverityVariant = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return "danger" as const;
      case "medium":
        return "warning" as const;
      default:
        return "info" as const;
    }
  };

  const getAgentConfig = (agent: string) => {
    switch (agent.toLowerCase()) {
      case "architecture":
        return {
          label: "Architecture Agent",
          tagBg: "bg-indigo-50 text-indigo-700",
          icon: Cpu,
        };
      case "security":
        return {
          label: "Security Agent",
          tagBg: "bg-emerald-50 text-emerald-700",
          icon: Shield,
        };
      case "performance":
        return {
          label: "Performance Agent",
          tagBg: "bg-amber-50 text-amber-700",
          icon: Zap,
        };
      default:
        return {
          label: agent,
          tagBg: "bg-slate-100 text-slate-700",
          icon: Layers,
        };
    }
  };

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-tight">
            {formatCategory(conflict.category)}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {conflict.conflict_type.replace(/_/g, " ")}
          </span>
        </div>
        <StatusBadge variant={getSeverityVariant(conflict.severity)} size="sm">
          {conflict.severity} Severity
        </StatusBadge>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-800 font-sans leading-relaxed">
        {conflict.description}
      </p>

      {/* Side-by-Side Agent Stances */}
      {conflict.agent_positions && Object.keys(conflict.agent_positions).length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-tight">
            Independent Agent Opinions:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {Object.entries(conflict.agent_positions).map(([agent, stance]) => {
              const cfg = getAgentConfig(agent);
              const Icon = cfg.icon;
              return (
                <div
                  key={agent}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-700">
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-900 leading-snug font-medium">
                    {String(stance)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviewer Resolution Flow */}
      {conflict.resolution && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />
              <span>Reviewer Resolution</span>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-900 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Adjudicated Choice & Synthesis</span>
            </div>
            <p className="text-xs text-indigo-950 leading-relaxed font-sans">
              {conflict.resolution}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
