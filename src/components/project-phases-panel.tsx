import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { requireApiResult } from "@/api/client";
import { phasesApi, type PhaseResponse } from "@/api/phases";
import { isClosedProjectStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QueryError } from "@/components/query-error";

type PhaseForm = {
  name: string;
  description: string;
  sequenceOrder: string;
  baselineStart: string;
  baselineEnd: string;
};

function emptyForm(nextOrder: number): PhaseForm {
  return {
    name: "",
    description: "",
    sequenceOrder: String(nextOrder),
    baselineStart: "",
    baselineEnd: "",
  };
}

function phaseStatusClass(status: string): string {
  if (status === "COMPLETED") return "border-success/30 bg-success/10 text-success";
  if (status === "IN_PROGRESS") return "border-primary/30 bg-primary/10 text-primary";
  if (status === "CANCELLED") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-warning/35 bg-warning/10 text-warning-foreground";
}

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export function ProjectPhasesPanel({
  projectId,
  projectStatus,
  canManage,
}: {
  projectId: number;
  projectStatus?: string;
  /** Owning-PM writes; hidden entirely on closed projects. */
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const isClosedProject = isClosedProjectStatus(projectStatus);
  const canEdit = canManage && !isClosedProject;
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<PhaseForm>(() => emptyForm(1));
  const [editing, setEditing] = useState<{ phase: PhaseResponse; form: PhaseForm } | null>(null);
  const [cancelling, setCancelling] = useState<PhaseResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    data: phases = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["phases", projectId],
    queryFn: async () =>
      requireApiResult(await phasesApi.listByProject(projectId), "Could not load phases") ?? [],
    enabled: projectId > 0,
    staleTime: 10_000,
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["phases", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
    ]);

  const validate = (values: PhaseForm) => {
    if (!values.name.trim()) {
      toast.error("Phase name is required");
      return false;
    }
    const order = Number(values.sequenceOrder);
    if (!Number.isInteger(order) || order < 0) {
      toast.error("Sequence order must be a whole number 0 or greater");
      return false;
    }
    if (!values.baselineStart || !values.baselineEnd) {
      toast.error("Baseline start and end are required");
      return false;
    }
    if (new Date(values.baselineEnd) < new Date(values.baselineStart)) {
      toast.error("Baseline end cannot be before baseline start");
      return false;
    }
    return true;
  };

  const submitCreate = async () => {
    if (!validate(form)) return;
    setBusy(true);
    try {
      const response = await phasesApi.create(projectId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sequenceOrder: Number(form.sequenceOrder),
        baselineStart: form.baselineStart,
        baselineEnd: form.baselineEnd,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not create phase");
        if (response.statusCode === 409) await refetch();
        return;
      }
      toast.success(`Phase "${form.name.trim()}" created`);
      setCreateOpen(false);
      setForm(emptyForm(phases.length + 1));
      await invalidate();
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (phase: PhaseResponse) => {
    setEditing({
      phase,
      form: {
        name: phase.name,
        description: phase.description ?? "",
        sequenceOrder: String(phase.sequenceOrder),
        baselineStart: phase.baselineStart.slice(0, 10),
        baselineEnd: phase.baselineEnd.slice(0, 10),
      },
    });
  };

  const submitEdit = async () => {
    if (!editing || !validate(editing.form)) return;
    setBusy(true);
    try {
      const response = await phasesApi.update(editing.phase.phaseId, {
        name: editing.form.name.trim(),
        description: editing.form.description.trim() || undefined,
        sequenceOrder: Number(editing.form.sequenceOrder),
        baselineStart: editing.form.baselineStart,
        baselineEnd: editing.form.baselineEnd,
        rowVersion: editing.phase.rowVersion,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not update phase");
        if (response.statusCode === 409) await refetch();
        return;
      }
      toast.success("Phase updated");
      setEditing(null);
      await invalidate();
    } finally {
      setBusy(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelling) return;
    setBusy(true);
    try {
      const response = await phasesApi.cancel(cancelling.phaseId, {
        rowVersion: cancelling.rowVersion,
      });
      if (!response.isSuccess) {
        toast.error(response.errorMessage ?? "Could not cancel phase");
        if (response.statusCode === 409) await refetch();
        return;
      }
      toast.success(`Phase "${cancelling.name}" cancelled`);
      setCancelling(null);
      await invalidate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Project phases ({phases.length})</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Every task belongs to a phase. Phase names are unique within a project and dates
                must stay inside the project baseline.
                {isClosedProject && " This project is closed and read-only."}
              </p>
            </div>
            {canEdit && (
              <Button
                size="sm"
                onClick={() => {
                  setForm(emptyForm(phases.length + 1));
                  setCreateOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New phase
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading phases...</div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : phases.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No phases yet. {canEdit ? "Create the first phase to start planning tasks." : ""}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Baseline</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {phases.map((phase) => (
                  <TableRow key={phase.phaseId}>
                    <TableCell className="tabular-nums">{phase.sequenceOrder}</TableCell>
                    <TableCell>
                      <p className="font-medium">{phase.name}</p>
                      {phase.description && (
                        <p className="text-xs text-muted-foreground">{phase.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDate(phase.baselineStart)} → {formatDate(phase.baselineEnd)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={phaseStatusClass(phase.status)}>
                        {phase.status}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => openEdit(phase)}
                            disabled={busy}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                          </Button>
                          {phase.status !== "COMPLETED" && phase.status !== "CANCELLED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-destructive"
                              onClick={() => setCancelling(phase)}
                              disabled={busy}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New phase</DialogTitle>
          </DialogHeader>
          <PhaseFormFields form={form} onChange={setForm} disabled={busy} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={busy}>
              {busy ? "Creating..." : "Create phase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit phase</DialogTitle>
          </DialogHeader>
          {editing && (
            <PhaseFormFields
              form={editing.form}
              onChange={(form) => setEditing((current) => (current ? { ...current, form } : current))}
              disabled={busy}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={busy}>
              {busy ? "Saving..." : "Save phase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && !busy && setCancelling(null)}
        title={`Cancel phase "${cancelling?.name ?? ""}"?`}
        description="Tasks under a cancelled phase can no longer accept new work. This cannot be undone from here."
        confirmLabel="Cancel phase"
        destructive
        busy={busy}
        onConfirm={submitCancel}
      />
    </div>
  );
}

function PhaseFormFields({
  form,
  onChange,
  disabled,
}: {
  form: PhaseForm;
  onChange: (form: PhaseForm) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <div>
          <Label htmlFor="phase-name">Name *</Label>
          <Input
            id="phase-name"
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            maxLength={200}
            placeholder="Foundation"
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="phase-order">Order</Label>
          <Input
            id="phase-order"
            type="number"
            min="0"
            step="1"
            value={form.sequenceOrder}
            onChange={(event) => onChange({ ...form, sequenceOrder: event.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="phase-description">Description</Label>
        <Textarea
          id="phase-description"
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          maxLength={1000}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="phase-start">Baseline start *</Label>
          <Input
            id="phase-start"
            type="date"
            value={form.baselineStart}
            onChange={(event) => onChange({ ...form, baselineStart: event.target.value })}
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="phase-end">Baseline end *</Label>
          <Input
            id="phase-end"
            type="date"
            min={form.baselineStart || undefined}
            value={form.baselineEnd}
            onChange={(event) => onChange({ ...form, baselineEnd: event.target.value })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
