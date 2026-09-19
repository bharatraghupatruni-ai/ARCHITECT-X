"use client";

import React, { useState } from "react";
import { Project } from "@/lib/api";
import { Check, Copy, Clock, Database, FileCode, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface ProjectCardProps {
  project: Project;
  isLatest?: boolean;
  onAnalyze?: (project: Project) => void;
  isAnalyzing?: boolean;
}

export function ProjectCard({
  project,
  isLatest = false,
  onAnalyze,
  isAnalyzing = false,
}: ProjectCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(project.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return isoString;
    }
  };

  const isCompleted = project.status === "completed";

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isLatest
          ? "bg-surface-100/90 border-indigo-500/40 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/20"
          : "bg-surface-200/60 border-surface-50 hover:border-slate-700"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-50/80">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-slate-100">
              {project.name}
            </h3>
            {isLatest && (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Active Project
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400 font-mono">
            <span className="text-slate-500">UUID:</span>
            <span className="text-slate-300 select-all">{project.id}</span>
            <button
              onClick={handleCopyId}
              type="button"
              className="p-1 hover:text-white rounded hover:bg-surface-50 transition-colors"
              title="Copy Project ID"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-center">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium capitalize border ${
              isCompleted
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
                : project.status === "analyzing"
                ? "bg-indigo-950/40 text-indigo-300 border-indigo-800/40"
                : "bg-slate-800/80 text-slate-300 border-slate-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                isCompleted
                  ? "bg-emerald-400"
                  : project.status === "analyzing"
                  ? "bg-indigo-400 animate-spin"
                  : "bg-slate-400"
              }`}
            />
            {project.status}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-mono uppercase text-slate-400 font-medium flex items-center space-x-1.5 mb-1.5">
          <FileCode className="w-3.5 h-3.5 text-slate-500" />
          <span>Requirement Specification</span>
        </label>
        <p className="text-sm text-slate-300 font-normal leading-relaxed bg-surface-300/80 p-3 rounded-lg border border-surface-50/60 whitespace-pre-wrap">
          {project.requirement}
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-surface-50/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center space-x-4 text-xs text-slate-400 font-mono">
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatDate(project.created_at)}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>PostgreSQL</span>
          </div>
        </div>

        {onAnalyze && (
          <button
            onClick={() => onAnalyze(project)}
            disabled={isAnalyzing}
            type="button"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono transition-all flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Engine...</span>
              </>
            ) : isCompleted ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>View / Re-Analyze Requirements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                <span>Analyze Requirements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
