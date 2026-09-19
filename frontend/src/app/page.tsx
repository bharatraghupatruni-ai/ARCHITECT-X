"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  api,
  Project,
  RequirementAnalysisResponse,
  ProjectAgentResultsResponse,
  ReviewRunResponse,
  ExplainabilityResponse,
  UnifiedArchitectureResponse,
  ChallengeScenario,
  ChallengeRunResponse,
} from "@/lib/api";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectList } from "@/components/ProjectList";
import { ProjectCard } from "@/components/ProjectCard";
import { RequirementAnalysisView } from "@/components/RequirementAnalysisView";
import { AnalysisLoadingState } from "@/components/AnalysisLoadingState";
import { AgentResultsView } from "@/components/AgentResultsView";
import { AgentRunningState } from "@/components/AgentRunningState";
import { ReviewResultsView } from "@/components/ReviewResultsView";
import { ReviewLoadingState } from "@/components/ReviewLoadingState";
import { ExplainabilityView } from "@/components/ExplainabilityView";
import { ExplainabilityLoadingState } from "@/components/ExplainabilityLoadingState";
import { ArchitectureView } from "@/components/ArchitectureView";
import { ChallengeView } from "@/components/ChallengeView";
import { ChallengeLoadingState } from "@/components/ChallengeLoadingState";
import {
  Cpu,
  ShieldCheck,
  Zap,
  BookOpen,
  AlertCircle,
  FileCode,
  Layers,
  GitCommit,
  Sparkles,
  Flame,
} from "lucide-react";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [latestProject, setLatestProject] = useState<Project | null>(null);

  // Requirement Engine state (Phase 2)
  const [analyzingProjectId, setAnalyzingProjectId] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<RequirementAnalysisResponse | null>(null);
  const [activeProjectForAnalysis, setActiveProjectForAnalysis] = useState<Project | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Multi-Agent Review state (Phase 3)
  const [runningAgentsProjectId, setRunningAgentsProjectId] = useState<string | null>(null);
  const [activeAgentResults, setActiveAgentResults] = useState<ProjectAgentResultsResponse | null>(null);
  const [agentReviewError, setAgentReviewError] = useState<string | null>(null);

  // Reviewer & Conflict Engine state (Phase 4 & 5)
  const [runningReviewProjectId, setRunningReviewProjectId] = useState<string | null>(null);
  const [activeReviewResults, setActiveReviewResults] = useState<ReviewRunResponse | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Decision & Explainability Engine state (Phase 6)
  const [runningExplainabilityProjectId, setRunningExplainabilityProjectId] = useState<string | null>(null);
  const [activeExplainabilityResults, setActiveExplainabilityResults] = useState<ExplainabilityResponse | null>(null);
  const [explainabilityError, setExplainabilityError] = useState<string | null>(null);

  // Final Architecture Workspace state (Phase 7)
  const [loadingArchitectureProjectId, setLoadingArchitectureProjectId] = useState<string | null>(null);
  const [activeArchitectureResults, setActiveArchitectureResults] = useState<UnifiedArchitectureResponse | null>(null);
  const [architectureError, setArchitectureError] = useState<string | null>(null);

  // Challenge My Architecture state (Phase 8)
  const [challengeScenarios, setChallengeScenarios] = useState<ChallengeScenario[]>([]);
  const [activeChallengeRun, setActiveChallengeRun] = useState<ChallengeRunResponse | null>(null);
  const [pastChallengeRuns, setPastChallengeRuns] = useState<ChallengeRunResponse[]>([]);
  const [runningChallengeProjectId, setRunningChallengeProjectId] = useState<string | null>(null);
  const [runningScenarioName, setRunningScenarioName] = useState<string | null>(null);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const analysisSectionRef = useRef<HTMLDivElement>(null);
  const agentsSectionRef = useRef<HTMLDivElement>(null);
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const explainabilitySectionRef = useRef<HTMLDivElement>(null);
  const architectureSectionRef = useRef<HTMLDivElement>(null);
  const challengeSectionRef = useRef<HTMLDivElement>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch {
      // Backend might be warming up or offline
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleProjectCreated = (newProject: Project) => {
    setLatestProject(newProject);
    setProjects((prev) => [newProject, ...prev.filter((p) => p.id !== newProject.id)]);
    // Reset active pipeline state on new project creation
    setActiveAnalysis(null);
    setActiveProjectForAnalysis(null);
    setActiveAgentResults(null);
    setActiveReviewResults(null);
    setActiveExplainabilityResults(null);
    setActiveArchitectureResults(null);
    setActiveChallengeRun(null);
    setPastChallengeRuns([]);
    setChallengeScenarios([]);
  };

  const handleAnalyzeRequirement = async (project: Project) => {
    setAnalyzingProjectId(project.id);
    setActiveProjectForAnalysis(project);
    setAnalysisError(null);

    setTimeout(() => {
      analysisSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      const result = await api.analyzeRequirement(project.id);
      setActiveAnalysis(result);

      // Check if downstream stages were already run
      try {
        const existingAgentResults = await api.getAgentResults(project.id);
        if (existingAgentResults.status === "ready" || existingAgentResults.status === "partial") {
          setActiveAgentResults(existingAgentResults);
        }
      } catch {}

      try {
        const existingReview = await api.getLatestReview(project.id);
        if (existingReview) {
          setActiveReviewResults(existingReview);
        }
      } catch {}

      try {
        const existingExplainability = await api.getExplainability(project.id);
        if (existingExplainability) {
          setActiveExplainabilityResults(existingExplainability);
        }
      } catch {}

      try {
        const existingChallenges = await api.getChallengeRuns(project.id);
        if (existingChallenges && existingChallenges.length > 0) {
          setPastChallengeRuns(existingChallenges);
          setActiveChallengeRun(existingChallenges[0]);
        }
      } catch {}

      // Update project status in list
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: "completed" } : p))
      );
      if (latestProject?.id === project.id) {
        setLatestProject((prev) => (prev ? { ...prev, status: "completed" } : null));
      }
    } catch (err: any) {
      setAnalysisError(err.detail || err.message || "Failed to analyze requirements.");
    } finally {
      setAnalyzingProjectId(null);
    }
  };

  const handleRunAgents = async (projectId: string) => {
    setRunningAgentsProjectId(projectId);
    setAgentReviewError(null);

    setTimeout(() => {
      agentsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      const results = await api.runAgents(projectId);
      setActiveAgentResults(results);

      try {
        const existingReview = await api.getLatestReview(projectId);
        if (existingReview) {
          setActiveReviewResults(existingReview);
        }
      } catch {}

      try {
        const existingExplainability = await api.getExplainability(projectId);
        if (existingExplainability) {
          setActiveExplainabilityResults(existingExplainability);
        }
      } catch {}
    } catch (err: any) {
      setAgentReviewError(err.detail || err.message || "Failed to execute multi-agent architecture review.");
    } finally {
      setRunningAgentsProjectId(null);
    }
  };

  const handleRunReview = async (projectId: string) => {
    setRunningReviewProjectId(projectId);
    setReviewError(null);

    setTimeout(() => {
      reviewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      const reviewData = await api.runReview(projectId);
      setActiveReviewResults(reviewData);

      try {
        const existingExplainability = await api.getExplainability(projectId);
        if (existingExplainability) {
          setActiveExplainabilityResults(existingExplainability);
        }
      } catch {}
    } catch (err: any) {
      setReviewError(err.detail || err.message || "Failed to execute reviewer and conflict synthesis.");
    } finally {
      setRunningReviewProjectId(null);
    }
  };

  const handleGenerateExplainability = async (projectId: string) => {
    setRunningExplainabilityProjectId(projectId);
    setExplainabilityError(null);

    setTimeout(() => {
      explainabilitySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      const explainabilityData = await api.generateExplainability(projectId);
      setActiveExplainabilityResults(explainabilityData);
    } catch (err: any) {
      setExplainabilityError(
        err.detail || err.message || "Failed to generate architecture decision records and C4 visual topology."
      );
    } finally {
      setRunningExplainabilityProjectId(null);
    }
  };

  const handleViewArchitecture = async (projectId: string) => {
    setLoadingArchitectureProjectId(projectId);
    setArchitectureError(null);

    setTimeout(() => {
      architectureSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      const archData = await api.getArchitecture(projectId);
      setActiveArchitectureResults(archData);
    } catch (err: any) {
      setArchitectureError(
        err.detail || err.message || "Failed to load normalized architecture model and traceability matrix."
      );
    } finally {
      setLoadingArchitectureProjectId(null);
    }
  };

  const handleChallengeArchitecture = async (projectId: string, scenarioId?: string) => {
    setChallengeError(null);
    const targetScenario = scenarioId || "redis_unavailable";

    setTimeout(() => {
      challengeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      // 1. Fetch available scenarios if not already loaded
      let loadedScenarios = challengeScenarios;
      if (loadedScenarios.length === 0) {
        loadedScenarios = await api.getChallengeScenarios(projectId);
        setChallengeScenarios(loadedScenarios);
      }

      // 2. Fetch past challenge runs
      const pastRuns = await api.getChallengeRuns(projectId);
      setPastChallengeRuns(pastRuns);

      // 3. If past runs exist and no explicit scenario was requested, show the latest run
      if (!scenarioId && pastRuns.length > 0) {
        setActiveChallengeRun(pastRuns[0]);
      } else {
        // Run specific scenario
        await handleRunSpecificScenario(targetScenario, projectId);
      }
    } catch (err: any) {
      setChallengeError(
        err.detail || err.message || "Failed to initialize architecture challenge engine."
      );
    }
  };

  const handleRunSpecificScenario = async (scenarioId: string, explicitProjectId?: string) => {
    const pId = explicitProjectId || activeProjectForAnalysis?.id || latestProject?.id;
    if (!pId) return;

    const scDef = challengeScenarios.find((s) => s.id === scenarioId);
    setRunningScenarioName(scDef?.name || scenarioId);
    setRunningChallengeProjectId(pId);
    setChallengeError(null);

    try {
      const runResult = await api.runChallenge(pId, scenarioId);
      setActiveChallengeRun(runResult);
      setPastChallengeRuns((prev) => [
        runResult,
        ...prev.filter((r) => r.id !== runResult.id),
      ]);
    } catch (err: any) {
      setChallengeError(
        err.detail || err.message || `Failed to execute challenge simulation for scenario '${scenarioId}'.`
      );
    } finally {
      setRunningChallengeProjectId(null);
      setRunningScenarioName(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Intro */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/80 border border-red-500/40 text-red-300 text-xs font-mono shadow-lg shadow-red-950/40">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          <span>Phase 8 — Challenge My Architecture & AI Fault Injection Active</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Architectural Blueprint & Resilience Verification
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Transform requirements into evidence-backed, multi-agent reviewed system architectures with formal MADR records, C4 visual topologies, and interactive fault simulation.
        </p>
      </div>

      {/* Main Action Area: Project Form */}
      <section aria-labelledby="design-architecture-title">
        <ProjectForm onProjectCreated={handleProjectCreated} />
      </section>

      {/* Active Project Banner */}
      {latestProject && (
        <section aria-label="Latest Created Project" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
              Active Project Instance
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Ready for Architecture Pipeline
            </span>
          </div>
          <ProjectCard
            project={latestProject}
            isLatest={true}
            onAnalyze={handleAnalyzeRequirement}
            isAnalyzing={analyzingProjectId === latestProject.id}
          />
        </section>
      )}

      {/* Requirement Engine Analysis Container (Anchor) */}
      <div ref={analysisSectionRef} className="space-y-4">
        {/* Loading State */}
        {analyzingProjectId && <AnalysisLoadingState />}

        {/* Error Banner */}
        {analysisError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div>
              <h4 className="text-sm font-bold font-mono">Requirement Engine Analysis Error</h4>
              <p className="text-xs font-mono mt-1 text-rose-200">{analysisError}</p>
            </div>
          </div>
        )}

        {/* Structured Analysis Results View */}
        {activeAnalysis && !analyzingProjectId && (
          <RequirementAnalysisView
            response={activeAnalysis}
            projectName={activeProjectForAnalysis?.name}
            onReanalyze={() => activeProjectForAnalysis && handleAnalyzeRequirement(activeProjectForAnalysis)}
            isReanalyzing={analyzingProjectId === activeProjectForAnalysis?.id}
            onRunAgents={() => activeProjectForAnalysis && handleRunAgents(activeProjectForAnalysis.id)}
            isRunningAgents={runningAgentsProjectId === activeProjectForAnalysis?.id}
          />
        )}
      </div>

      {/* Multi-Agent Architecture Review Container (Anchor) */}
      <div ref={agentsSectionRef} className="space-y-4">
        {/* Agent Running Loading State */}
        {runningAgentsProjectId && <AgentRunningState />}

        {/* Agent Review Error Banner */}
        {agentReviewError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div>
              <h4 className="text-sm font-bold font-mono">Multi-Agent Review Execution Error</h4>
              <p className="text-xs font-mono mt-1 text-rose-200">{agentReviewError}</p>
            </div>
          </div>
        )}

        {/* Multi-Agent Results View */}
        {activeAgentResults && !runningAgentsProjectId && (
          <AgentResultsView
            results={activeAgentResults}
            projectName={activeProjectForAnalysis?.name}
            onRerunAgents={() => activeProjectForAnalysis && handleRunAgents(activeProjectForAnalysis.id)}
            isRunningAgents={runningAgentsProjectId === activeProjectForAnalysis?.id}
            onRunReview={() => activeProjectForAnalysis && handleRunReview(activeProjectForAnalysis.id)}
            isRunningReview={runningReviewProjectId === activeProjectForAnalysis?.id}
          />
        )}
      </div>

      {/* Reviewer & Conflict Engine Container (Anchor) */}
      <div ref={reviewSectionRef} className="space-y-4">
        {/* Review Synthesis Loading State */}
        {runningReviewProjectId && <ReviewLoadingState />}

        {/* Review Error Banner */}
        {reviewError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div>
              <h4 className="text-sm font-bold font-mono">Reviewer & Conflict Engine Error</h4>
              <p className="text-xs font-mono mt-1 text-rose-200">{reviewError}</p>
            </div>
          </div>
        )}

        {/* Review Synthesis Results View */}
        {activeReviewResults && !runningReviewProjectId && (
          <ReviewResultsView
            review={activeReviewResults}
            onRerunReview={() => activeProjectForAnalysis && handleRunReview(activeProjectForAnalysis.id)}
            isLoading={runningReviewProjectId === activeProjectForAnalysis?.id}
            onGenerateExplainability={() => activeProjectForAnalysis && handleGenerateExplainability(activeProjectForAnalysis.id)}
            isGeneratingExplainability={runningExplainabilityProjectId === activeProjectForAnalysis?.id}
          />
        )}
      </div>

      {/* Phase 6 Decision & Explainability Container (Anchor) */}
      <div ref={explainabilitySectionRef} className="space-y-4">
        {/* Explainability Synthesis Loading State */}
        {runningExplainabilityProjectId && <ExplainabilityLoadingState />}

        {/* Explainability Error Banner */}
        {explainabilityError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div>
              <h4 className="text-sm font-bold font-mono">Decision & Explainability Engine Error</h4>
              <p className="text-xs font-mono mt-1 text-rose-200">{explainabilityError}</p>
            </div>
          </div>
        )}

        {/* Explainability Results View (ADR Viewer & C4 Visualizer) */}
        {activeExplainabilityResults && !runningExplainabilityProjectId && (
          <ExplainabilityView
            explainability={activeExplainabilityResults}
            projectName={activeProjectForAnalysis?.name}
            onRerunExplainability={() => activeProjectForAnalysis && handleGenerateExplainability(activeProjectForAnalysis.id)}
            isLoading={runningExplainabilityProjectId === activeProjectForAnalysis?.id}
            onOpenArchitecture={() => activeProjectForAnalysis && handleViewArchitecture(activeProjectForAnalysis.id)}
          />
        )}
      </div>

      {/* Phase 7 Final Architecture Workspace Container (Anchor) */}
      <div ref={architectureSectionRef} className="space-y-4">
        {/* Loading State */}
        {loadingArchitectureProjectId && (
          <div className="w-full p-8 rounded-2xl bg-surface-200/80 border border-emerald-500/40 shadow-2xl backdrop-blur-md text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-white font-mono">
              Loading Final Architecture Workspace...
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Synthesizing normalized components, security perimeters, and requirement traceability matrix...
            </p>
          </div>
        )}

        {/* Error Banner */}
        {architectureError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div>
              <h4 className="text-sm font-bold font-mono">Architecture Workspace Error</h4>
              <p className="text-xs font-mono mt-1 text-rose-200">{architectureError}</p>
            </div>
          </div>
        )}

        {/* Final Architecture Workspace View */}
        {activeArchitectureResults && !loadingArchitectureProjectId && (
          <ArchitectureView
            architecture={activeArchitectureResults}
            projectName={activeProjectForAnalysis?.name}
            onRefresh={() => activeProjectForAnalysis && handleViewArchitecture(activeProjectForAnalysis.id)}
            onChallenge={() => activeProjectForAnalysis && handleChallengeArchitecture(activeProjectForAnalysis.id)}
            isLoading={loadingArchitectureProjectId === activeProjectForAnalysis?.id}
          />
        )}
      </div>

      {/* Phase 8 Challenge My Architecture Container (Anchor) */}
      <div ref={challengeSectionRef} className="space-y-4">
        {/* Challenge Running Loading State */}
        {runningChallengeProjectId && (
          <ChallengeLoadingState scenarioName={runningScenarioName || undefined} />
        )}

        {/* Challenge Error Banner */}
        {challengeError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-3 text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
            <div>
              <h4 className="text-sm font-bold font-mono">Architecture Challenge Simulation Error</h4>
              <p className="text-xs font-mono mt-1 text-rose-200">{challengeError}</p>
            </div>
          </div>
        )}

        {/* Challenge Interactive Results View */}
        {(challengeScenarios.length > 0 || activeChallengeRun || pastChallengeRuns.length > 0) && (
          <ChallengeView
            scenarios={challengeScenarios}
            activeRun={activeChallengeRun}
            pastRuns={pastChallengeRuns}
            architecture={activeArchitectureResults}
            isRunning={!!runningChallengeProjectId}
            onRunScenario={(scenarioId) => handleRunSpecificScenario(scenarioId)}
            onSelectPastRun={(run) => setActiveChallengeRun(run)}
          />
        )}
      </div>

      {/* System Capabilities Matrix */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 pt-4 border-t border-surface-50/60">
        <div className="p-4 rounded-xl bg-surface-200/40 border border-indigo-500/40">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-3">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Architecture</h3>
          <p className="text-xs text-slate-400 mt-1">
            Service topology, domain boundaries, state models, and scale invariants.
          </p>
          <span className="inline-block mt-3 text-[10px] font-mono text-emerald-400 font-semibold">Active (Phase 3)</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-200/40 border border-emerald-500/40">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Security</h3>
          <p className="text-xs text-slate-400 mt-1">
            Zero-trust threat modeling, auth flows, and perimeter isolation.
          </p>
          <span className="inline-block mt-3 text-[10px] font-mono text-emerald-400 font-semibold">Active (Phase 3)</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-200/40 border border-amber-500/40">
          <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/50 flex items-center justify-center text-amber-400 mb-3">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Reliability</h3>
          <p className="text-xs text-slate-400 mt-1">
            Circuit breakers, backpressure, failover patterns, and latency budgets.
          </p>
          <span className="inline-block mt-3 text-[10px] font-mono text-emerald-400 font-semibold">Active (Phase 3)</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-200/40 border border-cyan-500/40 shadow-lg shadow-cyan-950/20">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center text-cyan-400 mb-3">
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Reviewer</h3>
          <p className="text-xs text-slate-400 mt-1">
            Cross-agent conflict detection, trade-offs, and adjudicated verdicts.
          </p>
          <span className="inline-block mt-3 text-[10px] font-mono text-cyan-400 font-semibold">Active (Phase 4)</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-200/40 border border-emerald-500/50 shadow-lg shadow-emerald-950/20">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-3">
            <BookOpen className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">RAG Evidence</h3>
          <p className="text-xs text-slate-400 mt-1">
            Vector search over engineering literature to ground verdicts in empirical evidence.
          </p>
          <span className="inline-block mt-3 text-[10px] font-mono text-emerald-400 font-semibold">Active (Phase 5)</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-200/40 border border-indigo-500/60 shadow-lg shadow-indigo-950/30">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400 mb-3">
            <FileCode className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">ADR & C4 Engine</h3>
          <p className="text-xs text-slate-400 mt-1">
            MADR Architecture Decision Records & interactive 3-tier C4 Model visualizer.
          </p>
          <span className="inline-block mt-3 text-[10px] font-mono text-indigo-400 font-semibold">Active (Phase 6)</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-200/40 border border-emerald-500/60 shadow-lg shadow-emerald-950/30">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400 mb-3">
            <GitCommit className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Architecture View</h3>
          <p className="text-xs text-slate-400 mt-1">
            Unified interactive architecture graph & end-to-end requirement traceability.
          </p>
          <span className="inline-block mt-3 text-[10px] font-mono text-emerald-400 font-semibold">Active (Phase 7)</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-200/40 border border-red-500/60 shadow-lg shadow-red-950/30">
          <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-800/50 flex items-center justify-center text-red-400 mb-3">
            <Flame className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Challenge Engine</h3>
          <p className="text-xs text-slate-400 mt-1">
            Realistic failure & scale chaos simulation, blast radius analysis, and mitigations.
          </p>
          <span className="inline-block mt-3 text-[10px] font-mono text-red-400 font-semibold">Active (Phase 8)</span>
        </div>
      </section>

      {/* Projects History Section */}
      <section aria-labelledby="all-projects-title" className="pt-2">
        <ProjectList
          projects={projects}
          isLoading={isLoading}
          onRefresh={loadProjects}
          latestProjectId={latestProject?.id}
          onAnalyze={handleAnalyzeRequirement}
          analyzingProjectId={analyzingProjectId}
        />
      </section>
    </div>
  );
}
