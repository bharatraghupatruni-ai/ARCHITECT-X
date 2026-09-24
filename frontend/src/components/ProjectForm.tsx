"use client";

import React, { useState } from "react";
import { ProjectCreatePayload, Project } from "@/lib/api";
import { FileText, ArrowRight, Loader2, Sparkles, HelpCircle } from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";

interface ProjectFormProps {
  onSubmit: (payload: ProjectCreatePayload) => Promise<Project | void>;
  isLoading?: boolean;
}

const SAMPLE_REQUIREMENTS = [
  {
    title: "IoT Fleet Management",
    domain: "iot",
    text: "Build an enterprise IoT fleet management platform handling 100,000 connected vehicles streaming telemetry at 2,000 RPS, with geo-fencing alerts, battery health diagnostics, and sub-100ms anomaly detection.",
  },
  {
    title: "Food Delivery Platform",
    domain: "food_delivery",
    text: "Build a high-scale food delivery application supporting 50,000 concurrent users with real-time order tracking, payment processing, menu catalogs, and driver dispatch under 200ms latency.",
  },
  {
    title: "Fintech Core Banking",
    domain: "fintech",
    text: "Design a high-security core banking system supporting 10,000 transactions per second with strict ACID ledger accounting, KYC verification, multi-region failover, and PCI-DSS compliance.",
  },
  {
    title: "E-Commerce Flash Sale",
    domain: "e_commerce",
    text: "Build a flash-sale retail platform handling 250,000 concurrent shoppers during black friday surges, with inventory reservation locking, payment gateway routing, and sub-second checkout.",
  },
];

export function ProjectForm({ onSubmit, isLoading = false }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [requirement, setRequirement] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a project name.");
      return;
    }
    if (!requirement.trim()) {
      setError("Please describe the system requirements.");
      return;
    }

    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        requirement: requirement.trim(),
      });
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to create project.");
    }
  };

  const handleSelectTemplate = (sample: (typeof SAMPLE_REQUIREMENTS)[0]) => {
    setName(sample.title);
    setRequirement(sample.text);
    setError(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge variant="default" size="sm">
            Requirement Intake
          </StatusBadge>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Enter System Requirements
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Describe your system goals, expected scale, domain entities, and constraints in natural language. The Requirement Engine parses it without hallucinating fake stacks.
        </p>
      </div>

      {/* Preset Requirement Chips */}
      <div>
        <label className="block text-xs font-mono font-medium text-slate-500 mb-2">
          Or load a reference scenario template:
        </label>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_REQUIREMENTS.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={() => handleSelectTemplate(s)}
              className="text-xs font-mono text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors text-left"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Project Name */}
        <div>
          <label
            htmlFor="projectName"
            className="block text-xs font-mono font-semibold text-slate-700 mb-1.5"
          >
            Project Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="projectName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Enterprise IoT Fleet Platform"
            disabled={isLoading}
            className="w-full text-sm font-sans text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Requirements Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="projectRequirement"
              className="block text-xs font-mono font-semibold text-slate-700"
            >
              System Requirements & Constraints <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              Natural Language Specification
            </span>
          </div>
          <textarea
            id="projectRequirement"
            rows={5}
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="Describe functional capabilities, scale (e.g. 50,000 concurrent users, 2,000 RPS), target SLAs, security constraints, or compliance requirements..."
            disabled={isLoading}
            className="w-full text-sm font-sans text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl p-4 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-slate-400 leading-relaxed font-normal"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-700">
            {error}
          </div>
        )}

        {/* Submit CTA */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all shadow-sm hover:shadow disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Project...</span>
              </>
            ) : (
              <>
                <span>Analyze Requirements</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
