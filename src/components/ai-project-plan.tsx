import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, CheckCircle2, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { requireApiResult } from "@/api/client";
import {
  aiPlanningApi,
  type AiPlanConfirmResponse,
  type AiPlanInput,
  type AiProjectBrief,
  type AiProposedPhase,
  type AiProposedTask,
} from "@/api/aiPlanning";
import { phasesApi } from "@/api/phases";
import type { ProjectResponse } from "@/api/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BriefForm = {
  projectType: string;
  floorAreaM2: string;
  numberOfFloors: string;
  specialRequirements: string;
};

const EMPTY_BRIEF: BriefForm = {
  projectType: "",
  floorAreaM2: "",
  numberOfFloors: "",
  specialRequirements: "",
};

/**
 * Schedule and budget come from the project itself (set at creation),
 * so the PM only enters what the project doesn't already define.
 */
function buildBrief(form: BriefForm, project: ProjectResponse): AiProjectBrief | null {
  if (!form.projectType.trim()) {
    toast.error("Project type is required");
    return null;
  }
  const floorAreaM2 = Number(form.floorAreaM2);
  if (!Number.isFinite(floorAreaM2) || floorAreaM2 <= 0) {
    toast.error("Floor area must be greater than 0 m²");
    return null;
  }
  const numberOfFloors = Number(form.numberOfFloors);
  if (!Number.isInteger(numberOfFloors) || numberOfFloors < 1) {
    toast.error("Number of floors must be 1 or greater");
    return null;
  }
  const startDate = (project.baselineStart || project.startDate).slice(0, 10);
  const endDate = project.baselineEnd.slice(0, 10);
  if (!startDate || !endDate) {
    toast.error("The project needs baseline dates before AI planning");
    return null;
  }
  if (form.specialRequirements.length > 2000) {
    toast.error("Special requirements must be 2,000 characters or fewer");
    return null;
  }
  return {
    projectType: form.projectType.trim(),
    floorAreaM2,
    numberOfFloors,
    startDate,
    endDate,
    budget: project.totalProjectBudget,
    ...(form.specialRequirements.trim()
      ? { specialRequirements: form.specialRequirements.trim() }
      : {}),
  };
}

