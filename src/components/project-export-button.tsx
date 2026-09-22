import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { projectsApi } from "@/api/projects";
import { Button } from "@/components/ui/button";

export function ProjectExportButton({
  projectId,
  projectName,
}: {
  projectId: number;
  projectName?: string;
}) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const result = await projectsApi.exportProject(projectId);
      if (!result.blob) {
        toast.error(result.errorMessage ?? "Could not export project");
        return;
      }
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        result.filename ?? `${(projectName ?? `project-${projectId}`).replace(/[^\w\-]+/g, "_")}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Project workbook downloaded");
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={download} disabled={busy}>
      <Download className="mr-1.5 h-3.5 w-3.5" />
      {busy ? "Exporting..." : "Export Excel"}
    </Button>
  );
}
