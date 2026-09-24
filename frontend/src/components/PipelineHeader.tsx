"use client";

import React from "react";
import {
  FileText,
  Search,
  Users,
  ShieldCheck,
  Layers,
  Flame,
  Check,
  Plus,
  ChevronRight,
} from "lucide-react";
import { Project } from "@/lib/api";

export type PipelineStage =
  | "requirement"
  | "analysis"
  | "agents"
  | "review"
  | "architecture"
  | "challenge";

export type StageState = "completed" | "active" | "waiting" | "error";

export interface StageInfo {
  id: PipelineStage;
  label: string;
  icon: React.ElementType;
}

export const PIPELINE_STAGES: StageInfo[] = [
  { id: "requirement", label: "Requirement", icon: FileText },
  { id: "analysis", label: "Analysis", icon: Search },
  { id: "agents", label: "Agents", icon: Users },
  { id: "review", label: "Review", icon: ShieldCheck },
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "challenge", label: "Challenge", icon: Flame },
];

interface PipelineHeaderProps {
  currentStage: PipelineStage;
  onSelectStage: (stage: PipelineStage) => void;
  getStageState: (stage: PipelineStage) => StageState;
  activeProject: Project | null;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onNewProject: () => void;
  apiOnline: boolean | null;
}

export function PipelineHeader({
  currentStage,
  onSelectStage,
  getStageState,
  activeProject,
  projects,
  onSelectProject,
  onNewProject,
  apiOnline,
}: PipelineHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-14 border-b border-slate-100">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-900 font-sans">
                ARCHITECT<span className="text-indigo-600">-X</span>
              </span>
              <span className="text-xs text-slate-500 font-sans hidden md:inline">
                Evidence-Grounded Multi-Agent Architecture Review
              </span>
            </div>
          </div>

          {/* Project Controls & Health */}
          <div className="flex items-center gap-2.5">
            {activeProject && (
              <div className="flex items-center gap-1.5">
                <select
                  value={activeProject.id}
                  onChange={(e) => {
                    const found = projects.find((p) => p.id === e.target.value);
                    if (found) onSelectProject(found);
                  }}
                  aria-label="Select active project"
                  className="text-xs font-sans text-slate-800 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[180px] sm:max-w-xs truncate"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onNewProject}
              type="button"
              className="inline-flex items-center gap-1 text-xs font-sans font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>

            {/* Health Badge */}
            <div className="pl-2 border-l border-slate-200 flex items-center">
              {apiOnline === null ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-sans text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
                  <span className="hidden lg:inline">Connecting</span>
                </span>
              ) : apiOnline ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-sans text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="hidden lg:inline">API Online</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-sans text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="hidden lg:inline">API Offline</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Compact Pipeline Navigation Bar */}
        <div className="py-2 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1 sm:gap-2 min-w-max">
            {PIPELINE_STAGES.map((stage, idx) => {
              const state = getStageState(stage.id);
              const isActive = currentStage === stage.id;
              const isClickable = state === "completed" || state === "active" || state === "error";

              let stateIndicator = (
                <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                  ○
                </span>
              );

              if (state === "completed") {
                stateIndicator = (
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center text-[10px]">
                    <Check className="w-2.5 h-2.5 text-emerald-700" />
                  </span>
                );
              } else if (isActive) {
                stateIndicator = (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    ●
                  </span>
                );
              }

              let buttonClasses = "text-slate-400 hover:text-slate-600 bg-transparent cursor-not-allowed";
              if (isActive) {
                buttonClasses = "text-indigo-700 bg-indigo-50 border border-indigo-200/90 font-semibold shadow-xs";
              } else if (state === "completed") {
                buttonClasses = "text-slate-700 bg-white hover:bg-slate-50 border border-slate-200";
              }

              return (
                <React.Fragment key={stage.id}>
                  <button
                    type="button"
                    disabled={!isClickable}
                    onClick={() => onSelectStage(stage.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-sans transition-all ${buttonClasses}`}
                  >
                    {stateIndicator}
                    <span>{stage.label}</span>
                  </button>

                  {idx < PIPELINE_STAGES.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
