import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { projects as mockProjects } from "@/lib/mock-data";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { useSession } from "@/lib/session";
import { projectsApi } from "@/api/projects";

export const Route = createFileRoute("/app/projects")({
  head: () => ({ meta: [{ title: "Projects — BuildSense AI" }] }),
  component: ProjectsList,
});

const STATUS_HEALTH: Record<string, "on-track" | "at-risk" | "delayed"> = {
  PLANNING: "on-track", IN_PROGRESS: "on-track", COMPLETED: "on-track", DELAYED: "delayed",
};

function ProjectsList() {
  const session = useSession();
  const isLive = !!session?.token;

  const { data: liveProjects, isLoading, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await projectsApi.getAll();
      if (!res.isSuccess) throw new Error(res.errorMessage ?? "Failed");
      return res.result ?? [];
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ projectName: "", address: "", startDate: "" });
  const submitCreate = async () => {
    if (!form.projectName.trim() || !form.startDate) { toast.error("Project name and start date are required"); return; }
    const r = await projectsApi.create({ projectName: form.projectName, address: form.address || undefined, startDate: form.startDate });
    if (r.isSuccess) {
      toast.success("Project created");
      setCreating(false);
      setForm({ projectName: "", address: "", startDate: "" });
      refetch();
    } else toast.error(r.errorMessage ?? "Create failed");
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Overview"
        title="Projects"
        description="All active and planned house builds across the community."
        actions={
          isLive ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New project
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-xs" onClick={() => toast.info("New project wizard (demo)")}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New project
            </Button>
          )
        }
      />

      {isLive && (
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent>
            <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Project name</Label>
                <Input value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} placeholder="Block A — Tower 1" />
              </div>
              <div>
                <Label>Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Main St, District 1" />
              </div>
              <div>
                <Label>Start date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={submitCreate}>Create project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLive ? (
            isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading projects…</div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Project</TableHead><TableHead>Address</TableHead>
                  <TableHead>Status</TableHead><TableHead>Start date</TableHead><TableHead>Created</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(liveProjects ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No projects yet — create one above</TableCell></TableRow>
                  )}
                  {(liveProjects ?? []).map((p) => (
                    <TableRow key={p.projectId} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link to="/app/projects/$id" params={{ id: String(p.projectId) }} className="hover:underline">{p.projectName}</Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.address ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={cn(healthConfig[STATUS_HEALTH[p.status] ?? "on-track"].cls)}>{p.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-sm">{new Date(p.startDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm">{new Date(p.createdDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Project</TableHead><TableHead>Customer</TableHead>
                <TableHead>Health</TableHead><TableHead>Progress</TableHead>
                <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Spent</TableHead>
                <TableHead>Handover</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {mockProjects.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link to="/app/projects/$id" params={{ id: p.id }} className="hover:underline">{p.name}</Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.customer}</TableCell>
                    <TableCell><Badge variant="outline" className={cn(healthConfig[p.health].cls)}>{healthConfig[p.health].label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${p.percent}%` }} />
                        </div>
                        <span className="text-xs tabular-nums">{p.percent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">₹{(p.budget / 100000).toFixed(1)}L</TableCell>
                    <TableCell className="text-right tabular-nums">₹{(p.spent / 100000).toFixed(1)}L</TableCell>
                    <TableCell className="text-sm">{p.end}</TableCell>
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
