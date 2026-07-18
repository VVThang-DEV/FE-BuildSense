import { apiClient } from "./client";

export type MaterialResponse = {
  materialId: number;
  materialName: string;
  defaultUnit: string;
  /** Compatibility alias used by existing screens. */
  unit: string;
  description?: string | null;
  isActive: boolean;
  categoryId: number;
  variants: MaterialVariantResponse[];
};

export type MaterialVariantResponse = {
  variantId: number;
  materialId: number;
  materialName: string;
  variantName: string;
  sku?: string | null;
  brand?: string | null;
  grade?: string | null;
  size?: string | null;
  color?: string | null;
  specification?: string | null;
  packaging?: string | null;
  unit: string;
  isActive: boolean;
};

export type MaterialVariantRequest = {
  materialId: number;
  variantName: string;
  sku?: string;
  brand?: string;
  grade?: string;
  size?: string;
  color?: string;
  specification?: string;
  packaging?: string;
  unit: string;
  isActive?: boolean;
};

type RawMaterialResponse = Omit<Partial<MaterialResponse>, "variants"> & {
  variants?: Partial<MaterialVariantResponse>[];
};

function normalizeMaterial(material: RawMaterialResponse): MaterialResponse {
  const defaultUnit = material.defaultUnit ?? material.unit ?? "";
  return {
    materialId: material.materialId ?? 0,
    materialName: material.materialName ?? "Unknown material",
    defaultUnit,
    unit: defaultUnit,
    description: material.description ?? null,
    isActive: material.isActive ?? true,
    categoryId: material.categoryId ?? 0,
    variants: (material.variants ?? []).map((variant) => ({
      variantId: variant.variantId ?? 0,
      materialId: variant.materialId ?? material.materialId ?? 0,
      materialName: variant.materialName ?? material.materialName ?? "Unknown material",
      variantName: variant.variantName ?? "Standard",
      sku: variant.sku ?? null,
      brand: variant.brand ?? null,
      grade: variant.grade ?? null,
      size: variant.size ?? null,
      color: variant.color ?? null,
      specification: variant.specification ?? null,
      packaging: variant.packaging ?? null,
      unit: variant.unit ?? defaultUnit,
      isActive: variant.isActive ?? true,
    })),
  };
}

export const materialsApi = {
  getAll: async () => {
    const response = await apiClient.get<RawMaterialResponse[]>("/api/materials");
    return { ...response, result: (response.result ?? []).map(normalizeMaterial) };
  },
  getById: async (id: number) => {
    const response = await apiClient.get<RawMaterialResponse>(`/api/materials/${id}`);
    return {
      ...response,
      result: response.result ? normalizeMaterial(response.result) : response.result,
    };
  },
  getVariants: (materialId: number) =>
    apiClient.get<MaterialVariantResponse[]>(`/api/materials/${materialId}/variants`),
  create: async (body: {
    materialName: string;
    unit: string;
    categoryId: number;
    description?: string;
    isActive?: boolean;
  }) => {
    const response = await apiClient.post<RawMaterialResponse>("/api/materials", {
      materialName: body.materialName,
      defaultUnit: body.unit,
      categoryId: body.categoryId,
      description: body.description,
      isActive: body.isActive ?? true,
    });
    return {
      ...response,
      result: response.result ? normalizeMaterial(response.result) : response.result,
    };
  },
  update: (
    id: number,
    body: { materialName: string; unit: string; description?: string; isActive: boolean },
  ) =>
    apiClient.put<string>(`/api/materials/${id}`, {
      materialName: body.materialName,
      defaultUnit: body.unit,
      description: body.description,
      isActive: body.isActive,
    }),
  delete: (id: number) => apiClient.delete<string>(`/api/materials/${id}`),
  createVariant: (body: MaterialVariantRequest) =>
    apiClient.post<MaterialVariantResponse>("/api/materials/variants", body),
  updateVariant: (variantId: number, body: MaterialVariantRequest) =>
    apiClient.put<string>(`/api/materials/variants/${variantId}`, body),
  deleteVariant: (variantId: number) =>
    apiClient.delete<string>(`/api/materials/variants/${variantId}`),
};
