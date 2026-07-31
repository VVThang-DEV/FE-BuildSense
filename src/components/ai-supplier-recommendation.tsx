import { useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  suppliersApi,
  type BalancedSupplierRecommendationResponse,
  type SupplierRecommendation,
} from "@/api/suppliers";

type Props = {
  /** Material IDs + quantities to recommend suppliers for */
  materials: { materialId: number; quantity: number }[];
  projectId?: number;
  /** Called when user selects a supplier from recommendations */
  onSelectSupplier?: (supplier: SupplierRecommendation) => void;
  /** Label for the trigger button */
  triggerLabel?: string;
  className?: string;
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning-foreground";
  return "text-destructive";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-success/10 border-success/30";
  if (score >= 60) return "bg-warning/10 border-warning/30";
  return "bg-destructive/10 border-destructive/30";
}

export function AiSupplierRecommendation({
  materials,
  projectId,
  onSelectSupplier,
  triggerLabel = "✨ AI Supplier Suggestions",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BalancedSupplierRecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Options
  const [searchWeb, setSearchWeb] = useState(false);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [searchRadius, setSearchRadius] = useState("30");

  const fetchRecommendations = async () => {
    if (materials.length === 0) {
      toast.error("Add at least one material to get AI recommendations");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await suppliersApi.recommendBalanced({
        projectId,
        items: materials,
        searchWebForNearbySuppliers: searchWeb,
        warehouseLocation: searchWeb ? warehouseLocation.trim() || undefined : undefined,
        searchRadiusKm: searchWeb ? Number(searchRadius) || 30 : undefined,
        regionCode: "VN",
        maxRecommendations: 8,
      });
      if (response.isSuccess && response.result) {
        setResult(response.result);
      } else {
        setError(response.errorMessage ?? "Could not get AI recommendations");
      }
    } catch {
      setError("Could not reach the backend. Ensure the API server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!result && !loading) fetchRecommendations();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn("gap-1.5 text-xs", className)}
        onClick={handleOpen}
        disabled={materials.length === 0}
      >
        <Sparkles className="h-3.5 w-3.5 text-ai" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ai/10 text-ai">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <span>AI Supplier Recommendations</span>
                <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                  Powered by Gemini — ranked by cost, reliability &amp; lead time
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Web search options */}
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Switch
                id="search-web"
                checked={searchWeb}
                onCheckedChange={setSearchWeb}
                className="scale-90"
              />
              <Label htmlFor="search-web" className="text-xs cursor-pointer">
                <Globe className="mr-1 inline h-3 w-3" />
                Search web for nearby suppliers
              </Label>
            </div>
            {searchWeb && (
              <>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <Input
                    className="h-7 w-40 text-xs"
                    placeholder="Warehouse location"
                    value={warehouseLocation}
                    onChange={(e) => setWarehouseLocation(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <Input
                    className="h-7 w-16 text-xs"
                    placeholder="km"
                    type="number"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(e.target.value)}
                  />
                  <span className="text-[10px] text-muted-foreground">km radius</span>
                </div>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-7 text-xs gap-1"
              onClick={fetchRecommendations}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loading ? "Analyzing…" : "Refresh"}
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 min-h-0">
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-ai" />
                <p className="text-sm text-muted-foreground">
                  Gemini is analyzing supplier data{searchWeb ? " and searching the web" : ""}…
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-4 pr-2">
                {/* AI badges */}
                <div className="flex flex-wrap gap-2">
                  {result.usedGoogleAI && (
                    <Badge className="bg-ai/10 text-ai border-ai/30 text-xs">
                      <Sparkles className="mr-1 h-3 w-3" /> Gemini AI ranked
                    </Badge>
                  )}
                  {result.usedWebSearch && (
                    <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                      <Globe className="mr-1 h-3 w-3" /> Web search used
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {result.recommendations.length} supplier{result.recommendations.length !== 1 ? "s" : ""} found
                  </Badge>
                </div>

                {/* AI Summary */}
                {result.aiSummary && (
                  <Card className="border-ai/20 bg-ai/5">
                    <CardContent className="p-3">
                      <p className="text-xs font-medium text-ai mb-1">
                        <Sparkles className="mr-1 inline h-3 w-3" /> AI Analysis
                      </p>
                      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {result.aiSummary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {result.webSearchSummary && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="p-3">
                      <p className="text-xs font-medium text-primary mb-1">
                        <Globe className="mr-1 inline h-3 w-3" /> Web Search Summary
                      </p>
                      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {result.webSearchSummary}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {result.recommendations.map((rec, idx) => (
                  <Card
                    key={`${rec.supplierId}-${rec.companyName}-${idx}`}
                    className="overflow-hidden transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold",
                              scoreBg(rec.balancedScore),
                              scoreColor(rec.balancedScore),
                            )}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <CardTitle className="text-sm">{rec.companyName}</CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1.5 py-0",
                                  rec.source === "WebSearch"
                                    ? "border-primary/30 bg-primary/5 text-primary"
                                    : "border-muted-foreground/30",
                                )}
                              >
                                {rec.source === "WebSearch" ? "🌐 Web" : "📦 Internal"}
                              </Badge>
                              {rec.rating && (
                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                  <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                                  {rec.rating.toFixed(1)}
                                  {rec.reviewCount ? ` (${rec.reviewCount})` : ""}
                                </span>
                              )}
                              {rec.distanceEstimate && (
                                <span className="text-[10px] text-muted-foreground">
                                  <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
                                  {rec.distanceEstimate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn("text-lg font-bold tabular-nums", scoreColor(rec.balancedScore))}>
                            {rec.balancedScore.toFixed(1)}
                          </p>
                          <p className="text-[9px] text-muted-foreground">score</p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="px-4 pb-4 space-y-3">
                      {/* Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-muted/40 p-2.5">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Est. Cost</p>
                          <p className="text-xs font-semibold tabular-nums">
                            {rec.estimatedTotalCost.toLocaleString()} ₫
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Lead Time</p>
                          <p className="text-xs font-semibold tabular-nums">
                            {rec.averageLeadTimeDays.toFixed(0)} days
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Reliability</p>
                          <p className={cn("text-xs font-semibold tabular-nums", scoreColor(rec.reliabilityScore))}>
                            {rec.reliabilityScore.toFixed(1)}/100
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Coverage</p>
                          <p className="text-xs font-semibold tabular-nums">
                            {rec.matchedMaterialCount}/{rec.requestedMaterialCount}
                          </p>
                        </div>
                      </div>

                      {/* Reason */}
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>

                      {/* Material lines */}
                      {rec.lines.length > 0 && (
                        <div className="space-y-1">
                          {rec.lines.map((line) => (
                            <div
                              key={line.materialId}
                              className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-muted/30"
                            >
                              <span className="truncate">{line.materialName}</span>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {line.quantity} × {line.unitPrice.toLocaleString()} ₫ = {line.estimatedLineCost.toLocaleString()} ₫
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Links + action */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {rec.websiteUrl && (
                            <a href={rec.websiteUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                              <ExternalLink className="h-2.5 w-2.5" /> Website
                            </a>
                          )}
                          {rec.googleMapsUrl && (
                            <a href={rec.googleMapsUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" /> Maps
                            </a>
                          )}
                          {rec.sourceUrls.length > 0 && (
                            <a href={rec.sourceUrls[0]} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                              <Globe className="h-2.5 w-2.5" /> Source
                            </a>
                          )}
                        </div>
                        {onSelectSupplier && rec.supplierId > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              onSelectSupplier(rec);
                              setOpen(false);
                            }}
                          >
                            <TrendingUp className="h-3 w-3" /> Select this supplier
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {result.recommendations.length === 0 && !loading && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No recommendations found for the requested materials.
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
