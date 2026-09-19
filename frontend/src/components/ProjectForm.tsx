"use client";

import React, { useState } from "react";
import { api, Project } from "@/lib/api";
import { ArrowRight, AlertCircle, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

interface ProjectFormProps {
  onProjectCreated: (project: Project) => void;
}

export function ProjectForm({ onProjectCreated }: ProjectFormProps) {
  const [name, setName] = useState("Food Delivery Platform");
  const [requirement, setRequirement] = useState(
    "Build a food delivery platform supporting 50,000 concurrent users."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(false);

    // Client-side empty input validation
    if (!requirement.trim()) {
      setErrorMessage("Requirement specification cannot be empty.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Project name cannot be empty.");
      return;
    }

    setIsLoading(true);

    try {
      const created = await api.createProject({
        name: name.trim(),
        requirement: requirement.trim(),
      });

      onProjectCreated(created);
      setSuccessNotice(true);
      setTimeout(() => setSuccessNotice(false), 4000);
    } catch (err: any) {
      setErrorMessage(
        err.detail || err.message || "Failed to submit project to backend."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertExample = () => {
    setName("Food Delivery Platform");
    setRequirement("Build a food delivery platform supporting 50,000 concurrent users.");
    setErrorMessage(null);
  };

  return (
    <div className="bg-surface-200/90 border border-surface-50 rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/40 backdrop-blur-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Design Your Architecture</span>
          </h2>
          <button
            type="button"
            onClick={handleInsertExample}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-mono flex items-center space-x-1 hover:underline cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Default Example</span>
          </button>
        </div>
        <p className="text-sm text-slate-400 mt-1.5">
          Describe the software system you want to build.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Project Name Input */}
        <div>
          <label
            htmlFor="project-name"
            className="block text-xs font-mono font-medium text-slate-300 uppercase mb-2"
          >
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Food Delivery Platform"
            className="w-full px-4 py-2.5 rounded-lg bg-surface-300 border border-surface-50 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-sans"
            disabled={isLoading}
          />
        </div>

        {/* Large Requirement Textarea */}
        <div>
          <label
            htmlFor="system-requirement"
            className="block text-xs font-mono font-medium text-slate-300 uppercase mb-2"
          >
            System Requirements & Scale Constraints
          </label>
          <textarea
            id="system-requirement"
            rows={5}
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="Example: Build a food delivery platform supporting 50,000 concurrent users."
            className="w-full px-4 py-3 rounded-lg bg-surface-300 border border-surface-50 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono leading-relaxed resize-y"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between mt-1.5 text-xs text-slate-500 font-mono">
            <span>Minimum 10 characters</span>
            <span>{requirement.length} characters</span>
          </div>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-start space-x-2.5 text-rose-300 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1 font-mono">{errorMessage}</div>
          </div>
        )}

        {/* Success message banner */}
        {successNotice && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 flex items-center space-x-2.5 text-emerald-300 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span className="font-mono">
              Project successfully recorded in PostgreSQL database.
            </span>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-mono">
            Phase 1 validates input & persists project record via FastAPI.
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-600/40"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Analyze Architecture</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
