import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projects, projectMaterialPlan, wbsRows } from "@/lib/mock-data";
import { cn, healthConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/app/projects/$id")({
  head: () => ({ meta: [{ title: "Project — BuildSense AI" }] }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const project = projects.find((p) => p.id === id) ?? projects[0];
  const plan = projectMaterialPlan[id] ?? projectMaterialPlan["p1"];

  return (
    <div className="max-w-[1400px] mx-auto">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/app/projects"><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to projects</Link>
      </Button>

      <PageHeader
        section="Project Detail"
        title={project.name}
        description={`Customer · ${project.customer} · ${project.start} → ${project.end}`}
        actions={
          <div className="flex items-center gap-5">
            <Badge variant="outline" className={cn(healthConfig[project.health].cls)}>{healthConfig[project.health].label}</Badge>
            <div className="flex gap-4 text-right">
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Budget</p><p className="font-semibold tabular-nums text-[13px]">₹{(project.budget / 100000).toFixed(1)}L</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spent</p><p className="font-semibold tabular-nums text-[13px]">₹{(project.spent / 100000).toFixed(1)}L</p></div>
              <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide">Progress</p><p className="font-semibold text-[13px]">{project.percent}%</p></div>
            </div>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wbs">
          <Card>
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
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Team roster — Engineer: Rahul Kumar · PM: {project.customer === "Meera Nair" ? "Ananya Rao" : "Karthik Iyer"} · Supervisor: 2 assigned
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card><CardContent className="p-6 text-sm text-muted-foreground">
            Drawings, BOQ, contracts — drag & drop to upload (demo).
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
