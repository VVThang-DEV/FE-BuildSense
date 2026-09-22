import { apiClient } from "./client";

export type SupplierResponse = {
  supplierId: number;
  companyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address?: string | null;
};

// ────────────────────────────────────────
// AI Supplier Recommendation types
// ────────────────────────────────────────

export type BalancedSupplierRecommendationRequest = {
  projectId?: number;
  items: { materialId: number; quantity: number }[];
  costWeight?: number;
  reliabilityWeight?: number;
  leadTimeWeight?: number;
  maxRecommendations?: number;
  searchWebForNearbySuppliers?: boolean;
  warehouseLocation?: string;
  searchRadiusKm?: number;
  regionCode?: string;
};

export type SupplierRecommendationLine = {
  materialId: number;
  materialName: string;
  quantity: number;
  unitPrice: number;
  estimatedLineCost: number;
  leadTimeDays: number;
};

export type SupplierRecommendation = {
  supplierId: number;
  source: "InternalCatalog" | "WebSearch" | string;
  companyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  distanceEstimate: string | null;
  estimatedTotalCost: number;
  averageLeadTimeDays: number;
  reliabilityScore: number;
  defectRatePct: number;
  avgDeliveryDelay: number;
  balancedScore: number;
  matchedMaterialCount: number;
  requestedMaterialCount: number;
  reason: string;
  sourceUrls: string[];
  lines: SupplierRecommendationLine[];
};

export type BalancedSupplierRecommendationResponse = {
  usedGoogleAI: boolean;
  usedWebSearch: boolean;
  strategy: string;
  aiSummary: string | null;
  webSearchSummary: string | null;
  recommendations: SupplierRecommendation[];
};

// ────────────────────────────────────────
// API client
// ────────────────────────────────────────

export const suppliersApi = {
  getAll: () => apiClient.get<SupplierResponse[]>("/api/suppliers"),
  create: (body: { companyName: string; contactEmail?: string; contactPhone?: string }) =>
    apiClient.post<string>("/api/suppliers", body),

  // Supplier recommendations retired (HTTP 410). Do not build UI for them.
};
