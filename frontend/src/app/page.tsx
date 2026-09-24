"use client";

import React, { useEffect, useState } from "react";
import {
  api,
  Project,
  ProjectCreatePayload,
  RequirementAnalysisResponse,
  ProjectAgentResultsResponse,
  ReviewRunResponse,
  ExplainabilityResponse,
  UnifiedArchitectureResponse,
  ChallengeScenario,
  ChallengeRunResponse,
} from "@/lib/api";
import { PipelineHeader, PipelineStage, StageState } from "@/components/PipelineHeader";
import { ProjectForm } from "@/components/ProjectForm";
import { RequirementAnalysisView } from "@/components/RequirementAnalysisView";
import { AgentRunningState } from "@/components/AgentRunningState";
import { AgentResultsView } from "@/components/AgentResultsView";
import { ReviewResultsView } from "@/components/ReviewResultsView";
import { ArchitectureView } from "@/components/ArchitectureView";
import { ChallengeView } from "@/components/ChallengeView";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loader2, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  // Active Stage in the 6-Stage Pipeline
  const [currentStage, setCurrentStage] = useState<PipelineStage>("requirement");

  // Stage Data States
  const [activeAnalysis, setActiveAnalysis] = useState<RequirementAnalysisResponse | null>(null);
  const [activeAgentResults, setActiveAgentResults] = useState<ProjectAgentResultsResponse | null>(null);
  const [activeReviewResults, setActiveReviewResults] = useState<ReviewRunResponse | null>(null);
  const [activeExplainabilityResults, setActiveExplainabilityResults] = useState<ExplainabilityResponse | null>(null);
  const [activeArchitectureResults, setActiveArchitectureResults] = useState<UnifiedArchitectureResponse | null>(null);
  const [challengeScenarios, setChallengeScenarios] = useState<ChallengeScenario[]>([]);
  const [activeChallengeRun, setActiveChallengeRun] = useState<ChallengeRunResponse | null>(null);
  const [pastChallengeRuns, setPastChallengeRuns] = useState<ChallengeRunResponse[]>([]);

  // Loading & Error States
  const [isCreatingProject, setIsCreatingProject] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRunningAgents, setIsRunningAgents] = useState<boolean>(false);
  const [isRunningReview, setIsRunningReview] = useState<boolean>(false);
  const [isLoadingArchitecture, setIsLoadingArchitecture] = useState<boolean>(false);
  const [isRunningChallenge, setIsRunningChallenge] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // 1. Initial Load: Projects & Health
  const loadInitialData = async () => {
    setIsLoadingProjects(true);
    try {
      const health = await api.getHealth();
      setApiOnline(health.status === "ok");
    } catch {
      setApiOnline(false);
    }

    try {
      const list = await api.getProjects();
      setProjects(list);
      if (list.length > 0 && !activeProject) {
        handleSelectProject(list[0]);
      }
    } catch (err: any) {
      console.error("Failed to load projects:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Select Project & Load Stages
  const handleSelectProject = async (project: Project) => {
    setActiveProject(project);
    setGlobalError(null);
    setErrorDetails(null);

    // Reset downstream data while loading
    setActiveAnalysis(null);
    setActiveAgentResults(null);
    setActiveReviewResults(null);
    setActiveExplainabilityResults(null);
    setActiveArchitectureResults(null);
    setActiveChallengeRun(null);
    setPastChallengeRuns([]);

    try {
      // 1. Check Latest Analysis
      const analysis = await api.getLatestAnalysis(project.id).catch(() => null);
      if (analysis) {
        setActiveAnalysis(analysis);
        setCurrentStage("analysis");

        // 2. Check Agent Results
        const agentResults = await api.getAgentResults(project.id).catch(() => null);
        if (agentResults && (agentResults.status === "ready" || agentResults.status === "partial")) {
          setActiveAgentResults(agentResults);
          setCurrentStage("agents");
        }

        // 3. Check Review Results
        const review = await api.getLatestReview(project.id).catch(() => null);
        if (review && review.output) {
          setActiveReviewResults(review);
          setCurrentStage("review");
        }

        // 4. Check Explainability
        const exp = await api.getExplainability(project.id).catch(() => null);
        if (exp && exp.adrs?.length) {
          setActiveExplainabilityResults(exp);
        }

        // 5. Check Architecture Response
        const arch = await api.getArchitecture(project.id).catch(() => null);
        if (arch && arch.components?.length) {
          setActiveArchitectureResults(arch);
        }

        // 6. Check Challenge Scenarios & Past Runs
        const scenarios = await api.getChallengeScenarios(project.id).catch(() => []);
        setChallengeScenarios(scenarios);
        const challenges = await api.getChallengeRuns(project.id).catch(() => []);
        setPastChallengeRuns(challenges);
        if (challenges.length > 0) {
          setActiveChallengeRun(challenges[0]);
        }
      } else {
        setCurrentStage("requirement");
      }
    } catch (err) {
      console.error("Error loading project state:", err);
    }
  };

  // 3. Action Handlers
  const handleCreateProject = async (payload: ProjectCreatePayload) => {
    setIsCreatingProject(true);
    setGlobalError(null);
    setErrorDetails(null);
    try {
      const newProj = await api.createProject(payload);
      setProjects((prev) => [newProj, ...prev.filter((p) => p.id !== newProj.id)]);
      setActiveProject(newProj);
      await handleAnalyzeRequirement(newProj.id);
    } catch (err: any) {
      setGlobalError("Unable to create project.");
      setErrorDetails(err?.detail || err?.message || String(err));
      setIsCreatingProject(false);
    }
  };

  const handleAnalyzeRequirement = async (projectId: string) => {
    setIsAnalyzing(true);
    setCurrentStage("analysis");
    setGlobalError(null);
    setErrorDetails(null);
    try {
      const res = await api.analyzeRequirement(projectId);
      setActiveAnalysis(res);
    } catch (err: any) {
      setGlobalError("Unable to analyze requirement.");
      setErrorDetails(err?.detail || err?.message || String(err));
    } finally {
      setIsAnalyzing(false);
      setIsCreatingProject(false);
    }
  };

  const handleRunAgents = async () => {
    if (!activeProject) return;
    setIsRunningAgents(true);
    setCurrentStage("agents");
    setGlobalError(null);
    setErrorDetails(null);
    try {
      const res = await api.runAgents(activeProject.id);
      setActiveAgentResults(res);
    } catch (err: any) {
      setGlobalError("Multi-agent evaluation failed.");
      setErrorDetails(err?.detail || err?.message || String(err));
    } finally {
      setIsRunningAgents(false);
    }
  };

  const handleRunReview = async () => {
    if (!activeProject) return;
    setIsRunningReview(true);
    setCurrentStage("review");
    setGlobalError(null);
    setErrorDetails(null);
    try {
      const res = await api.runReview(activeProject.id);
      setActiveReviewResults(res);

      // Preload architecture and explainability in background
      api.generateExplainability(activeProject.id).then((exp) => setActiveExplainabilityResults(exp)).catch(() => {});
      api.getArchitecture(activeProject.id).then((arch) => setActiveArchitectureResults(arch)).catch(() => {});
    } catch (err: any) {
      setGlobalError("Architecture review synthesis failed.");
      setErrorDetails(err?.detail || err?.message || String(err));
    } finally {
      setIsRunningReview(false);
    }
  };

  const handleRunChallengeScenario = async (scenarioId: string) => {
    if (!activeProject) return;
    setIsRunningChallenge(true);
    setGlobalError(null);
    setErrorDetails(null);
    try {
      const run = await api.runChallenge(activeProject.id, scenarioId);
      setActiveChallengeRun(run);
      setPastChallengeRuns((prev) => [run, ...prev.filter((p) => p.id !== run.id)]);
    } catch (err: any) {
      setGlobalError("Unable to run this challenge.");
      setErrorDetails(err?.detail || err?.message || String(err));
    } finally {
      setIsRunningChallenge(false);
    }
  };

  // 4. Compute Stage State for Pipeline Header
  const getStageState = (stage: PipelineStage): StageState => {
    if (stage === currentStage) {
      return "active";
    }

    switch (stage) {
      case "requirement":
        return activeProject ? "completed" : "waiting";
      case "analysis":
        if (isAnalyzing) return "active";
        return activeAnalysis ? "completed" : "waiting";
      case "agents":
        if (isRunningAgents) return "active";
        return activeAgentResults?.status === "ready" ? "completed" : "waiting";
      case "review":
        if (isRunningReview) return "active";
        return activeReviewResults?.output ? "completed" : "waiting";
      case "architecture":
        return activeArchitectureResults ? "completed" : "waiting";
      case "challenge":
        if (isRunningChallenge) return "active";
        return activeChallengeRun ? "completed" : "waiting";
      default:
        return "waiting";
    }
  };

  const getProjectStatusLabel = () => {
    if (activeChallengeRun) return "Review & Resilience Complete";
    if (activeArchitectureResults) return "Architecture Generated";
    if (activeReviewResults?.output) return "Review Complete";
    if (activeAgentResults?.status === "ready") return "Agents Evaluated";
    if (activeAnalysis) return "Analyzed";
    return "Draft";
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      {/* 1. Single Clean Application Header & Pipeline */}
      <PipelineHeader
        currentStage={currentStage}
        onSelectStage={(st) => setCurrentStage(st)}
        getStageState={getStageState}
        activeProject={activeProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onNewProject={() => {
          setActiveProject(null);
          setCurrentStage("requirement");
        }}
        apiOnline={apiOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 2. Project Header Banner (Section 5) */}
        {activeProject && currentStage !== "requirement" && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 font-sans">
                  {activeProject.name}
                </h1>
                <StatusBadge variant="default" size="sm">
                  {getProjectStatusLabel()}
                </StatusBadge>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5 line-clamp-1 max-w-3xl">
                {activeProject.requirement}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-sans shrink-0">
              <span>Updated: {new Date(activeProject.updated_at || activeProject.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {globalError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{globalError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGlobalError(null)}
                className="text-rose-600 hover:text-rose-900 font-bold"
              >
                ✕
              </button>
            </div>
            {errorDetails && (
              <details className="text-[11px] font-mono text-rose-700 pt-1">
                <summary className="cursor-pointer font-sans hover:underline">View Details</summary>
                <pre className="mt-1 p-2 bg-rose-100/60 rounded overflow-x-auto whitespace-pre-wrap">
                  {errorDetails}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 1: REQUIREMENT                                                     */}
        {/* ========================================================================= */}
        {currentStage === "requirement" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <ProjectForm
              onSubmit={handleCreateProject}
              isLoading={isCreatingProject || isAnalyzing}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 2: ANALYSIS                                                        */}
        {/* ========================================================================= */}
        {currentStage === "analysis" && (
          <div className="space-y-6">
            {isAnalyzing ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
                <h3 className="text-sm font-bold font-sans text-slate-900">
                  Requirement Engine Analyzing Specification...
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-sans">
                  Extracting functional capabilities, strict volumetric parameters, and flagging unquantified claims with zero hallucination.
                </p>
              </div>
            ) : activeAnalysis ? (
              <RequirementAnalysisView
                response={activeAnalysis}
                projectName={activeProject?.name}
                onReanalyze={() => activeProject && handleAnalyzeRequirement(activeProject.id)}
                isReanalyzing={isAnalyzing}
                onRunAgents={handleRunAgents}
                isRunningAgents={isRunningAgents}
              />
            ) : (
              <div className="p-12 text-center text-slate-400 font-sans text-xs">
                No requirement analysis available. Please initiate a project first.
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 3: AGENTS                                                          */}
        {/* ========================================================================= */}
        {currentStage === "agents" && (
          <div className="space-y-6">
            {isRunningAgents ? (
              <AgentRunningState />
            ) : activeAgentResults ? (
              <AgentResultsView
                results={activeAgentResults}
                onRerunAgents={handleRunAgents}
                isRerunning={isRunningAgents}
                onRunReview={handleRunReview}
                isRunningReview={isRunningReview}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  Agents Have Not Run Yet
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Dispatch the Architecture, Security, and Reliability agents to formulate independent strategies.
                </p>
                <button
                  type="button"
                  onClick={handleRunAgents}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs font-sans"
                >
                  <span>Launch 3-Agent Review</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 4: REVIEW                                                          */}
        {/* ========================================================================= */}
        {currentStage === "review" && (
          <div className="space-y-6">
            {isRunningReview ? (
              <div className="bg-white border border-indigo-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
                <h3 className="text-sm font-bold font-sans text-slate-900">
                  Principal Architect Adjudicating Decisions...
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto font-sans">
                  Weighing agent trade-offs, retrieving empirical RAG literature, and resolving conflicts without majority-voting bias.
                </p>
              </div>
            ) : activeReviewResults ? (
              <ReviewResultsView
                review={activeReviewResults}
                onRerunReview={handleRunReview}
                isLoading={isRunningReview}
                onProceedToArchitecture={async () => {
                  if (activeProject && !activeArchitectureResults) {
                    setIsLoadingArchitecture(true);
                    const arch = await api.getArchitecture(activeProject.id).catch(() => null);
                    if (arch) setActiveArchitectureResults(arch);
                    setIsLoadingArchitecture(false);
                  }
                  setCurrentStage("architecture");
                }}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  Review Has Not Run Yet
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Synthesize the agent evaluations and generate grounded architectural decisions.
                </p>
                <button
                  type="button"
                  onClick={handleRunReview}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs font-sans"
                >
                  <span>Run Reviewer & Synthesis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 5: ARCHITECTURE                                                    */}
        {/* ========================================================================= */}
        {currentStage === "architecture" && (
          <div className="space-y-6">
            {isLoadingArchitecture ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
                <h3 className="text-sm font-bold font-sans text-slate-900">
                  Synthesizing Unified Architecture Workspace...
                </h3>
              </div>
            ) : activeArchitectureResults ? (
              <ArchitectureView
                architecture={activeArchitectureResults}
                projectName={activeProject?.name}
                onChallenge={() => {
                  if (activeProject && challengeScenarios.length === 0) {
                    api.getChallengeScenarios(activeProject.id).then((sc) => setChallengeScenarios(sc)).catch(() => {});
                  }
                  setCurrentStage("challenge");
                }}
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 font-sans text-xs">
                Architecture blueprint not generated. Run the Review stage to construct the topology graph.
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STAGE 6: CHALLENGE                                                       */}
        {/* ========================================================================= */}
        {currentStage === "challenge" && (
          <div className="space-y-6">
            <ChallengeView
              scenarios={challengeScenarios}
              activeRun={activeChallengeRun}
              pastRuns={pastChallengeRuns}
              architecture={activeArchitectureResults}
              isRunning={isRunningChallenge}
              onRunScenario={handleRunChallengeScenario}
              onSelectPastRun={(run) => setActiveChallengeRun(run)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
