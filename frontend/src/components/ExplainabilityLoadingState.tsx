"use client";

import React, { useEffect, useState } from "react";
import { FileCode, Layers, ShieldCheck, Sparkles, Database, CheckCircle2 } from "lucide-react";

export function ExplainabilityLoadingState() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      title: "Synthesizing Architecture Decision Records",
      desc: "Parsing adjudicated choices, trade-offs, and requirement scale invariants...",
      icon: FileCode,
    },
    {
      title: "Extracting Consequences & Blast Radius",
      desc: "Formalizing MADR-standard positive consequences, operational risks, and compliance...",
      icon: ShieldCheck,
    },
    {
      title: "Decomposing Multi-Level C4 Architecture",
      desc: "Constructing Level 1 Context, Level 2 Containers, and Level 3 Component topologies...",
      icon: Layers,
    },
    {
      title: "Grounding Diagrams in Empirical Evidence",
      desc: "Generating live protocol badges, security zones, and Mermaid blueprints...",
      icon: Database,
    },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveStep(1), 600);
    const timer2 = setTimeout(() => setActiveStep(2), 1400);
    const timer3 = setTimeout(() => setActiveStep(3), 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="w-full p-6 sm:p-8 rounded-2xl bg-surface-200/80 border border-indigo-500/30 shadow-2xl backdrop-blur-md relative overflow-hidden space-y-6">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono flex items-center space-x-2">
              <span>Decision & Explainability Engine Active</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                Phase 6
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Generating MADR Architecture Records & 3-Tier C4 Visual Topology...
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface-100 border border-surface-50 text-xs font-mono text-indigo-300">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping mr-1" />
          <span>Synthesizing Blueprints</span>
        </div>
      </div>

      {/* Interactive Progress Pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isDone = activeStep > idx;
          const isCurrent = activeStep === idx;

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border transition-all duration-300 ${
                isDone
                  ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                  : isCurrent
                  ? "bg-indigo-950/40 border-indigo-500/60 text-indigo-200 shadow-lg shadow-indigo-950/30"
                  : "bg-surface-100/40 border-surface-50/40 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isDone
                      ? "bg-emerald-900/60 text-emerald-400"
                      : isCurrent
                      ? "bg-indigo-900/80 text-indigo-300 animate-pulse"
                      : "bg-surface-200 text-slate-600"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isCurrent ? (
                  <span className="text-[10px] font-mono text-indigo-400 animate-pulse">
                    Processing...
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-600">Pending</span>
                )}
              </div>
              <h4 className="text-xs font-bold font-mono text-slate-200">{s.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
