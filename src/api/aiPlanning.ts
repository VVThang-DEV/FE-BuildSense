import { apiClient } from "./client";

// ────────────────────────────────────────
// AI project planning (preview → edit → confirm)
// Owning PM only. Generation is a stateless preview —
// nothing persists until confirm.
// ────────────────────────────────────────

export type AiProposedPhase = {
  /** Temporary client-stable ID, e.g. "PH-P01". */
  tempId: string;
  /** Stable key used to link tasks across renames. */
  aiKey?: string;
  name: string;
  description?: string | null;
  sequenceOrder?: number;
  baselineStart: string;
  baselineEnd?: string;
  /** Required at confirm — must reference an existing work category. */
  workCategoryId?: number;
  [key: string]: unknown;
};

export type AiProposedTask = {
  tempId?: string;
  aiKey?: string;
  name: string;
  /** Exactly one of phaseTempId (proposal phase) or phaseId (existing phase). */
  phaseTempId?: string;
  phaseId?: number;
  baselineStart: string;
  baselineEnd?: string;
  plannedBudget?: number;
  [key: string]: unknown;
};

/**
 * Structured brief the frontend owns (preferred over legacy answers).
 * Validation mirrors the backend: required fields, positive numbers,
 * specialRequirements ≤ 2000 chars. When both are sent, brief wins.
 */
export type AiProjectBrief = {
  projectType: string;
  floorAreaM2: number;
  numberOfFloors: number;
  startDate: string;
  /** On or after startDate. */
  endDate: string;
  budget?: number;
  specialRequirements?: string;
};

export type AiPlanInput = { brief: AiProjectBrief } | { answers: string[] };

export type AiPlanPreviewResponse = {
  phases: AiProposedPhase[];
  tasks?: AiProposedTask[];
  warnings?: string[];
  [key: string]: unknown;
};

export type AiPlanConfirmMapping = {
  tempId: string;
  phaseId?: number;
  taskId?: number;
  [key: string]: unknown;
};

export type AiPlanConfirmResponse = {
  phaseMapping?: AiPlanConfirmMapping[];
  taskMapping?: AiPlanConfirmMapping[];
  mappings?: AiPlanConfirmMapping[];
  [key: string]: unknown;
};

function readField<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  const lower = Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.toLowerCase(), value]),
  );
  for (const key of keys) {
    const value = lower[key.toLowerCase()];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
}

function normalizePhase(raw: Record<string, unknown>, index: number): AiProposedPhase {
  const { ...rest } = raw;
  return {
    ...rest,
    // Empty TempId marks an existing phase as a reference entry (from
    // `complete`): strip it before `confirm`, keep PhaseId links on tasks.
    tempId: readField<string | number>(raw, "tempId", "phaseTempId", "id")?.toString() ?? "",
    aiKey: readField<string>(raw, "aiKey", "key"),
    name: String(readField<string>(raw, "name", "phaseName", "title") ?? `Phase ${index + 1}`),
    description: readField<string | null>(raw, "description"),
    sequenceOrder: readField<number>(raw, "sequenceOrder", "order") ?? index + 1,
    baselineStart: String(readField<string>(raw, "baselineStart", "startDate") ?? ""),
    baselineEnd: readField<string>(raw, "baselineEnd", "endDate"),
    workCategoryId: readField<number>(raw, "workCategoryId", "categoryId"),
  };
}

function normalizeTask(raw: Record<string, unknown>, index: number): AiProposedTask {
  const { ...rest } = raw;
  return {
    ...rest,
    tempId: readField<string | number>(raw, "tempId", "taskTempId", "id")?.toString(),
    aiKey: readField<string>(raw, "aiKey", "key"),
    name: String(readField<string>(raw, "name", "taskName", "title") ?? `Task ${index + 1}`),
    phaseTempId: readField<string>(raw, "phaseTempId"),
    phaseId: readField<number>(raw, "phaseId"),
    baselineStart: String(readField<string>(raw, "baselineStart", "startDate") ?? ""),
    baselineEnd: readField<string>(raw, "baselineEnd", "endDate"),
    plannedBudget: readField<number>(raw, "plannedBudget", "budget"),
  };
}

