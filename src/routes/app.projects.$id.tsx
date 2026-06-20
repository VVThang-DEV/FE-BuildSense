import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projects, projectMaterialPlan, wbsRows } from "@/lib/mock-data";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { useSession } from "@/lib/session";
import { projectsApi } from "@/api/projects";
import { MockDataBanner } from "@/components/mock-banner";

const STATUS_HEALTH: Record<string, keyof typeof healthConfig> = {
  PLANNING: "on-track", IN_PROGRESS: "on-track", COMPLETED: "on-track", DELAYED: "delayed",
};

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
}

export const Route = createFileRoute("/app/projects/$id")({
  head: () => ({ meta: [{ title: "Project — BuildSense AI" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const session = useSession();
  const isLive = !!session?.token;

  const { data: liveProject, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const r = await projectsApi.getById(Number(id));
      if (!r.isSuccess) throw new Error(r.errorMessage ?? "Failed");
      return r.result;
    },
    enabled: isLive,
    staleTime: 30_000,
  });

  const project = projects.find((p) => p.id === id) ?? projects[0];
  const plan = projectMaterialPlan[id] ?? projectMaterialPlan["p1"];

  const title = isLive && liveProject ? liveProject.projectName : project.name;
  const healthKey: keyof typeof healthConfig = isLive && liveProject
    ? (STATUS_HEALTH[liveProject.status] ?? "on-track")
    : project.health;
  const description = isLive && liveProject
    ? `Address · ${liveProject.address ?? "—"} · Started ${formatDate(liveProject.startDate)}`
    : `Customer · ${project.customer} · ${project.start} → ${project.end}`;

  if (isLive && isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/app/projects"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to projects</Link>
        </Button>
        <div className="p-8 text-center text-sm text-muted-foreground">Loading project…</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/app/projects"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to projects</Link>
      </Button>

      <PageHeader
        section="Project Detail"
        title={title}
        description={description}
        actions={
          <div className="flex items-center gap-5">
            <Badge variant="outline" className={cn(healthConfig[healthKey].cls)}>{healthConfig[healthKey].label}</Badge>
            {isLive && liveProject ? (
              <div className="flex gap-4 text-right">
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</p><p className="font-semibold text-[13px]">{liveProject.status.replace("_", " ")}</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Created</p><p className="font-semibold text-[13px]">{formatDate(liveProject.createdDate)}</p></div>
              </div>
            ) : (
              <div className="flex gap-4 text-right">
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Budget</p><p className="font-semibold tabular-nums text-[13px]">₹{(project.budget / 100000).toFixed(1)}L</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spent</p><p className="font-semibold tabular-nums text-[13px]">₹{(project.spent / 100000).toFixed(1)}L</p></div>
                <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Progress</p><p className="font-semibold text-[13px]">{project.percent}%</p></div>
              </div>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="wbs">WBS / Gantt</TabsTrigger>
          <TabsTrigger value="materials">Material Plan</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              {isLive && liveProject ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Status", value: liveProject.status.replace(/_/g, " ") },
                    { label: "Start Date", value: formatDate(liveProject.startDate) },
                    { label: "Created", value: formatDate(liveProject.createdDate) },
                    { label: "Address", value: liveProject.address ?? "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                      <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                <MockDataBanner message="Demo data — timeline phases and budget figures are sample data." />
                <div className="relative h-7 rounded-md bg-muted overflow-hidden">
                  {project.phases.map((ph, i) => (
                    <div key={ph.name}
                      className={cn("absolute top-0 bottom-0 flex items-center px-2 text-xs text-white/95",
                        i === 0 ? "bg-primary/70" : i === 1 ? "bg-primary/85" : "bg-primary")}
                      style={{ left: `${ph.start}%`, width: `${ph.end - ph.start}%` }}>
                      {ph.name}
                    </div>
                  ))}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-ai" style={{ left: `${project.percent}%` }} />
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wbs">
          <Card>
            <MockDataBanner message="Demo data — WBS rows, budgets and actuals are sample data. No backend endpoint for WBS." />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Work package</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead>Baseline</TableHead>
                    <TableHead>Actual %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wbsRows.map((r) => (
                    <TableRow key={r.code}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell className={r.code.includes(".") ? "pl-6 text-sm" : "font-medium"}>{r.name}</TableCell>
                      <TableCell className="text-right tabular-nums">₹{(r.budget / 100000).toFixed(1)}L</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.baselineStart} → {r.baselineEnd}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${r.actualPct}%` }} />
                          </div>
                          <span className="text-xs">{r.actualPct}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <MockDataBanner message="Demo data — material plan is sample data. No backend endpoint for project materials." />
            <CardHeader>
              <CardTitle className="text-base">Time-phased material plan</CardTitle>
              <p className="text-xs text-muted-foreground">
                Materials linked to the phase they're needed at — not all delivered up-front.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Needed at phase</TableHead>
                    <TableHead>Needed by</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.map((r) => {
                    const pct = (r.delivered / r.qty) * 100;
                    const status = pct >= 100 ? "Complete" : pct > 0 ? "Partial" : "Pending";
                    return (
                      <TableRow key={r.materialId}>
                        <TableCell className="font-medium">{r.materialName}</TableCell>
                        <TableCell><Badge variant="secondary">{r.neededAt}</Badge></TableCell>
                        <TableCell className="text-xs">{r.neededBy}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.qty} {r.unit}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.delivered} {r.unit}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            pct >= 100 ? "bg-success/15 text-success border-success/30" :
                            pct > 0 ? "bg-warning/20 text-warning-foreground border-warning/40" :
                            "bg-muted text-muted-foreground"
                          )}>{status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="shadow-sm">
            <MockDataBanner message="Demo data — team members are sample data." />
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead><TableHead>Role</TableHead><TableHead>Contact</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {[
                    { name: "Ananya Rao", role: "Project Manager", email: "ananya.pm@buildsense.ai" },
                    { name: "Rahul Kumar", role: "Field Engineer", email: "rahul.site@buildsense.ai" },
                    { name: "Sunita Devi", role: "Field Engineer", email: "sunita.site@buildsense.ai" },
                    { name: project.customer, role: "Customer", email: "—" },
                  ].map((m) => (
                    <TableRow key={m.name}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                            {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                          <span className="font-medium text-[13px]">{m.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{m.role}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card className="shadow-sm">
            <MockDataBanner message="Demo data — document list is sample data. Upload is simulated." />
            <CardContent className="p-5 space-y-4">
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => toast.info("File picker — demo mode")}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="font-medium">Drag & drop or click to upload</p>
                <p className="text-xs mt-1">Drawings, BOQ, contracts, permits</p>
              </div>
              <div className="divide-y">
                {[
                  { name: "Architectural Drawings v3.pdf", size: "4.2 MB", date: "Sep 12" },
                  { name: "BOQ — Foundation Phase.xlsx", size: "1.1 MB", date: "Aug 28" },
                  { name: "Contractor Agreement.pdf", size: "820 KB", date: "Jun 5" },
                ].map((f) => (
                  <div key={f.name} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-[13px] font-medium">{f.name}</p>
                      <p className="text-[11px] text-muted-foreground">{f.size} · uploaded {f.date}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.info("Download — demo mode")}>Download</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
