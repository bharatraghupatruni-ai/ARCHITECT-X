"use client";

import React from "react";
import { Project } from "@/lib/api";
import { ProjectCard } from "@/components/ProjectCard";
import { FolderGit2, RefreshCw } from "lucide-react";

interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
  onRefresh: () => void;
  latestProjectId?: string | null;
  onAnalyze?: (project: Project) => void;
  analyzingProjectId?: string | null;
}

export function ProjectList({
  projects,
  isLoading,
  onRefresh,
  latestProjectId,
  onAnalyze,
  analyzingProjectId,
}: ProjectListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FolderGit2 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white">
            Architecture Projects ({projects.length})
          </h2>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          type="button"
          className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-surface-100 transition-colors flex items-center space-x-1.5 text-xs font-mono disabled:opacity-50"
          title="Refresh project list from backend"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-50 p-8 text-center bg-surface-200/40">
          <FolderGit2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No architecture projects yet.</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Submit a requirement above to create your first architecture project record.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isLatest={project.id === latestProjectId}
              onAnalyze={onAnalyze}
              isAnalyzing={analyzingProjectId === project.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
