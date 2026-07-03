import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export function BackendUnavailablePage({ title, endpoint }: { title: string; endpoint: string }) {
  return (
    <div className="max-w-[1000px] mx-auto">
      <PageHeader
        section="Unavailable"
        title={title}
        description="This frontend screen was removed because there is no matching backend endpoint yet."
      />
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Backend endpoint needed: <span className="font-mono text-foreground">{endpoint}</span>
        </CardContent>
      </Card>
    </div>
  );
}
