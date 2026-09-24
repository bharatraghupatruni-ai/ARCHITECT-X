"use client";

import React from "react";
import { AgentOutput } from "@/lib/api";
import {
  Cpu,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";

interface AgentCardProps {
  agent: AgentOutput;
  onViewDetails: (agent: AgentOutput) => void;
}

export function AgentCard({ agent, onViewDetails }: AgentCardProps) {
  const getAgentConfig = (type: string) => {
    switch (type.toLowerCase()) {
      case "architecture":
        return {
          title: "Architecture Agent",
          role: "Senior Software Architect",
          icon: Cpu,
          tagBg: "bg-indigo-50 text-indigo-700",
        };
      case "security":
        return {
          title: "Security Agent",
          role: "Application Security Architect",
          icon: ShieldCheck,
          tagBg: "bg-emerald-50 text-emerald-700",
        };
      case "performance":
        return {
          title: "Performance Agent",
          role: "Distributed Systems & Reliability",
          icon: Zap,
          tagBg: "bg-amber-50 text-amber-700",
        };
      default:
        return {
          title: "Specialized Agent",
          role: "Architecture Specialist",
          icon: Layers,
          tagBg: "bg-slate-100 text-slate-700",
        };
    }
  };

  const config = getAgentConfig(agent.agent_type);
  const Icon = config.icon;

  const topDecisions = agent.decisions?.slice(0, 2) || [];
  const topRisk = agent.risks?.[0] || null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${config.tagBg}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                {config.title}
              </h3>
              <p className="text-xs text-slate-500 font-sans">{config.role}</p>
            </div>
          </div>
          <StatusBadge variant="success" size="sm">
            Analysis Complete
          </StatusBadge>
        </div>

        {/* Metric Counts */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg text-center font-sans">
          <div>
            <div className="text-sm font-bold text-slate-900">
              {agent.decisions?.length || 0}
            </div>
            <div className="text-[11px] text-slate-500">Decisions</div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {agent.risks?.length || 0}
            </div>
            <div className="text-[11px] text-slate-500">Risks</div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">
              {agent.components?.length || 0}
            </div>
            <div className="text-[11px] text-slate-500">Components</div>
          </div>
        </div>

        {/* Executive Summary */}
        <p className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-2">
          {agent.summary}
        </p>

        {/* Top Key Decisions */}
        {topDecisions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight font-sans">
              Key Decisions:
            </div>
            <div className="space-y-1">
              {topDecisions.map((d, i) => (
                <div
                  key={i}
                  className="p-2 rounded-md bg-slate-50 border border-slate-200/60 text-xs font-sans text-slate-800"
                >
                  <span className="font-semibold text-slate-900 block text-[11px]">
                    {d.decision}:
                  </span>
                  <span className="text-slate-600 truncate block">{d.choice}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Risk */}
        {topRisk && (
          <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200/70 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-800 font-sans">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Primary Risk ({topRisk.severity}):</span>
            </div>
            <p className="text-xs text-rose-950 leading-tight line-clamp-2 font-sans">
              {topRisk.title}
            </p>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div className="pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onViewDetails(agent)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-sans font-medium text-xs transition-colors"
        >
          <span>View Analysis</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    </div>
  );
}
