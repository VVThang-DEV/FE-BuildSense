import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { projects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/projects")({
  head: () => ({ meta: [{ title: "Projects — BuildSense AI" }] }),
  component: ProjectsList,
});

const healthClass = {
  "on-track": "bg-success/15 text-success border-success/30",
  "at-risk": "bg-warning/20 text-warning-foreground border-warning/40",
  delayed: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

function ProjectsList() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">All active and planned house builds.</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> New project</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead>Handover</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link to="/app/projects/$id" params={{ id: p.id }} className="hover:underline">{p.name}</Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.customer}</TableCell>
                  <TableCell><Badge variant="outline" className={cn(healthClass[p.health])}>{p.health}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${p.percent}%` }} />
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
        </CardContent>
      </Card>
    </div>
  );
}