export function AiProjectPlan({
  projectId,
  project,
}: {
  projectId: number;
  project: ProjectResponse;
}) {
  const queryClient = useQueryClient();
  const [brief, setBrief] = useState<BriefForm>(EMPTY_BRIEF);
  const [focusNote, setFocusNote] = useState("");
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);
  const [phases, setPhases] = useState<AiProposedPhase[] | null>(null);
  const [tasks, setTasks] = useState<AiProposedTask[] | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [phaseSource, setPhaseSource] = useState<string>("proposal");
  const [busy, setBusy] = useState<"phases" | "tasks" | "complete" | "confirm" | null>(null);
  const [confirmation, setConfirmation] = useState<AiPlanConfirmResponse | null>(null);

  const existingPhasesQuery = useQuery({
    queryKey: ["phases", projectId],
    queryFn: async () =>
      requireApiResult(await phasesApi.listByProject(projectId), "Could not load phases") ?? [],
    enabled: projectId > 0,
    staleTime: 10_000,
  });

  const buildInput = (): AiPlanInput | null => {
    const result = buildBrief(brief, project);
    return result ? { brief: result } : null;
  };

  const discardPreview = () => {
    setPhases(null);
    setTasks(null);
    setWarnings([]);
    setConfirmation(null);
    setPhaseSource("proposal");
  };

  const generatePhases = async () => {
    const input = buildInput();
    if (!input) return;
    setBusy("phases");
    try {
      const response = await aiPlanningApi.generatePhases(projectId, input);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not generate phase preview");
        if (response.statusCode === 403)
          toast.error("Only the owning Project Manager can use AI planning");
        return;
      }
      setPhases(response.result?.phases ?? []);
      setTasks(null);
      setWarnings([]);
      setConfirmation(null);
      setPhaseSource("proposal");
      toast.success(`Phase preview ready (${response.result?.phases.length ?? 0} phases)`);
    } finally {
      setBusy(null);
    }
  };

  const generateTasks = async () => {
    const input = buildInput();
    if (!input) return;
    if (!phases || phases.length === 0) {
      toast.error("Generate a phase preview first");
      return;
    }
    setBusy("tasks");
    try {
      const source =
        phaseSource === "proposal" ? { phases } : { phaseId: Number(phaseSource) };
      const response = await aiPlanningApi.generateTasks(projectId, input, source);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not generate task preview");
        return;
      }
      if (response.result?.phases?.length) setPhases(response.result.phases);
      setTasks(response.result?.tasks ?? []);
      setWarnings(response.result?.warnings ?? []);
      setConfirmation(null);
      toast.success(`Task preview ready (${response.result?.tasks?.length ?? 0} tasks)`);
    } finally {
      setBusy(null);
    }
  };

  /** "AI finish the planning for me": preview only the remaining work. */
  const completePlan = async (note: string) => {
    const input = buildInput();
    if (!input) return;
    setBusy("complete");
    try {
      const response = await aiPlanningApi.complete(projectId, input, note);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not complete the plan preview");
        return;
      }
      setPhases(response.result?.phases ?? []);
      setTasks(response.result?.tasks ?? []);
      setWarnings(response.result?.warnings ?? []);
      setConfirmation(null);
      setPhaseSource("proposal");
      toast.success("Remaining-work preview ready — review before confirming");
    } finally {
      setBusy(null);
    }
  };

  const confirmPlan = async () => {
    if (!phases || phases.length === 0) {
      toast.error("Nothing to confirm");
      return;
    }
    // Strip reference entries (empty TempId from `complete`); their tasks keep PhaseId links.
    const newPhases = phases.filter((phase) => phase.tempId);
    if (newPhases.length === 0 && !(tasks ?? []).some((task) => task.phaseId)) {
      toast.error("Nothing new to confirm — the preview only contains existing phases");
      return;
    }
    const finalTasks = tasks ?? [];
    const unlinked = finalTasks.filter((task) => !task.phaseTempId && !task.phaseId);
    if (unlinked.length > 0) {
      toast.error(`${unlinked.length} task(s) are not linked to any phase`);
      return;
    }
    setBusy("confirm");
    try {
      const response = await aiPlanningApi.confirm(projectId, newPhases, finalTasks);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not confirm AI plan");
        if (response.statusCode === 409)
          toast.error("Project closed, duplicate name, or budget cap — review and retry");
        return;
      }
      discardPreview();
      setConfirmation(response.result);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["phases", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["project-material-requirements", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["project-mrp", projectId] }),
      ]);
      toast.success("AI plan confirmed — phases and tasks created");
    } finally {
      setBusy(null);
    }
  };

  const updatePhase = (key: string, update: Partial<AiProposedPhase>) =>
    setPhases((current) =>
      current?.map((phase, i) =>
        phaseKey(phase, i) === key ? { ...phase, ...update } : phase,
      ) ?? null,
    );
  const removePhase = (key: string) => {
    const target = phases?.find((phase, i) => phaseKey(phase, i) === key);
    setPhases((current) => current?.filter((phase, i) => phaseKey(phase, i) !== key) ?? null);
    if (target?.tempId) {
      setTasks((current) => current?.filter((task) => task.phaseTempId !== target.tempId) ?? null);
    }
  };
  const updateTask = (index: number, update: Partial<AiProposedTask>) =>
    setTasks((current) =>
      current?.map((task, i) => (i === index ? { ...task, ...update } : task)) ?? null,
    );
  const removeTask = (index: number) =>
    setTasks((current) => current?.filter((_, i) => i !== index) ?? null);

  const hasPreview = phases !== null || tasks !== null || confirmation !== null;

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BrainCircuit className="h-4 w-4 text-primary" /> AI project planning
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Owning PM only. Generation is a stateless preview — nothing persists until you confirm.
            Rename, re-date, re-budget, or remove items freely; temporary IDs stay stable so tasks
            keep resolving to their phases.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Schedule {formatShortDate(project.baselineStart || project.startDate)} →{" "}
            {formatShortDate(project.baselineEnd)} · Budget{" "}
            {project.totalProjectBudget.toLocaleString()} {project.currency} — taken from the
            project, not entered here.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="ai-brief-type">Project type *</Label>
              <Input
                id="ai-brief-type"
                placeholder="Residential building"
                value={brief.projectType}
                onChange={(event) => setBrief((c) => ({ ...c, projectType: event.target.value }))}
                maxLength={200}
                disabled={busy !== null}
              />
            </div>
            <div>
              <Label htmlFor="ai-brief-area">Floor area (m²) *</Label>
              <Input
                id="ai-brief-area"
                type="number"
                min="0.01"
                step="0.01"
                value={brief.floorAreaM2}
                onChange={(event) => setBrief((c) => ({ ...c, floorAreaM2: event.target.value }))}
                disabled={busy !== null}
              />
            </div>
            <div>
              <Label htmlFor="ai-brief-floors">Number of floors *</Label>
              <Input
                id="ai-brief-floors"
                type="number"
                min="1"
                step="1"
                value={brief.numberOfFloors}
                onChange={(event) =>
                  setBrief((c) => ({ ...c, numberOfFloors: event.target.value }))
                }
                disabled={busy !== null}
              />
            </div>
            <div className="md:col-span-2">
              <div className="flex justify-between gap-2">
                <Label htmlFor="ai-brief-special">Special requirements (optional)</Label>
                <span className="text-xs text-muted-foreground">
                  {brief.specialRequirements.length}/2000
                </span>
              </div>
              <Textarea
                id="ai-brief-special"
                value={brief.specialRequirements}
                onChange={(event) =>
                  setBrief((c) => ({ ...c, specialRequirements: event.target.value }))
                }
                maxLength={2000}
                placeholder="Site constraints, preferred trades, sequencing notes..."
                disabled={busy !== null}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {hasPreview && (
              <Button size="sm" variant="outline" onClick={discardPreview} disabled={busy !== null}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Discard preview
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFocusNote("");
                setFocusDialogOpen(true);
              }}
              disabled={busy !== null || (existingPhasesQuery.data ?? []).length === 0}
              title="Preview only the remaining work based on current phases and tasks"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI finish the planning
            </Button>
            <Button size="sm" onClick={generatePhases} disabled={busy !== null}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy === "phases" ? "animate-spin" : ""}`} />
              {busy === "phases" ? "Generating..." : "Generate phase preview"}
            </Button>
          </div>

          <Dialog open={focusDialogOpen} onOpenChange={setFocusDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI finish the planning</DialogTitle>
              </DialogHeader>
              <div>
                <Label htmlFor="ai-focus-note">Focus note (optional)</Label>
                <Textarea
                  id="ai-focus-note"
                  value={focusNote}
                  onChange={(event) => setFocusNote(event.target.value)}
                  maxLength={2000}
                  placeholder="e.g. prioritize the remaining structural work"
                  disabled={busy !== null}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The AI reads the current phases and tasks and previews only the remaining work.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setFocusDialogOpen(false)}
                  disabled={busy !== null}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setFocusDialogOpen(false);
                    completePlan(focusNote);
                  }}
                  disabled={busy !== null}
                >
                  {busy === "complete" ? "Completing..." : "Generate remaining plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card className="border-warning/40 shadow-sm">
          <CardContent className="space-y-1 p-4 text-xs text-warning-foreground">
            <p className="font-medium">AI warnings — duplicates or unresolvable items were dropped:</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {phases && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Phase proposal ({phases.length})
              <Badge variant="outline" className="border-ai/30 bg-ai/10 text-ai">
                AI preview — not saved yet
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {phases.length === 0 && (
              <p className="text-sm text-muted-foreground">The preview returned no phases.</p>
            )}
            {phases.map((phase, index) => {
              const key = phaseKey(phase, index);
              const isReference = !phase.tempId;
              return (
                <div
                  key={key}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[100px_minmax(0,1fr)_150px_150px_36px]"
                >
                  <div>
                    <Label className="text-xs">Temp ID</Label>
                    <p className="font-mono text-xs">
                      {phase.tempId || "reference"}
                    </p>
                    {isReference && (
                      <p className="text-[10px] text-muted-foreground">Existing phase</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={phase.name}
                      maxLength={200}
                      onChange={(event) => updatePhase(key, { name: event.target.value })}
                      disabled={busy !== null || isReference}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Baseline start</Label>
                    <Input
                      type="date"
                      value={(phase.baselineStart ?? "").slice(0, 10)}
                      onChange={(event) =>
                        updatePhase(key, { baselineStart: event.target.value })
                      }
                      disabled={busy !== null || isReference}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Baseline end</Label>
                    <Input
                      type="date"
                      value={(phase.baselineEnd ?? "").slice(0, 10)}
                      onChange={(event) =>
                        updatePhase(key, { baselineEnd: event.target.value })
                      }
                      disabled={busy !== null || isReference}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive"
                      onClick={() => removePhase(key)}
                      disabled={busy !== null || isReference}
                      aria-label={`Remove phase ${phase.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-52 flex-1">
                <Label>Task generation scope</Label>
                <Select value={phaseSource} onValueChange={setPhaseSource} disabled={busy !== null}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Proposal phases above (by stable key)</SelectItem>
                    {(existingPhasesQuery.data ?? []).map((phase) => (
                      <SelectItem key={phase.phaseId} value={String(phase.phaseId)}>
                        Existing phase: {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" onClick={generateTasks} disabled={busy !== null}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy === "tasks" ? "animate-spin" : ""}`} />
                {busy === "tasks" ? "Generating..." : "Generate task preview"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tasks && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Task proposal ({tasks.length})
              <Badge variant="outline" className="border-ai/30 bg-ai/10 text-ai">
                AI preview — not saved yet
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground">The preview returned no tasks.</p>
            )}
            {tasks.map((task, index) => (
              <div key={task.tempId ?? index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_150px_150px_130px_170px_36px]">
                <div>
                  <Label className="text-xs">Task</Label>
                  <Input
                    value={task.name}
                    maxLength={200}
                    onChange={(event) => updateTask(index, { name: event.target.value })}
                    disabled={busy !== null}
                  />
                </div>
                <div>
                  <Label className="text-xs">Baseline start</Label>
                  <Input
                    type="date"
                    value={(task.baselineStart ?? "").slice(0, 10)}
                    onChange={(event) => updateTask(index, { baselineStart: event.target.value })}
                    disabled={busy !== null}
                  />
                </div>
                <div>
                  <Label className="text-xs">Baseline end</Label>
                  <Input
                    type="date"
                    value={(task.baselineEnd ?? "").slice(0, 10)}
                    onChange={(event) => updateTask(index, { baselineEnd: event.target.value })}
                    disabled={busy !== null}
                  />
                </div>
                <div>
                  <Label className="text-xs">Budget</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={task.plannedBudget ?? ""}
                    onChange={(event) =>
                      updateTask(index, { plannedBudget: Number(event.target.value) })
                    }
                    disabled={busy !== null}
                  />
                </div>
                <div>
                  <Label className="text-xs">Phase</Label>
                  <Select
                    value={task.phaseTempId ?? (task.phaseId ? `id:${task.phaseId}` : "")}
                    onValueChange={(value) =>
                      value.startsWith("id:")
                        ? updateTask(index, {
                            phaseId: Number(value.slice(3)),
                            phaseTempId: undefined,
                          })
                        : updateTask(index, { phaseTempId: value, phaseId: undefined })
                    }
                    disabled={busy !== null}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      {(phases ?? [])
                        .filter((phase) => phase.tempId)
                        .map((phase) => (
                          <SelectItem key={phase.tempId} value={phase.tempId}>
                            {phase.name} ({phase.tempId})
                          </SelectItem>
                        ))}
                      {(existingPhasesQuery.data ?? []).map((phase) => (
                        <SelectItem key={`id:${phase.phaseId}`} value={`id:${phase.phaseId}`}>
                          Existing: {phase.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-destructive"
                    onClick={() => removeTask(index)}
                    disabled={busy !== null}
                    aria-label={`Remove task ${task.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button size="sm" onClick={confirmPlan} disabled={busy !== null}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                {busy === "confirm" ? "Confirming..." : "Confirm plan (creates phases + tasks)"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {confirmation && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-success" /> Plan confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConfirmationMapping mapping={confirmation} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function phaseKey(phase: AiProposedPhase, index: number): string {
  return phase.tempId || `ref-${index}`;
}

function formatShortDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function ConfirmationMapping({ mapping }: { mapping: AiPlanConfirmResponse }) {
  const rows = mapping.phaseMapping ?? mapping.taskMapping ?? mapping.mappings ?? [];
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Created successfully (no mapping returned).</p>;
  }
  return (
    <ul className="space-y-1 text-sm">
      {rows.map((row, index) => (
        <li key={index} className="font-mono text-xs">
          {row.tempId} →{" "}
          {row.phaseId ? `phase #${row.phaseId}` : row.taskId ? `task #${row.taskId}` : "created"}
        </li>
      ))}
    </ul>
  );
}
