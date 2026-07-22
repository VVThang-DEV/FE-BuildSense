import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  PackageCheck,
  Plus,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, statusConfig } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { QueryError } from "@/components/query-error";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useSession } from "@/lib/session";
import {
  purchaseOrdersApi,
  type ProcurementOfferResponse,
  type PurchaseOrderResponse,
} from "@/api/purchaseOrders";
import { projectsApi } from "@/api/projects";
import { suppliersApi } from "@/api/suppliers";
import { warehousesApi } from "@/api/warehouses";
import { requireApiResult } from "@/api/client";
import { materialsApi } from "@/api/materials";
import { catalogsApi } from "@/api/catalogs";
import { useWorkflowSuggestion } from "@/hooks/use-workflow-suggestion";

export const Route = createFileRoute("/app/procurement")({
  head: () => ({ meta: [{ title: "Procurement - BuildSense AI" }] }),
  component: ProcurementPage,
});

function purchaseOrderErrorMessage(result: unknown, fallback: string): string {
  if (typeof result === "string" && result.trim()) return result;
  if (typeof result !== "object" || result === null) return fallback;

  const budget = result as {
    message?: string;
    remainingBudget?: number;
    currentOrder?: number;
    currency?: string;
  };
  if (typeof budget.remainingBudget !== "number" || typeof budget.currentOrder !== "number") {
    return budget.message || fallback;
  }
  const currency = budget.currency || "VND";
  return `${budget.message || "Purchase order exceeds project budget"}. Remaining: ${budget.remainingBudget.toLocaleString()} ${currency}; this order: ${budget.currentOrder.toLocaleString()} ${currency}.`;
}

function formatMoney(value: number, currency = "VND"): string {
  return `${value.toLocaleString()} ${currency}`;
}

function emptyPOForm() {
  return {
    projectId: "",
    supplierId: "",
    warehouseId: "",
    requestItemId: "",
    variantId: "",
    materialId: "",
    quantity: "1",
    unitPrice: "0",
    expectedDeliveryDate: "",
    note: "",
  };
}

type DraftPOLine = {
  variantId: number;
  materialId: number;
  requestItemId?: number;
  materialName: string;
  variantName: string;
  sku?: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  minimumOrderQuantity: number;
  earliestDeliveryDate: string;
  maximumQuantity?: number;
};

