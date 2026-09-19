"use client";

import React, { useEffect, useState } from "react";

export function ReviewLoadingState() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { title: "Aggregating Agent Proposals", desc: "Ingesting Architecture, Security, and Performance evaluations..." },
    { title: "Executing Conflict Engine", desc: "Detecting technical disagreements, component clashes, and trade-off tensions..." },
    { title: "Engaging Reviewer Agent", desc: "Principal Architect analyzing consistency vs. latency boundaries without majority vote..." },
    { title: "Adjudicating Final Decisions", desc: "Synthesizing mitigation mandates, trade-off matrices, and action items..." },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1100);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 text-center max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Pulsing Synthesizer Icon */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center relative">
          <svg
            className="w-8 h-8 text-cyan-400 animate-spin"
            style={{ animationDuration: "3s" }}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <div className="absolute -inset-1 rounded-2xl bg-cyan-500/20 blur-sm -z-10 animate-pulse"></div>
      </div>

      <h3 className="text-xl font-bold text-slate-100 tracking-tight mb-2">
        Synthesizing Multi-Agent Architecture Review
      </h3>
      <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 font-mono text-xs">
        Principal Software Architect Reviewer is adjudicating conflicts and formulating authoritative system decisions.
      </p>

      {/* Progress Steps */}
      <div className="space-y-3 text-left max-w-lg mx-auto">
        {steps.map((step, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${
                isCurrent
                  ? "bg-cyan-950/30 border-cyan-500/40 text-cyan-200"
                  : isDone
                  ? "bg-slate-950/50 border-emerald-500/20 text-slate-300"
                  : "bg-slate-950/20 border-slate-800/40 text-slate-500"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs">
                    ✓
                  </div>
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 text-xs animate-pulse">
                    ●
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-600 text-xs">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold font-mono">{step.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