export function normalizeAiPlanPreview(raw: unknown): AiPlanPreviewResponse {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const phases = (readField<Record<string, unknown>[]>(obj, "phases") ?? []).map(normalizePhase);
  const tasks = readField<Record<string, unknown>[]>(obj, "tasks")?.map(normalizeTask);
  const warnings = readField<unknown[]>(obj, "warnings")?.map((w) => String(w));
  return { ...obj, phases, ...(tasks ? { tasks } : {}), ...(warnings ? { warnings } : {}) };
}

export const aiPlanningApi = {
  /** Preview phase proposals from the brief (preferred) or legacy answers. Persists nothing. */
  generatePhases: async (projectId: number, input: AiPlanInput) => {
    const response = await apiClient.post<unknown>(
      `/api/Projects/${projectId}/ai/phases:generate`,
      input,
    );
    return {
      ...response,
      result: response.result ? normalizeAiPlanPreview(response.result) : undefined,
    };
  },
  /**
   * Preview task proposals. Provide exactly one phase source: an existing
   * phaseId, or the (possibly edited) phases echo from phases:generate.
   */
  generateTasks: async (
    projectId: number,
    input: AiPlanInput,
    phaseSource: { phaseId: number } | { phases: AiProposedPhase[] },
  ) => {
    const response = await apiClient.post<unknown>(
      `/api/Projects/${projectId}/ai/tasks:generate`,
      { ...input, ...phaseSource },
    );
    return {
      ...response,
      result: response.result ? normalizeAiPlanPreview(response.result) : undefined,
    };
  },
  /**
   * "AI finish the planning for me": previews only the remaining work given
   * the current project state, brief, and optional focus note.
   */
  complete: async (projectId: number, input: AiPlanInput, focusNote?: string) => {
    const response = await apiClient.post<unknown>(`/api/Projects/${projectId}/ai/complete`, {
      ...input,
      ...(focusNote?.trim() ? { focusNote: focusNote.trim() } : {}),
    });
    return {
      ...response,
      result: response.result ? normalizeAiPlanPreview(response.result) : undefined,
    };
  },
  /** Persist the PM-edited proposal. Returns temp-ID → real-ID mapping (HTTP 201). */
  confirm: (projectId: number, phases: AiProposedPhase[], tasks: AiProposedTask[]) =>
    apiClient.post<AiPlanConfirmResponse>(`/api/Projects/${projectId}/ai/confirm`, {
      phases,
      tasks,
    }),
};

// ────────────────────────────────────────
// Generic AI construction planner (staff only)
// ────────────────────────────────────────

export type PlannerQuestionsResponse = {
  questions: string[];
  [key: string]: unknown;
};

export const aiPlannerApi = {
  questions: async () => {
    const response = await apiClient.get<unknown>("/api/AiConstructionPlanner/questions");
    if (!response.result) return { ...response, result: { questions: [] } };
    const obj = response.result as Record<string, unknown>;
    const raw = readField<unknown[]>(obj, "questions", "items") ?? [];
    return {
      ...response,
      result: { ...obj, questions: raw.map((q) => String(typeof q === "string" ? q : readField(q as Record<string, unknown>, "question", "text", "title") ?? q)) },
    };
  },
  generateJson: (answers: string[], projectId?: number) =>
    apiClient.post<unknown>("/api/AiConstructionPlanner/generate-json", {
      ...(projectId ? { projectId } : {}),
      answers,
    }),
  /**
   * Build an Excel workbook from a generated plan. Expects the `plan` object
   * returned by `generate-json`; invalid/missing plan returns HTTP 400.
   */
  generateExcel: (plan: unknown, projectId?: number, fileName?: string) =>
    apiClient.downloadPost("/api/AiConstructionPlanner/generate-excel", {
      ...(projectId ? { projectId } : {}),
      plan,
      ...(fileName ? { fileName } : {}),
    }),
};