function ProcurementPage() {
  const session = useSession();
  const suggestNext = useWorkflowSuggestion();
  const isLive = !!session?.token;
  const canCreate = session?.role === "WAREHOUSE_MANAGER";
  const canApproveOrReject = session?.role === "ADMIN" || session?.role === "PM";
  const canImport = session?.role === "WAREHOUSE_MANAGER";
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState<"shortage" | "replenishment">("shortage");
  const [newPO, setNewPO] = useState(emptyPOForm);
  const [poLines, setPOLines] = useState<DraftPOLine[]>([]);
  const [shortageSearch, setShortageSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importPOId, setImportPOId] = useState<number | null>(null);
  const [receiptQuantities, setReceiptQuantities] = useState<Record<number, string>>({});
  const [receiptDamaged, setReceiptDamaged] = useState<Record<number, string>>({});
  const [receiptMissing, setReceiptMissing] = useState<Record<number, string>>({});
  const [receiptLots, setReceiptLots] = useState<Record<number, string>>({});
  const [receiptBatches, setReceiptBatches] = useState<Record<number, string>>({});
  const [receiptSerials, setReceiptSerials] = useState<Record<number, string>>({});
  const [receiptExpiries, setReceiptExpiries] = useState<Record<number, string>>({});
  const [trackingExpanded, setTrackingExpanded] = useState<Record<number, boolean>>({});
  const [receiptFinalDelivery, setReceiptFinalDelivery] = useState(false);
  const [receiptNote, setReceiptNote] = useState("");
  const [rejectPOId, setRejectPOId] = useState<number | null>(null);
  const [cancelPOId, setCancelPOId] = useState<number | null>(null);
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [reviewDenials, setReviewDenials] = useState<Record<number, string>>({});
  const [workflowTab, setWorkflowTab] = useState("pending");

  const {
    data: livePOs,
    refetch: refetchPOs,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const response = await purchaseOrdersApi.getAll();
      return requireApiResult(response, "Could not load purchase orders") ?? [];
    },
    enabled: isLive,
    staleTime: 10_000,
  });

  const { data: liveProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () =>
      requireApiResult(await projectsApi.getAll(), "Could not load projects") ?? [],
    enabled: isLive,
  });
  const { data: liveSuppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () =>
      requireApiResult(await suppliersApi.getAll(), "Could not load suppliers") ?? [],
    enabled: isLive,
  });
  const { data: liveWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () =>
      requireApiResult(await warehousesApi.getAll(), "Could not load warehouses") ?? [],
    enabled: isLive && canCreate,
  });

  const showActionFailure = async (
    response: { statusCode: number; errorMessage?: string | null },
    fallback: string,
    poId?: number,
  ) => {
    const message = response.errorMessage ?? fallback;
    if (poId && /creator cannot (approve|reject)/i.test(message)) {
      setReviewDenials((current) => ({ ...current, [poId]: message }));
    }
    if (response.statusCode === 409) {
      await refetchPOs();
      toast.error(
        response.errorMessage ??
          "This purchase order changed and has been refreshed. Review it before trying again.",
      );
      return;
    }
    toast.error(response.errorMessage ?? fallback);
  };
  const { data: liveMaterials } = useQuery({
    queryKey: ["materials", "procurement-variants"],
    queryFn: async () =>
      requireApiResult(await materialsApi.getAll(), "Could not load material variants") ?? [],
    enabled: isLive && canCreate,
  });
  const { data: liveCatalogOffers } = useQuery({
    queryKey: ["catalog-offers", "procurement"],
    queryFn: async () =>
      requireApiResult(
        await catalogsApi.getAll({ availableOnly: true }),
        "Could not load supplier offers",
      ) ?? [],
    enabled: isLive && canCreate,
  });
  const {
    data: liveShortages,
    isLoading: shortagesLoading,
    isError: shortagesError,
    error: shortagesErrorValue,
    refetch: refetchShortages,
  } = useQuery({
    queryKey: ["purchase-orders", "procurement-shortages"],
    queryFn: async () =>
      requireApiResult(
        await purchaseOrdersApi.getShortages(),
        "Could not load procurement shortages",
      ) ?? [],
    enabled: isLive && canCreate,
  });

  const approve = async (poId: number) => {
    setBusyAction(`approve-${poId}`);
    try {
      const po = (livePOs ?? []).find((item) => item.poId === poId);
      const response = await purchaseOrdersApi.approve(poId, {
        rowVersion: po?.rowVersion,
      });
      if (response.isSuccess) {
        suggestNext({
          message: `PO #${poId} approved`,
          nextStep: "The Warehouse Manager can now move the order into supplier processing.",
          to: "/app/procurement",
          actionLabel: "View approved POs",
          onAction: () => setWorkflowTab("approved"),
        });
        await refetchPOs();
      } else {
        await showActionFailure(response, "Approve failed", poId);
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const reject = async () => {
    if (!rejectPOId) return;
    const poId = rejectPOId;
    setBusyAction(`reject-${poId}`);
    try {
      const po = (livePOs ?? []).find((item) => item.poId === poId);
      const response = await purchaseOrdersApi.reject(poId, {
        rowVersion: po?.rowVersion,
      });
      if (response.isSuccess) {
        suggestNext({
          message: `PO #${poId} rejected`,
          nextStep:
            "A Warehouse Manager must review shortages and create a corrected purchase order.",
          to: "/app/procurement",
          actionLabel: "Create replacement PO",
          actionRoles: ["WAREHOUSE_MANAGER"],
          waitingNote: "Only a Warehouse Manager can create the replacement purchase order.",
          onAction: () => setCreating(true),
        });
        setRejectPOId(null);
        await refetchPOs();
      } else {
        await showActionFailure(response, "Reject failed", poId);
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const ship = async (poId: number) => {
    setBusyAction(`ship-${poId}`);
    try {
      const po = (livePOs ?? []).find((item) => item.poId === poId);
      const response = await purchaseOrdersApi.ship(poId, {
        rowVersion: po?.rowVersion,
      });
      if (!response.isSuccess) {
        await showActionFailure(response, "Could not mark PO shipped");
      } else {
        suggestNext({
          message: `PO #${poId} marked as shipped`,
          nextStep:
            "Record the actual receipt whenever the delivery arrives, even if it arrives early.",
          to: "/app/procurement",
          actionLabel: "Receive delivery",
          onAction: () => setWorkflowTab("approved"),
        });
        await refetchPOs();
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const markProcessing = async (poId: number) => {
    setBusyAction(`processing-${poId}`);
    try {
      const po = (livePOs ?? []).find((item) => item.poId === poId);
      const response = await purchaseOrdersApi.markProcessing(poId, {
        rowVersion: po?.rowVersion,
      });
      if (!response.isSuccess) {
        await showActionFailure(response, "Could not mark PO as processing");
      } else {
        suggestNext({
          message: `PO #${poId} marked as supplier processing`,
          nextStep: "Mark it shipped when the supplier dispatches the order.",
          to: "/app/procurement",
          actionLabel: "View processing POs",
          onAction: () => setWorkflowTab("approved"),
        });
        await refetchPOs();
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const cancel = async () => {
    if (!cancelPOId) return;
    const poId = cancelPOId;
    setBusyAction(`cancel-${poId}`);
    try {
      const po = (livePOs ?? []).find((item) => item.poId === poId);
      const response = await purchaseOrdersApi.cancel(poId, {
        rowVersion: po?.rowVersion,
      });
      if (!response.isSuccess) {
        await showActionFailure(response, "Could not cancel PO");
      } else {
        suggestNext({
          message: `PO #${poId} cancelled`,
          nextStep: "Review whether the uncovered shortage still needs a replacement order.",
          to: "/app/procurement",
          actionLabel: "Create replacement PO",
          actionRoles: ["WAREHOUSE_MANAGER"],
          waitingNote: "Only a Warehouse Manager can create the replacement purchase order.",
          onAction: () => setCreating(true),
        });
        setCancelPOId(null);
        await Promise.all([refetchPOs(), refetchShortages()]);
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const importToWarehouse = async () => {
    const po = (livePOs ?? []).find((item) => item.poId === importPOId);
    if (!po) {
      toast.error("Purchase order not found");
      return;
    }
    const receiptLines = po.items.map((item) => ({
      lineItemId: item.orderLineItemId,
      quantity: Number(receiptQuantities[item.orderLineItemId] ?? 0),
      damagedQuantity: Number(receiptDamaged[item.orderLineItemId] ?? 0),
      missingQuantity: Number(receiptMissing[item.orderLineItemId] ?? 0),
      lotNumber: receiptLots[item.orderLineItemId]?.trim() || undefined,
      batchNumber: receiptBatches[item.orderLineItemId]?.trim() || undefined,
      serialNumber: receiptSerials[item.orderLineItemId]?.trim() || undefined,
      expiryDate: receiptExpiries[item.orderLineItemId] || undefined,
      remaining: item.remainingQuantity,
    }));
    const items = receiptLines.filter(
      (item) => item.quantity + item.damagedQuantity + item.missingQuantity > 0,
    );
    if (
      items.length === 0 ||
      items.some(
        (item) =>
          item.quantity < 0 ||
          item.damagedQuantity < 0 ||
          item.missingQuantity < 0 ||
          item.quantity + item.damagedQuantity + item.missingQuantity > item.remaining,
      )
    ) {
      toast.error("Accepted, damaged, and missing quantities must fit within the remaining order");
      return;
    }
    if (!receiptFinalDelivery && items.some((item) => item.missingQuantity > 0)) {
      toast.error("Missing quantities can only be recorded on a final delivery");
      return;
    }
    if (
      receiptFinalDelivery &&
      receiptLines.some(
        (item) => item.quantity + item.damagedQuantity + item.missingQuantity !== item.remaining,
      )
    ) {
      toast.error("A final delivery must account for every remaining unit on every line");
      return;
    }
    setBusyAction(`import-${importPOId}`);
    try {
      const response = await purchaseOrdersApi.receive(importPOId!, {
        note: receiptNote.trim() || undefined,
        rowVersion: po.rowVersion,
        isFinalDelivery: receiptFinalDelivery,
        items: items.map(
          ({
            lineItemId,
            quantity,
            damagedQuantity,
            missingQuantity,
            lotNumber,
            batchNumber,
            serialNumber,
            expiryDate,
          }) => ({
            lineItemId,
            quantity,
            damagedQuantity,
            missingQuantity,
            lotNumber,
            batchNumber,
            serialNumber,
            expiryDate,
          }),
        ),
      });
      if (response.isSuccess) {
        suggestNext({
          message: `PO #${importPOId} imported to warehouse`,
          nextStep:
            "Verify the updated balance and check Material Requests because received stock may have been reserved automatically for linked shortages.",
          to: "/app/admin/warehouses",
          actionLabel: "View inventory",
        });
        setImportOpen(false);
        setImportPOId(null);
        setReceiptQuantities({});
        setReceiptDamaged({});
        setReceiptMissing({});
        setReceiptLots({});
        setReceiptBatches({});
        setReceiptSerials({});
        setReceiptExpiries({});
        setTrackingExpanded({});
        setReceiptFinalDelivery(false);
        setReceiptNote("");
        await Promise.all([refetchPOs(), refetchShortages()]);
      } else {
        await showActionFailure(response, "Receive failed");
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const resetPOBuilder = () => {
    setNewPO(emptyPOForm());
    setPOLines([]);
    setShortageSearch("");
  };

  const addPOLine = () => {
    if (
      !newPO.projectId ||
      !newPO.supplierId ||
      !newPO.warehouseId ||
      !newPO.variantId ||
      !newPO.materialId
    ) {
      toast.error("Select a project, warehouse, material variant, and supplier");
      return;
    }
    if (createMode === "shortage" && !newPO.requestItemId) {
      toast.error("Select an approved material-request shortage");
      return;
    }
    const quantity = Number(newPO.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!selectedOffer) {
      toast.error("Select an available supplier offer for this material variant");
      return;
    }
    const maximumShortageOrder = selectedShortage
      ? Math.max(selectedShortage.remainingShortageQuantity, selectedOffer.minimumOrderQuantity)
      : undefined;
    if (
      createMode === "shortage" &&
      (!selectedShortage || !maximumShortageOrder || quantity > maximumShortageOrder)
    ) {
      toast.error("Quantity exceeds the remaining shortage and allowed supplier minimum");
      return;
    }
    if (quantity < selectedOffer.minimumOrderQuantity) {
      toast.error(
        `This supplier requires at least ${selectedOffer.minimumOrderQuantity} ${selectedShortage?.unit ?? selectedReplenishmentVariant?.unit ?? "units"}`,
      );
      return;
    }
    const variantId = Number(newPO.variantId);
    if (poLines.some((line) => line.variantId === variantId)) {
      toast.error("A material variant can only appear once on a purchase order");
      return;
    }
    const requestItemId = createMode === "shortage" ? Number(newPO.requestItemId) : undefined;
    if (requestItemId && poLines.some((line) => line.requestItemId === requestItemId)) {
      toast.error("This shortage is already included in the purchase order");
      return;
    }

    const line: DraftPOLine = {
      variantId,
      materialId: Number(newPO.materialId),
      requestItemId,
      materialName:
        selectedShortage?.materialName ?? selectedReplenishmentVariant?.materialName ?? "Material",
      variantName:
        selectedShortage?.variantName ?? selectedReplenishmentVariant?.variantName ?? "Standard",
      sku: selectedShortage?.sku ?? selectedReplenishmentVariant?.sku,
      unit: selectedShortage?.unit ?? selectedReplenishmentVariant?.unit ?? "",
      quantity,
      unitPrice: selectedOffer.unitPrice,
      minimumOrderQuantity: selectedOffer.minimumOrderQuantity,
      earliestDeliveryDate: selectedOffer.earliestDeliveryDate,
      maximumQuantity: maximumShortageOrder,
    };
    setPOLines((lines) => [...lines, line]);
    setNewPO((current) => {
      const offerDate = selectedOffer.earliestDeliveryDate.slice(0, 10);
      const expectedDeliveryDate =
        !current.expectedDeliveryDate || offerDate > current.expectedDeliveryDate
          ? offerDate
          : current.expectedDeliveryDate;
      return {
        ...current,
        requestItemId: "",
        variantId: "",
        materialId: "",
        quantity: "1",
        unitPrice: "0",
        expectedDeliveryDate,
      };
    });
    toast.success(`${line.materialName} added to the purchase order`);
  };

  const submitCreate = async () => {
    if (!newPO.projectId || !newPO.supplierId || !newPO.warehouseId) {
      toast.error("Select a project, warehouse, and supplier");
      return;
    }
    if (poLines.length === 0) {
      toast.error("Add at least one material line before creating the purchase order");
      return;
    }
    if (
      minimumExpectedDate &&
      newPO.expectedDeliveryDate &&
      newPO.expectedDeliveryDate < minimumExpectedDate
    ) {
      toast.error(`Expected delivery cannot be before ${minimumExpectedDate}`);
      return;
    }
    setBusyAction("create");
    try {
      const request = {
        projectId: Number(newPO.projectId),
        supplierId: Number(newPO.supplierId),
        warehouseId: Number(newPO.warehouseId),
        expectedDeliveryDate: newPO.expectedDeliveryDate || undefined,
        note: newPO.note.trim() || undefined,
        items: poLines.map((line) => ({
          variantId: line.variantId,
          materialId: line.materialId,
          ...(line.requestItemId ? { requestItemId: line.requestItemId } : {}),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      };
      const response =
        createMode === "shortage"
          ? await purchaseOrdersApi.createFromShortages(request)
          : await purchaseOrdersApi.create(request);
      if (response.isSuccess) {
        suggestNext({
          message:
            createMode === "shortage"
              ? "Shortage purchase order created"
              : "Stock replenishment purchase order created",
          nextStep: "A Project Manager or Admin other than the creator must review the order.",
          to: "/app/procurement",
          actionLabel: "Track approval",
          onAction: () => setWorkflowTab("pending"),
        });
        setCreating(false);
        resetPOBuilder();
        setCreateMode("shortage");
        await Promise.all([refetchPOs(), refetchShortages()]);
      } else {
        toast.error(
          response.errorMessage ?? purchaseOrderErrorMessage(response.result, "Create failed"),
        );
      }
    } catch {
      toast.error("Could not reach the backend");
    } finally {
      setBusyAction(null);
    }
  };

  const allPOs = livePOs ?? [];
  const pmProjectIds = new Set(
    (liveProjects ?? [])
      .filter((project) => project.pmUserID === session?.userId)
      .map((project) => project.projectId),
  );
  const scopedPOs =
    session?.role === "PM" ? allPOs.filter((po) => pmProjectIds.has(po.projectId)) : allPOs;
  const pending = scopedPOs.filter((po) => po.status === "PENDING");
  const approved = scopedPOs.filter((po) =>
    ["APPROVED", "PROCESSING", "SHIPPED", "PARTIALLY_RECEIVED"].includes(po.status),
  );
  const rejected = scopedPOs.filter((po) => ["REJECTED", "CANCELLED"].includes(po.status));
  const delivered = scopedPOs.filter((po) =>
    ["DELIVERED", "CLOSED_WITH_VARIANCE"].includes(po.status),
  );
  const pipelineValue = scopedPOs.reduce((sum, po) => sum + po.totalAmount, 0);
  const projectName = (id: number) =>
    liveProjects?.find((project) => project.projectId === id)?.projectName ?? `#${id}`;
  const supplierName = (id: number) =>
    liveSuppliers?.find((supplier) => supplier.supplierId === id)?.companyName ?? `#${id}`;
  const reviewBlockReason = (po: PurchaseOrderResponse) => {
    const rememberedDenial = reviewDenials[po.poId];
    if (rememberedDenial) return rememberedDenial;
    const project = liveProjects?.find((item) => item.projectId === po.projectId);
    if (project && ["PAUSED", "COMPLETED", "CANCELLED"].includes(project.status)) {
      return `Purchase orders cannot be reviewed while ${project.projectName} is ${project.status.toLowerCase().replaceAll("_", " ")}.`;
    }
    return undefined;
  };
  const selectedPO = scopedPOs.find((po) => po.poId === selectedPOId) ?? null;
  const selectedImportPO = scopedPOs.find((po) => po.poId === importPOId) ?? null;
  const shortageOptions = liveShortages ?? [];
  const selectedShortage = shortageOptions.find(
    (option) => option.requestItemId === Number(newPO.requestItemId),
  );
  const replenishmentVariants = (liveMaterials ?? []).flatMap((material) =>
    material.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        ...variant,
        materialId: material.materialId,
        label: `${material.materialName} - ${variant.variantName}`,
      })),
  );
  const selectedReplenishmentVariant = replenishmentVariants.find(
    (variant) => variant.variantId === Number(newPO.variantId),
  );
  const replenishmentOffers: ProcurementOfferResponse[] = (liveCatalogOffers ?? [])
    .filter((offer) => offer.variantId === Number(newPO.variantId) && offer.isAvailable)
    .map((offer) => {
      const delivery = new Date();
      delivery.setDate(delivery.getDate() + offer.leadTimeDays);
      const suggestedQuantity = Math.max(1, offer.minimumOrderQuantity);
      return {
        catalogId: offer.catalogId,
        supplierId: offer.supplierId,
        supplierName: offer.supplierName,
        supplierSku: offer.supplierSku,
        unitPrice: offer.unitPrice,
        minimumOrderQuantity: offer.minimumOrderQuantity,
        leadTimeDays: offer.leadTimeDays,
        earliestDeliveryDate: delivery.toISOString(),
        suggestedOrderQuantity: suggestedQuantity,
        expectedExcessStockQuantity: 0,
        suggestedOrderTotal: suggestedQuantity * offer.unitPrice,
      };
    });
  const availableOffers =
    createMode === "shortage" ? (selectedShortage?.supplierOffers ?? []) : replenishmentOffers;
  const selectedOffer = availableOffers.find(
    (offer) => offer.supplierId === Number(newPO.supplierId),
  );
  const normalizedShortageSearch = shortageSearch.trim().toLowerCase();
  const selectableShortageOptions = shortageOptions.filter((shortage) => {
    if (poLines.some((line) => line.requestItemId === shortage.requestItemId)) return false;
    if (
      poLines.length > 0 &&
      (shortage.projectId !== Number(newPO.projectId) ||
        shortage.warehouseId !== Number(newPO.warehouseId) ||
        !shortage.supplierOffers.some((offer) => offer.supplierId === Number(newPO.supplierId)))
    )
      return false;
    if (!normalizedShortageSearch) return true;
    return [
      shortage.materialName,
      shortage.variantName,
      shortage.sku,
      shortage.projectName,
      shortage.warehouseName,
      ...shortage.requestIds.map(String),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedShortageSearch));
  });
  const selectableReplenishmentVariants = replenishmentVariants.filter((variant) => {
    if (poLines.some((line) => line.variantId === variant.variantId)) return false;
    return (
      poLines.length === 0 ||
      (liveCatalogOffers ?? []).some(
        (offer) =>
          offer.variantId === variant.variantId &&
          offer.supplierId === Number(newPO.supplierId) &&
          offer.isAvailable,
      )
    );
  });
  const draftTotal = poLines.reduce((total, line) => total + line.quantity * line.unitPrice, 0);
  const minimumExpectedDate = poLines.reduce(
    (latest, line) =>
      line.earliestDeliveryDate.slice(0, 10) > latest
        ? line.earliestDeliveryDate.slice(0, 10)
        : latest,
    selectedOffer?.earliestDeliveryDate.slice(0, 10) ?? "",
  );
  const canCancelOrder = (po: PurchaseOrderResponse) =>
    session?.role === "WAREHOUSE_MANAGER"
      ? po.status === "PENDING"
      : (session?.role === "ADMIN" || session?.role === "PM") &&
        ["PENDING", "APPROVED", "PROCESSING"].includes(po.status);

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        section="Operations"
        title="Procurement"
        description="Create, approve, and receive backend purchase orders."
        actions={
          isLive && canCreate ? (
            <Button size="sm" className="h-8 text-xs" onClick={() => setCreating(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> New PO
            </Button>
          ) : undefined
        }
      />

      {isLive && !isLoading && (
        <div className="mb-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ProcurementMetric icon={Clock3} label="Pending approval" value={pending.length} />
            <ProcurementMetric icon={Truck} label="Awaiting receipt" value={approved.length} />
            <ProcurementMetric icon={X} label="Rejected" value={rejected.length} />
            <ProcurementMetric icon={PackageCheck} label="Delivered" value={delivered.length} />
            <ProcurementMetric
              icon={CircleDollarSign}
              label="Pipeline value (VND)"
              value={formatMoney(pipelineValue)}
            />
          </div>
          <PipelineBar
            pending={pending.length}
            approved={approved.length}
            rejected={rejected.length}
            delivered={delivered.length}
          />
        </div>
      )}

      <Dialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open && busyAction !== "create") {
            resetPOBuilder();
            setCreateMode("shortage");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Tabs
              value={createMode}
              onValueChange={(value) => {
                setCreateMode(value as "shortage" | "replenishment");
                resetPOBuilder();
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="shortage">Request shortage</TabsTrigger>
                <TabsTrigger value="replenishment">Stock replenishment</TabsTrigger>
              </TabsList>
              <TabsContent value="shortage" className="mt-3 space-y-3">
                <Input
                  value={shortageSearch}
                  onChange={(event) => setShortageSearch(event.target.value)}
                  placeholder="Search by material, SKU, project, warehouse, or request number"
                  aria-label="Search procurement shortages"
                />
                <SelectField
                  label="Unprocured material-request shortage"
                  value={newPO.requestItemId}
                  onValueChange={(value) => {
                    const selected = selectableShortageOptions.find(
                      (option) => option.requestItemId === Number(value),
                    );
                    if (!selected) return;
                    const bestOffer =
                      poLines.length > 0
                        ? selected.supplierOffers.find(
                            (offer) => offer.supplierId === Number(newPO.supplierId),
                          )
                        : selected.supplierOffers[0];
                    setNewPO((po) => ({
                      ...po,
                      requestItemId: value,
                      projectId: String(selected.projectId),
                      warehouseId: String(selected.warehouseId),
                      variantId: String(selected.variantId),
                      materialId: String(selected.materialId),
                      quantity: String(
                        bestOffer?.suggestedOrderQuantity ?? selected.remainingShortageQuantity,
                      ),
                      supplierId:
                        poLines.length > 0
                          ? po.supplierId
                          : bestOffer
                            ? String(bestOffer.supplierId)
                            : "",
                      unitPrice: String(bestOffer?.unitPrice ?? 0),
                      expectedDeliveryDate:
                        poLines.length > 0
                          ? po.expectedDeliveryDate
                          : (bestOffer?.earliestDeliveryDate?.slice(0, 10) ?? ""),
                    }));
                  }}
                  placeholder={shortagesLoading ? "Loading shortages..." : "Select shortage"}
                  disabled={
                    shortagesLoading || shortagesError || selectableShortageOptions.length === 0
                  }
                >
                  {selectableShortageOptions.map((shortage) => (
                    <SelectItem key={shortage.requestItemId} value={String(shortage.requestItemId)}>
                      MR {shortage.requestIds.map((id) => `#${id}`).join(", ")} ·{" "}
                      {shortage.materialName} / {shortage.variantName || "Standard"} ·{" "}
                      {shortage.remainingShortageQuantity} {shortage.unit}
                    </SelectItem>
                  ))}
                </SelectField>
                {shortagesError ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <span>
                      {shortagesErrorValue instanceof Error
                        ? shortagesErrorValue.message
                        : "Could not load material-request shortages"}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => refetchShortages()}>
                      Retry
                    </Button>
                  </div>
                ) : !shortagesLoading && shortageOptions.length === 0 ? (
                  <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No purchasing shortage exists. Fully allocated requests are already covered by
                    warehouse stock.
                  </p>
                ) : !shortagesLoading && selectableShortageOptions.length === 0 ? (
                  <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    No matching shortage can be added. Clear the search, or start a separate PO for
                    a different project, warehouse, or supplier.
                  </p>
                ) : null}
                {selectedShortage && (
                  <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-3">
                    <POInfo label="Project" value={selectedShortage.projectName} />
                    <POInfo label="Warehouse" value={selectedShortage.warehouseName} />
                    <POInfo
                      label="Needed by"
                      value={new Date(selectedShortage.neededByDate).toLocaleDateString()}
                    />
                    <POInfo
                      label="Gross shortage"
                      value={`${selectedShortage.grossShortageQuantity} ${selectedShortage.unit}`}
                    />
                    <POInfo
                      label="Already covered"
                      value={`${selectedShortage.procurementCoverageQuantity} ${selectedShortage.unit}`}
                    />
                    <POInfo
                      label="Remaining to buy"
                      value={`${selectedShortage.remainingShortageQuantity} ${selectedShortage.unit}`}
                    />
                    <div className="sm:col-span-3">
                      <p className="text-xs text-muted-foreground">Selected material</p>
                      <p className="font-medium">
                        {selectedShortage.materialName} · {selectedShortage.variantName}
                        {selectedShortage.sku ? ` · SKU ${selectedShortage.sku}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="replenishment" className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Buy stock for a managed warehouse without linking it to a material request.
                </p>
                <SelectField
                  label="Project budget"
                  value={newPO.projectId}
                  onValueChange={(value) => setNewPO((po) => ({ ...po, projectId: value }))}
                  placeholder="Select project"
                  disabled={poLines.length > 0}
                >
                  {(liveProjects ?? [])
                    .filter(
                      (project) => project.status !== "COMPLETED" && project.status !== "CANCELLED",
                    )
                    .map((project) => (
                      <SelectItem key={project.projectId} value={String(project.projectId)}>
                        {project.projectName}
                      </SelectItem>
                    ))}
                </SelectField>
                <SelectField
                  label="Destination warehouse"
                  value={newPO.warehouseId}
                  onValueChange={(value) => setNewPO((po) => ({ ...po, warehouseId: value }))}
                  placeholder="Select managed warehouse"
                  disabled={poLines.length > 0}
                >
                  {(liveWarehouses ?? []).map((warehouse) => (
                    <SelectItem key={warehouse.warehouseId} value={String(warehouse.warehouseId)}>
                      {warehouse.warehouseName} ({warehouse.location})
                    </SelectItem>
                  ))}
                </SelectField>
                <SelectField
                  label="Material variant"
                  value={newPO.variantId}
                  onValueChange={(value) => {
                    const variant = selectableReplenishmentVariants.find(
                      (option) => option.variantId === Number(value),
                    );
                    setNewPO((po) => ({
                      ...po,
                      variantId: value,
                      materialId: variant ? String(variant.materialId) : "",
                      supplierId: poLines.length > 0 ? po.supplierId : "",
                      unitPrice: "0",
                      expectedDeliveryDate: poLines.length > 0 ? po.expectedDeliveryDate : "",
                    }));
                  }}
                  placeholder="Select material variant"
                >
                  {selectableReplenishmentVariants.map((variant) => (
                    <SelectItem key={variant.variantId} value={String(variant.variantId)}>
                      {variant.label} ({variant.unit})
                    </SelectItem>
                  ))}
                </SelectField>
              </TabsContent>
            </Tabs>
            <SelectField
              label="Supplier offer"
              value={newPO.supplierId}
              onValueChange={(value) => {
                const offer = availableOffers.find(
                  (candidate) => candidate.supplierId === Number(value),
                );
                setNewPO((po) => ({
                  ...po,
                  supplierId: value,
                  unitPrice: String(offer?.unitPrice ?? 0),
                  quantity: offer
                    ? String(
                        createMode === "shortage"
                          ? offer.suggestedOrderQuantity
                          : Math.max(Number(po.quantity) || 0, offer.minimumOrderQuantity),
                      )
                    : po.quantity,
                  expectedDeliveryDate:
                    offer?.earliestDeliveryDate?.slice(0, 10) ?? po.expectedDeliveryDate,
                }));
              }}
              placeholder={
                newPO.variantId ? "Select an available supplier offer" : "Select a material first"
              }
              disabled={poLines.length > 0 || !newPO.variantId || availableOffers.length === 0}
            >
              {availableOffers.map((offer) => (
                <SelectItem key={offer.catalogId} value={String(offer.supplierId)}>
                  {offer.supplierName} · {formatMoney(offer.unitPrice)}/
                  {selectedShortage?.unit ?? selectedReplenishmentVariant?.unit ?? "unit"} · MOQ{" "}
                  {offer.minimumOrderQuantity} · {offer.leadTimeDays}d
                </SelectItem>
              ))}
            </SelectField>
            <div className="space-y-2">
              <div>
                <Label htmlFor="po-quantity">
                  Quantity
                  {createMode === "shortage" && selectedShortage?.unit
                    ? ` (${selectedShortage.unit})`
                    : createMode === "replenishment" && selectedReplenishmentVariant?.unit
                      ? ` (${selectedReplenishmentVariant.unit})`
                      : ""}
                </Label>
                <Input
                  id="po-quantity"
                  type="number"
                  min="0.01"
                  max={
                    createMode === "shortage" && selectedShortage && selectedOffer
                      ? Math.max(
                          selectedShortage.remainingShortageQuantity,
                          selectedOffer.minimumOrderQuantity,
                        )
                      : undefined
                  }
                  step="0.01"
                  value={newPO.quantity}
                  onChange={(event) => setNewPO((po) => ({ ...po, quantity: event.target.value }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {createMode === "shortage"
                    ? selectedOffer?.expectedExcessStockQuantity
                      ? `${selectedOffer.expectedExcessStockQuantity} ${selectedShortage?.unit ?? "units"} will remain as stock because of the supplier minimum.`
                      : "The backend shortage already deducts open purchase-order coverage."
                    : "The supplier catalog minimum is validated on submission."}
                </p>
              </div>
              <p className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                {selectedOffer
                  ? `${selectedOffer.supplierName}: ${formatMoney(selectedOffer.unitPrice)} per unit, minimum ${selectedOffer.minimumOrderQuantity}, lead time ${selectedOffer.leadTimeDays} day(s).`
                  : "Only active backend supplier-catalog offers can be selected."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={addPOLine}
                disabled={!newPO.variantId || !newPO.supplierId}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add material line
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Purchase-order lines</p>
                  <p className="text-xs text-muted-foreground">
                    {poLines.length > 0
                      ? `${projectName(Number(newPO.projectId))} · ${liveWarehouses?.find((warehouse) => warehouse.warehouseId === Number(newPO.warehouseId))?.warehouseName ?? `Warehouse #${newPO.warehouseId}`} · ${supplierName(Number(newPO.supplierId))}`
                      : "One supplier, project, and warehouse per PO"}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{formatMoney(draftTotal)}</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poLines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          Select a material and supplier offer, then add a line.
                        </TableCell>
                      </TableRow>
                    )}
                    {poLines.map((line) => (
                      <TableRow key={line.variantId}>
                        <TableCell>
                          <p className="font-medium">{line.materialName}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.variantName}
                            {line.sku ? ` · SKU ${line.sku}` : ""}
                            {line.requestItemId ? ` · Request item #${line.requestItemId}` : ""}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {line.quantity.toLocaleString()} {line.unit}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(line.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(line.quantity * line.unitPrice)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setPOLines((lines) =>
                                lines.filter((item) => item.variantId !== line.variantId),
                              )
                            }
                            aria-label={`Remove ${line.materialName}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="po-expected-date">Expected delivery</Label>
                <Input
                  id="po-expected-date"
                  type="date"
                  min={minimumExpectedDate || undefined}
                  value={newPO.expectedDeliveryDate}
                  onChange={(event) =>
                    setNewPO((po) => ({
                      ...po,
                      expectedDeliveryDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="po-note">Order note</Label>
                <Input
                  id="po-note"
                  value={newPO.note}
                  onChange={(event) => setNewPO((po) => ({ ...po, note: event.target.value }))}
                  maxLength={1000}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreating(false)}
              disabled={busyAction === "create"}
            >
              Cancel
            </Button>
            <Button
              onClick={submitCreate}
              disabled={busyAction === "create" || poLines.length === 0}
            >
              {busyAction === "create" ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={rejectPOId !== null}
        onOpenChange={(open) => {
          if (!open && !busyAction?.startsWith("reject-")) setRejectPOId(null);
        }}
        title={`Reject PO #${rejectPOId ?? ""}?`}
        description="This purchase order will be marked as rejected and can no longer be approved or imported."
        confirmLabel="Reject PO"
        onConfirm={reject}
        destructive
        busy={busyAction?.startsWith("reject-") ?? false}
      />

      <ConfirmDialog
        open={cancelPOId !== null}
        onOpenChange={(open) => !open && setCancelPOId(null)}
        title={`Cancel PO #${cancelPOId ?? ""}?`}
        description="The purchase order will be closed. Any outstanding on-order quantity will be released when allowed by the backend workflow."
        confirmLabel="Cancel PO"
        onConfirm={cancel}
        destructive
        busy={busyAction?.startsWith("cancel-") ?? false}
      />

      <Dialog open={selectedPOId !== null} onOpenChange={(open) => !open && setSelectedPOId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Purchase Order #{selectedPOId}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <POInfo
                  label="Project"
                  value={selectedPO.projectName || projectName(selectedPO.projectId)}
                />
                <POInfo
                  label="Supplier"
                  value={selectedPO.supplierName || supplierName(selectedPO.supplierId)}
                />
                <POInfo label="Status" value={selectedPO.status} />
                <POInfo label="Currency" value={selectedPO.currency} />
                <POInfo
                  label="Warehouse"
                  value={selectedPO.warehouseName || `#${selectedPO.warehouseId}`}
                />
                <POInfo
                  label="Order date"
                  value={
                    selectedPO.orderDate ? new Date(selectedPO.orderDate).toLocaleDateString() : "-"
                  }
                />
                <POInfo
                  label="Delivery date"
                  value={
                    selectedPO.expectedDeliveryDate
                      ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString()
                      : "-"
                  }
                />
                <POInfo label="Items" value={String(selectedPO.items.length)} />
                <POInfo
                  label="Order value"
                  value={formatMoney(selectedPO.totalAmount, selectedPO.currency)}
                />
                <POInfo
                  label="Approved"
                  value={
                    selectedPO.approvedAt
                      ? `${new Date(selectedPO.approvedAt).toLocaleString()} · User #${selectedPO.approvedByUserId}`
                      : "-"
                  }
                />
              </div>
              {selectedPO.note && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Order note</p>
                  <p>{selectedPO.note}</p>
                </div>
              )}
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          No line-item details returned by the backend.
                        </TableCell>
                      </TableRow>
                    )}
                    {selectedPO.items.map((item) => (
                      <TableRow key={item.orderLineItemId || `${item.materialId}-${item.quantity}`}>
                        <TableCell>
                          <p className="font-medium">{item.materialName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.variantName || "Standard"}
                            {item.sku ? ` · SKU ${item.sku}` : ""}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <p>{item.receivedQuantity.toLocaleString()}</p>
                          {(item.damagedQuantity > 0 || item.missingQuantity > 0) && (
                            <p className="text-xs text-destructive">
                              {item.damagedQuantity.toLocaleString()} damaged ·{" "}
                              {item.missingQuantity.toLocaleString()} missing
                            </p>
                          )}
                          {item.remainingQuantity > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {item.remainingQuantity.toLocaleString()} remaining
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{item.unit || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(item.unitPrice, selectedPO.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(item.subTotal, selectedPO.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Receive PO #{importPOId} delivery</DialogTitle>
          </DialogHeader>
          {selectedImportPO && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Receiving into{" "}
                <span className="font-medium text-foreground">
                  {selectedImportPO.warehouseName || `warehouse #${selectedImportPO.warehouseId}`}
                </span>
                . The PO warehouse is locked.
              </p>
              {selectedImportPO.items.map((item) => {
                const remaining = item.remainingQuantity;
                return (
                  <div
                    key={item.orderLineItemId}
                    className="grid gap-3 rounded-lg border p-3 sm:grid-cols-4 sm:items-end"
                  >
                    <div className="sm:col-span-4">
                      <p className="text-sm font-medium">{item.materialName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantName || "Standard"}
                        {item.sku ? ` · SKU ${item.sku}` : ""} · Remaining {remaining} {item.unit}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`receipt-${item.orderLineItemId}`}>Accepted</Label>
                      <Input
                        id={`receipt-${item.orderLineItemId}`}
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        value={receiptQuantities[item.orderLineItemId] ?? "0"}
                        onChange={(event) =>
                          setReceiptQuantities((current) => ({
                            ...current,
                            [item.orderLineItemId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`damaged-${item.orderLineItemId}`}>Damaged</Label>
                      <Input
                        id={`damaged-${item.orderLineItemId}`}
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        value={receiptDamaged[item.orderLineItemId] ?? "0"}
                        onChange={(event) =>
                          setReceiptDamaged((current) => ({
                            ...current,
                            [item.orderLineItemId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`missing-${item.orderLineItemId}`}>Missing</Label>
                      <Input
                        id={`missing-${item.orderLineItemId}`}
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.01"
                        disabled={!receiptFinalDelivery}
                        value={receiptMissing[item.orderLineItemId] ?? "0"}
                        onChange={(event) =>
                          setReceiptMissing((current) => ({
                            ...current,
                            [item.orderLineItemId]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setTrackingExpanded((current) => ({
                          ...current,
                          [item.orderLineItemId]: !current[item.orderLineItemId],
                        }))
                      }
                    >
                      {trackingExpanded[item.orderLineItemId]
                        ? "Hide tracking details"
                        : "Add tracking details"}
                    </Button>
                    {trackingExpanded[item.orderLineItemId] && (
                      <>
                        <div>
                          <Label htmlFor={`lot-${item.orderLineItemId}`}>Lot number</Label>
                          <Input
                            id={`lot-${item.orderLineItemId}`}
                            value={receiptLots[item.orderLineItemId] ?? ""}
                            onChange={(event) =>
                              setReceiptLots((current) => ({
                                ...current,
                                [item.orderLineItemId]: event.target.value,
                              }))
                            }
                            maxLength={100}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`batch-${item.orderLineItemId}`}>Batch number</Label>
                          <Input
                            id={`batch-${item.orderLineItemId}`}
                            value={receiptBatches[item.orderLineItemId] ?? ""}
                            onChange={(event) =>
                              setReceiptBatches((current) => ({
                                ...current,
                                [item.orderLineItemId]: event.target.value,
                              }))
                            }
                            maxLength={100}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`serial-${item.orderLineItemId}`}>Serial/reference</Label>
                          <Input
                            id={`serial-${item.orderLineItemId}`}
                            value={receiptSerials[item.orderLineItemId] ?? ""}
                            onChange={(event) =>
                              setReceiptSerials((current) => ({
                                ...current,
                                [item.orderLineItemId]: event.target.value,
                              }))
                            }
                            maxLength={200}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`expiry-${item.orderLineItemId}`}>Expiry date</Label>
                          <Input
                            id={`expiry-${item.orderLineItemId}`}
                            type="date"
                            min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
                            value={receiptExpiries[item.orderLineItemId] ?? ""}
                            onChange={(event) =>
                              setReceiptExpiries((current) => ({
                                ...current,
                                [item.orderLineItemId]: event.target.value,
                              }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={receiptFinalDelivery}
                  onChange={(event) => setReceiptFinalDelivery(event.target.checked)}
                />
                This is the final delivery
              </label>
              <div>
                <Label htmlFor="receipt-note">Receipt note</Label>
                <Textarea
                  id="receipt-note"
                  value={receiptNote}
                  onChange={(event) => setReceiptNote(event.target.value)}
                  maxLength={1000}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportOpen(false)}
              disabled={busyAction?.startsWith("import-")}
            >
              Cancel
            </Button>
            <Button onClick={importToWarehouse} disabled={busyAction?.startsWith("import-")}>
              <Download className="h-3.5 w-3.5 mr-1" />{" "}
              {busyAction?.startsWith("import-") ? "Receiving..." : "Receive stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isLive ? (
        <Card className="shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Sign in with a real backend account to manage purchase orders.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading purchase orders...
        </div>
      ) : isError ? (
        <QueryError
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetchPOs()}
        />
      ) : (
        <Tabs value={workflowTab} onValueChange={setWorkflowTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending
              {pending.length > 0 && (
                <Badge className="ml-1.5 h-4 min-w-[1rem] rounded-full text-[9px] p-0 flex items-center justify-center">
                  {pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Awaiting receipt
              {approved.length > 0 && (
                <Badge className="ml-1.5 h-4 min-w-[1rem] rounded-full p-0 text-[9px] flex items-center justify-center">
                  {approved.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected
              {rejected.length > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1.5 h-4 min-w-[1rem] rounded-full p-0 text-[9px] flex items-center justify-center"
                >
                  {rejected.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <PurchaseOrderTable
              rows={pending}
              projectName={projectName}
              supplierName={supplierName}
              onApprove={canApproveOrReject ? approve : undefined}
              onReject={canApproveOrReject ? setRejectPOId : undefined}
              reviewBlockReason={reviewBlockReason}
              onView={setSelectedPOId}
              onCancel={setCancelPOId}
              canCancel={canCancelOrder}
              busyAction={busyAction}
            />
          </TabsContent>
          <TabsContent value="approved">
            <PurchaseOrderTable
              rows={approved}
              projectName={projectName}
              supplierName={supplierName}
              onImport={
                canImport
                  ? (poId) => {
                      setImportPOId(poId);
                      const po = scopedPOs.find((item) => item.poId === poId);
                      setReceiptQuantities(
                        Object.fromEntries(
                          (po?.items ?? []).map((item) => [
                            item.orderLineItemId,
                            String(item.remainingQuantity),
                          ]),
                        ),
                      );
                      setReceiptDamaged({});
                      setReceiptMissing({});
                      setReceiptLots({});
                      setReceiptBatches({});
                      setReceiptSerials({});
                      setReceiptExpiries({});
                      setTrackingExpanded({});
                      setReceiptFinalDelivery(false);
                      setReceiptNote("");
                      setImportOpen(true);
                    }
                  : undefined
              }
              onView={setSelectedPOId}
              onProcessing={canImport ? markProcessing : undefined}
              onShip={canImport ? ship : undefined}
              onCancel={setCancelPOId}
              canCancel={canCancelOrder}
              busyAction={busyAction}
            />
          </TabsContent>
          <TabsContent value="rejected">
            <PurchaseOrderTable
              rows={rejected}
              projectName={projectName}
              supplierName={supplierName}
              onView={setSelectedPOId}
              busyAction={busyAction}
            />
          </TabsContent>
          <TabsContent value="delivered">
            <PurchaseOrderTable
              rows={delivered}
              projectName={projectName}
              supplierName={supplierName}
              onView={setSelectedPOId}
              busyAction={busyAction}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ProcurementMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function POInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function PipelineBar({
  pending,
  approved,
  rejected,
  delivered,
}: {
  pending: number;
  approved: number;
  rejected: number;
  delivered: number;
}) {
  const total = pending + approved + rejected + delivered;
  const width = (value: number) => (total ? `${(value / total) * 100}%` : "0%");

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="font-medium">Purchase order pipeline</p>
          <div className="flex gap-3 text-muted-foreground">
            <span>{pending} pending</span>
            <span>{approved} awaiting receipt</span>
            <span>{rejected} rejected</span>
            <span>{delivered} delivered</span>
          </div>
        </div>
        <div
          className="flex h-2.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${pending} pending, ${approved} awaiting receipt, ${rejected} rejected, ${delivered} delivered`}
        >
          <span className="bg-warning" style={{ width: width(pending) }} />
          <span className="bg-primary" style={{ width: width(approved) }} />
          <span className="bg-destructive" style={{ width: width(rejected) }} />
          <span className="bg-success" style={{ width: width(delivered) }} />
        </div>
      </CardContent>
    </Card>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  placeholder,
  disabled,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function PurchaseOrderTable({
  rows,
  projectName,
  supplierName,
  onApprove,
  onReject,
  reviewBlockReason,
  onView,
  onImport,
  onProcessing,
  onShip,
  onCancel,
  canCancel,
  busyAction,
}: {
  rows: PurchaseOrderResponse[];
  projectName: (id: number) => string;
  supplierName: (id: number) => string;
  onApprove?: (poId: number) => void;
  onReject?: (poId: number) => void;
  reviewBlockReason?: (po: PurchaseOrderResponse) => string | undefined;
  onView?: (poId: number) => void;
  onImport?: (poId: number) => void;
  onProcessing?: (poId: number) => void;
  onShip?: (poId: number) => void;
  onCancel?: (poId: number) => void;
  canCancel?: (po: PurchaseOrderResponse) => boolean;
  busyAction?: string | null;
}) {
  const items = rows ?? [];
  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Order value</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No purchase orders
                </TableCell>
              </TableRow>
            )}
            {items.map((po) => (
              <TableRow key={po.poId}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{po.poId}
                </TableCell>
                <TableCell className="font-medium">{projectName(po.projectId)}</TableCell>
                <TableCell>{supplierName(po.supplierId)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(po.totalAmount, po.currency)}
                </TableCell>
                <TableCell className="text-xs">
                  {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      statusConfig[po.status.toLowerCase() as keyof typeof statusConfig]?.cls ?? "",
                    )}
                  >
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onView && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => onView(po.poId)}
                      >
                        <Eye className="mr-1 h-3 w-3" /> Details
                      </Button>
                    )}
                    {po.status === "PENDING" &&
                      (onApprove || onReject) &&
                      (reviewBlockReason?.(po) ? (
                        <span
                          className="max-w-56 text-xs text-muted-foreground"
                          title={reviewBlockReason?.(po)}
                        >
                          {reviewBlockReason?.(po)}
                        </span>
                      ) : (
                        <>
                          {onReject && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => onReject(po.poId)}
                              disabled={busyAction !== null}
                            >
                              <X className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          )}
                          {onApprove && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => onApprove(po.poId)}
                              disabled={busyAction !== null}
                            >
                              <Check className="h-3 w-3 mr-1" />{" "}
                              {busyAction === `approve-${po.poId}` ? "Approving..." : "Approve"}
                            </Button>
                          )}
                        </>
                      ))}
                    {["APPROVED", "PROCESSING", "SHIPPED", "PARTIALLY_RECEIVED"].includes(
                      po.status,
                    ) &&
                      onImport && (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => onImport(po.poId)}
                          disabled={busyAction !== null}
                          title={
                            po.status === "APPROVED"
                              ? "Use this when the delivery arrives before the expected date"
                              : "Record the quantities delivered to the warehouse"
                          }
                          aria-label={`${po.status === "APPROVED" ? "Receive early" : "Receive"} purchase order #${po.poId}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {po.status === "APPROVED" ? "Receive early" : "Receive"}
                        </Button>
                      )}
                    {po.status === "APPROVED" && onProcessing && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={!!busyAction}
                        onClick={() => onProcessing(po.poId)}
                      >
                        <Clock3 className="mr-1 h-3 w-3" />
                        {busyAction === `processing-${po.poId}` ? "Updating..." : "Mark processing"}
                      </Button>
                    )}
                    {po.status === "PROCESSING" && onShip && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        disabled={!!busyAction}
                        onClick={() => onShip(po.poId)}
                      >
                        <Truck className="mr-1 h-3 w-3" />
                        {busyAction === `ship-${po.poId}` ? "Updating..." : "Mark shipped"}
                      </Button>
                    )}
                    {onCancel && canCancel?.(po) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={!!busyAction}
                        onClick={() => onCancel(po.poId)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
