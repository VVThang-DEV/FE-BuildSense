import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { useSession } from "@/lib/session";
import { projectsApi, type AiImportDraftProject, type AiImportPlanPreview } from "@/api/projects";
import { aiPlanningApi, normalizeAiPlanPreview } from "@/api/aiPlanning";
import { usersApi } from "@/api/users";
import { requireApiResult } from "@/api/client";

export const Route = createFileRoute("/app/projects")({
  head: () => ({ meta: [{ title: "Projects - BuildSense AI" }] }),
  component: ProjectsRoute,
});

const STATUS_HEALTH: Record<string, "on-track" | "at-risk" | "delayed"> = {
  PLANNING: "on-track",
  IN_PROGRESS: "on-track",
  COMPLETED: "on-track",
  DELAYED: "delayed",
};

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function addDays(value: string, days: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function ProjectsRoute() {
  const projectDetailMatch = useMatch({ from: "/app/projects/$id", shouldThrow: false });
  return projectDetailMatch ? <Outlet /> : <ProjectsList />;
}

function ProjectsList() {
  const session = useSession();
  const isLive = !!session?.token;
  const canManageProjects = session?.role === "PM";
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<"direct" | "ai">("direct");
  const [aiPreview, setAiPreview] = useState<{
    draft: AiImportDraftProject | null;
    plan: AiImportPlanPreview;
  } | null>(null);
  const [pendingAiPlan, setPendingAiPlan] = useState<AiImportPlanPreview | null>(null);
  const [form, setForm] = useState({
    projectName: "",
    address: "",
    totalProjectBudget: "0",
    startDate: "",
    baselineEnd: "",
    customerUserId: "",
  });

  const {
    data: liveProjects,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await projectsApi.getAll();
      return requireApiResult(response, "Could not load projects") ?? [];
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const customersQuery = useQuery({
    queryKey: ["users", "customers", "create-form"],
    queryFn: async () => {
      const response = await usersApi.getCustomers();
      if (!response.isSuccess) throw new Error(response.errorMessage ?? "Could not load customers");
      return response.result ?? [];
    },
    enabled: isLive && canManageProjects && creating,
    staleTime: 30_000,
  });

  const emptyForm = () => ({
    projectName: "",
    address: "",
    totalProjectBudget: "0",
    startDate: "",
    baselineEnd: "",
    customerUserId: "",
  });

  const submitCreate = async () => {
    if (!form.projectName.trim() || !form.startDate) {
      toast.error("Project name and start date are required");
      return;
    }

    if (form.baselineEnd && form.baselineEnd < form.startDate) {
      toast.error("Baseline end must be on or after the start date");
      return;
    }

    const totalProjectBudget = Number(form.totalProjectBudget);
    if (!Number.isFinite(totalProjectBudget) || totalProjectBudget < 0) {
      toast.error("Project budget must be 0 or greater");
      return;
    }

    if (!session?.userId) {
      toast.error("Could not resolve the signed-in Project Manager");
      return;
    }

    setSaving(true);
    try {
      const response = await projectsApi.create({
        projectName: form.projectName.trim(),
        address: form.address.trim() || undefined,
        totalProjectBudget,
        startDate: form.startDate,
        pmUserID: session.userId,
        baselineStart: form.startDate,
        baselineEnd: form.baselineEnd || addDays(form.startDate, 90),
        customerUserId: form.customerUserId ? Number(form.customerUserId) : undefined,
      });

      if (response.isSuccess) {
        const createdId =
          typeof response.result === "object" && response.result
            ? response.result.projectId
            : 0;
        toast.success("Project created");
        setCreating(false);
        setForm(emptyForm());
        if (pendingAiPlan && createdId) {
          const plan = pendingAiPlan;
          setPendingAiPlan(null);
          const confirmResponse = await aiPlanningApi.confirm(
            createdId,
            plan.phases,
            plan.tasks ?? [],
          );
          if (!confirmResponse.isSuccess) {
            toast.error(
              confirmResponse.errorMessage ?? "Project created, but the AI plan was not applied",
            );
          } else {
            toast.success(
              `AI plan applied: ${plan.phases.length} phase(s), ${(plan.tasks ?? []).length} task(s) created`,
            );
          }
        }
        refetch();
      } else {
        toast.error(
          response.errorMessage ??
            (typeof response.result === "string" ? response.result : null) ??
            "Create failed",
        );
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setSaving(false);
    }
  };

  const closeImportDialog = () => {
    if (importing) return;
    setImportDialogOpen(false);
    setImportFile(null);
    setImportMode("direct");
    setAiPreview(null);
  };

  const validateImportFile = () => {
    if (!importFile) {
      toast.error("Choose a Word document first");
      return false;
    }
    if (!importFile.name.toLowerCase().endsWith(".docx")) {
      toast.error("Only .docx Word documents are supported");
      return false;
    }
    if (importFile.size > 10 * 1024 * 1024) {
      toast.error("The Word document must be 10 MB or smaller");
      return false;
    }
    return true;
  };

  /** AI import: extract a draft preview. Persists nothing. */
  const submitImportPreview = async () => {
    if (!validateImportFile() || !importFile) return;
    const file = importFile;
    setImporting(true);
    try {
      const response = await projectsApi.importFromWordAi(file);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "AI import preview failed");
        return;
      }
      const raw = (response.result ?? {}) as Record<string, unknown>;
      const plan = normalizeAiPlanPreview(
        (raw.plan ?? raw) as Record<string, unknown>,
      );
      const warnings = Array.isArray(raw.warnings)
        ? raw.warnings.map((w) => String(w))
        : [];
      const draft = (raw.project ?? null) as AiImportDraftProject | null;
      setAiPreview({ draft, plan: { ...plan, warnings } });
      toast.success(
        `Draft extracted: ${plan.phases.length} phase(s), ${(plan.tasks ?? []).length} task(s)`,
      );
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setImporting(false);
    }
  };

  /** Prefill the create form from the draft; the preview confirms after create. */
  const createFromDraft = () => {
    if (!aiPreview) return;
    const draft = aiPreview.draft ?? {};
    const text = (value: unknown) =>
      typeof value === "string" ? value : value == null ? "" : String(value);
    const date = (value: unknown) => text(value).slice(0, 10);
    setForm({
      projectName: text(draft.projectName).slice(0, 200),
      address: text(draft.address).slice(0, 500),
      totalProjectBudget:
        typeof draft.totalProjectBudget === "number" && Number.isFinite(draft.totalProjectBudget)
          ? String(Math.max(0, draft.totalProjectBudget))
          : "0",
      startDate: date(draft.startDate || draft.baselineStart),
      baselineEnd: date(draft.baselineEnd),
      customerUserId: "",
    });
    setPendingAiPlan(aiPreview.plan);
    closeImportDialog();
    setCreating(true);
  };

  const submitImport = async () => {
    if (!validateImportFile() || !importFile) return;
    const file = importFile;

    setImporting(true);
    try {
      const response = await projectsApi.importFromWord(file);
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Project import failed");
        return;
      }

      toast.success(
        response.result?.projectName
          ? `Imported ${response.result.projectName}`
          : "Project imported",
      );
      setImportDialogOpen(false);
      setImportFile(null);
      await refetch();
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Overview"
        title="Projects"
        description="Active and planned construction projects from the backend."
        actions={
          isLive && canManageProjects ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setImportDialogOpen(true)}
              >
                <FileUp className="mr-1 h-3.5 w-3.5" /> Import Word
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New project
              </Button>
            </div>
          ) : undefined
        }
      />

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (open) setImportDialogOpen(true);
          else closeImportDialog();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import project from Word</DialogTitle>
            <DialogDescription>
              {importMode === "direct"
                ? "Upload a structured .docx document. The backend will extract the project details and create the project for your account."
                : "Upload a .docx document to AI-extract a project + phase/task draft preview. Nothing is persisted until you create the project and confirm the plan."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={importMode === "direct" ? "default" : "outline"}
                onClick={() => {
                  setImportMode("direct");
                  setAiPreview(null);
                }}
                disabled={importing}
              >
                Direct import
              </Button>
              <Button
                type="button"
                size="sm"
                variant={importMode === "ai" ? "default" : "outline"}
                onClick={() => setImportMode("ai")}
                disabled={importing}
              >
                AI preview
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-word-file">Word document</Label>
              <Input
                id="project-word-file"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={importing}
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] ?? null);
                  setAiPreview(null);
                }}
              />
              <p className="text-xs text-muted-foreground">DOCX only, up to 10 MB.</p>
            </div>

            {importMode === "direct" && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="mb-2 font-medium text-foreground">Required document labels</p>
                <div className="space-y-1 font-mono">
                  <p>Tên dự án: ...</p>
                  <p>Địa điểm: ...</p>
                  <p>Ngân sách tổng: ...</p>
                  <p>Tiền tệ: VND</p>
                  <p>Ngày thực tế bắt đầu: 2026-07-15</p>
                  <p>Ngày kế hoạch bắt đầu: 2026-07-15</p>
                  <p>Ngày kế hoạch kết thúc: 2027-02-28</p>
                </div>
                <p className="mt-2">Use YYYY-MM-DD for reliable date parsing.</p>
              </div>
            )}

            {importMode === "ai" && aiPreview && (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">
                  Draft preview — nothing saved yet
                </p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <PreviewField
                    label="Project"
                    value={aiPreview.draft?.projectName ?? "-"}
                  />
                  <PreviewField
                    label="Address"
                    value={aiPreview.draft?.address ?? "-"}
                  />
                  <PreviewField
                    label="Budget"
                    value={
                      typeof aiPreview.draft?.totalProjectBudget === "number"
                        ? aiPreview.draft.totalProjectBudget.toLocaleString()
                        : "-"
                    }
                  />
                  <PreviewField
                    label="Schedule"
                    value={
                      aiPreview.draft?.baselineStart || aiPreview.draft?.baselineEnd
                        ? `${(aiPreview.draft.baselineStart ?? "").slice(0, 10)} → ${(aiPreview.draft.baselineEnd ?? "").slice(0, 10)}`
                        : "-"
                    }
                  />
                </div>
                <div className="text-sm">
                  <p className="font-medium">
                    {aiPreview.plan.phases.length} phase(s)
                    {(aiPreview.plan.tasks ?? []).length > 0 &&
                      ` · ${(aiPreview.plan.tasks ?? []).length} task(s)`}
                  </p>
                  <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {aiPreview.plan.phases.map((phase) => (
                      <li key={phase.tempId} className="font-mono">
                        {phase.tempId} — {phase.name}
                      </li>
                    ))}
                  </ul>
                </div>
                {aiPreview.plan.warnings.length > 0 && (
                  <ul className="space-y-1 text-xs text-warning-foreground">
                    {aiPreview.plan.warnings.map((warning, index) => (
                      <li key={index}>⚠ {warning}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeImportDialog} disabled={importing}>
              Cancel
            </Button>
            {importMode === "direct" ? (
              <Button onClick={submitImport} disabled={importing || !importFile}>
                {importing ? "Importing..." : "Import project"}
              </Button>
            ) : aiPreview ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setAiPreview(null)}
                  disabled={importing}
                >
                  Discard preview
                </Button>
                <Button onClick={createFromDraft} disabled={importing}>
                  Create project from draft
                </Button>
              </>
            ) : (
              <Button onClick={submitImportPreview} disabled={importing || !importFile}>
                {importing ? "Extracting..." : "Generate preview"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={form.projectName}
                onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))}
                maxLength={200}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="project-address">Address</Label>
              <Input
                id="project-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                maxLength={500}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="project-budget">Total project budget (VND)</Label>
              <Input
                id="project-budget"
                type="number"
                min="0"
                step="1000"
                value={form.totalProjectBudget}
                onChange={(e) => setForm((f) => ({ ...f, totalProjectBudget: e.target.value }))}
                disabled={saving}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter 0 only when this project should not enforce a PO budget limit.
              </p>
            </div>
            <div>
              <Label htmlFor="project-start">Start date</Label>
              <Input
                id="project-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div>
              <Label htmlFor="project-end">Baseline end</Label>
              <Input
                id="project-end"
                type="date"
                min={form.startDate || undefined}
                value={form.baselineEnd}
                onChange={(e) => setForm((f) => ({ ...f, baselineEnd: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Customer (optional)</Label>
                {form.customerUserId && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setForm((f) => ({ ...f, customerUserId: "" }))}
                    disabled={saving}
                  >
                    Clear
                  </button>
                )}
              </div>
              <Select
                value={form.customerUserId || undefined}
                onValueChange={(customerUserId) =>
                  setForm((f) => ({ ...f, customerUserId }))
                }
                disabled={saving || customersQuery.isLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      customersQuery.isLoading ? "Loading customers..." : "No customer assigned"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(customersQuery.data ?? []).map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.firstName} {customer.lastName} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customersQuery.isError && (
                <p className="mt-1 text-xs text-destructive">
                  {customersQuery.error instanceof Error
                    ? customersQuery.error.message
                    : "Could not load customers"}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={saving}>
              {saving ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {!isLive ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sign in with a real backend account to view projects.
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading projects...</div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead>Start date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(liveProjects ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No projects yet
                    </TableCell>
                  </TableRow>
                )}
                {(liveProjects ?? []).map((project) => (
                  <TableRow key={project.projectId}>
                    <TableCell className="font-medium">
                      <Link
                        to="/app/projects/$id"
                        params={{ id: String(project.projectId) }}
                        className="hover:underline"
                      >
                        {project.projectName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {project.address ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          healthConfig[STATUS_HEALTH[project.status] ?? "on-track"].cls,
                        )}
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {project.totalProjectBudget.toLocaleString()} {project.currency}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(project.startDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(project.createdDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
