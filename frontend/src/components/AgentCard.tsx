"use client";

import React, { useState } from "react";
import { AgentOutput } from "@/lib/api";
import {
  Cpu,
  ShieldCheck,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  Share2,
} from "lucide-react";

interface AgentCardProps {
  agent: AgentOutput;
}

export function AgentCard({ agent }: AgentCardProps) {
  const [showAllComponents, setShowAllComponents] = useState(false);

  const getAgentConfig = (type: string) => {
    switch (type.toLowerCase()) {
      case "architecture":
        return {
          title: "Architecture Agent",
          role: "Senior Software Architect",
          icon: Cpu,
          badgeColor: "bg-indigo-950/60 text-indigo-300 border-indigo-800/50",
          accentBorder: "border-indigo-500/40",
          iconBg: "bg-indigo-950 text-indigo-400 border-indigo-800/40",
        };
      case "security":
        return {
          title: "Security Agent",
          role: "Application Security Architect",
          icon: ShieldCheck,
          badgeColor: "bg-emerald-950/60 text-emerald-300 border-emerald-800/50",
          accentBorder: "border-emerald-500/40",
          iconBg: "bg-emerald-950 text-emerald-400 border-emerald-800/40",
        };
      case "performance":
        return {
          title: "Performance & Reliability Agent",
          role: "Distributed Systems & Reliability Engineer",
          icon: Zap,
          badgeColor: "bg-amber-950/60 text-amber-300 border-amber-800/50",
          accentBorder: "border-amber-500/40",
          iconBg: "bg-amber-950 text-amber-400 border-amber-800/40",
        };
      default:
        return {
          title: "Specialized Agent",
          role: "Architecture Specialist",
          icon: Layers,
          badgeColor: "bg-slate-900 text-slate-300 border-slate-700",
          accentBorder: "border-slate-700",
          iconBg: "bg-slate-900 text-slate-400 border-slate-700",
        };
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-rose-950/60 text-rose-300 border-rose-800/50";
      case "high":
        return "bg-orange-950/60 text-orange-300 border-orange-800/50";
      case "medium":
        return "bg-amber-950/60 text-amber-300 border-amber-800/50";
      default:
        return "bg-slate-900 text-slate-300 border-slate-800";
    }
  };

  const config = getAgentConfig(agent.agent_type);
  const Icon = config.icon;

  return (
    <div
      className={`bg-surface-200/90 border ${config.accentBorder} rounded-2xl p-6 shadow-xl space-y-6 transition-all font-sans flex flex-col justify-between`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-surface-50">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${config.iconBg} shadow-sm`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">{config.title}</h3>
              <p className="text-xs text-slate-400 font-mono">{config.role}</p>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${config.badgeColor}`}
          >
            {agent.agent_type}
          </span>
        </div>

        {/* Executive Summary */}
        <div>
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Executive Evaluation Summary
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed bg-surface-300/80 p-3.5 rounded-xl border border-surface-50">
            {agent.summary}
          </p>
        </div>

        {/* Technical Decisions */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-2">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>Technical Decisions ({agent.decisions.length})</span>
          </h4>
          <div className="space-y-2">
            {agent.decisions.map((dec, idx) => (
              <div
                key={idx}
                className="bg-surface-300/70 border border-surface-50 p-3 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                    {dec.decision}
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                    {dec.choice}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">{dec.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Identified Risks & Mitigations */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Identified Risks ({agent.risks.length})</span>
          </h4>
          <div className="space-y-2">
            {agent.risks.map((risk, idx) => (
              <div
                key={idx}
                className="bg-surface-300/60 border border-surface-50 p-3 rounded-xl space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">{risk.title}</span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${getSeverityBadge(
                      risk.severity
                    )}`}
                  >
                    {risk.severity}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono flex items-start space-x-1.5 pt-1">
                  <span className="text-emerald-400">Mitigation:</span>
                  <span className="text-slate-300">{risk.mitigation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proposed Components / Topology */}
        {agent.components.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-surface-50">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-2">
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Proposed Components ({agent.components.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAllComponents(!showAllComponents)}
                className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>{showAllComponents ? "Collapse" : "Expand"}</span>
                {showAllComponents ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {showAllComponents && (
              <div className="space-y-2 pt-1">
                {agent.components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-300/80 p-2.5 rounded-lg border border-surface-50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{comp.name}</span>
                      {comp.technology && (
                        <span className="text-[10px] font-mono bg-surface-100 text-indigo-300 px-1.5 py-0.5 rounded">
                          {comp.technology}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{comp.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recommendations Footer */}
      {agent.recommendations.length > 0 && (
        <div className="pt-4 border-t border-surface-50">
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2">
            Tactical Recommendations
          </h4>
          <ul className="space-y-1 text-xs text-slate-300">
            {agent.recommendations.slice(0, 3).map((rec, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
