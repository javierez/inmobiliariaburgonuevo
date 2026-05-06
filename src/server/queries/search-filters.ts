import { sql, eq, inArray, type SQL } from "drizzle-orm";
import { listings, properties } from "~/server/db/schema";

// Canonical SearchFilters type shared between result queries (listings.ts)
// and location-option queries (locations.ts) so they apply identical WHERE
// logic for everything except location itself.
export interface SearchFilters {
  // Legacy single-value location — used only when `cities` / `neighborhoodIds`
  // are absent (e.g. old bookmarked URLs).
  location?: string;
  // Multi-select city names (LIKE-matched per-city, OR'd together).
  cities?: string[];
  // Multi-select neighborhood IDs (serialized bigints).
  neighborhoodIds?: string[];
  // Province filter — canonical Spanish province name (e.g. "Zamora").
  // Resolved against DB variants in listings.ts before being applied.
  province?: string;
  // Single value (legacy) or array for multi-select
  propertyType?: string | string[];
  bedrooms?: number;
  bathrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  status?: "for-sale" | "for-rent";
  isOportunidad?: boolean;
  isBankOwned?: boolean;
  isFeatured?: boolean;
  hasPromotion?: boolean;
  promotionId?: bigint | string;
}

// Everything except location fields (cities / neighborhoodIds / location / province).
// Used by getProvinces / getCitiesAndNeighborhoodsByProvince so the dropdown
// only shows places that still have matching listings after other filters.
export type NonLocationFilters = Omit<
  SearchFilters,
  "cities" | "neighborhoodIds" | "location" | "province"
>;

export function buildNonLocationFilterConditions(
  filters?: NonLocationFilters,
): SQL[] {
  const conds: SQL[] = [];
  if (!filters) return conds;

  if (filters.propertyType) {
    const types = (
      Array.isArray(filters.propertyType)
        ? filters.propertyType
        : [filters.propertyType]
    ).filter((t): t is string => !!t && t !== "any");
    if (types.length === 1) {
      conds.push(eq(properties.propertyType, types[0]!));
    } else if (types.length > 1) {
      conds.push(inArray(properties.propertyType, types));
    }
  }

  if (filters.status === "for-rent") {
    conds.push(sql`${listings.listingType} IN ('Rent', 'RentWithOption')`);
  } else if (filters.status === "for-sale") {
    conds.push(eq(listings.listingType, "Sale"));
  }

  if (filters.bedrooms && filters.bedrooms > 0) {
    conds.push(sql`${properties.bedrooms} >= ${filters.bedrooms}`);
  }

  if (filters.bathrooms && filters.bathrooms > 0) {
    conds.push(
      sql`CAST(${properties.bathrooms} AS DECIMAL) >= ${filters.bathrooms}`,
    );
  }

  if (filters.minPrice && filters.minPrice > 0) {
    conds.push(
      sql`CAST(${listings.price} AS DECIMAL) >= ${filters.minPrice}`,
    );
  }

  if (filters.maxPrice && filters.maxPrice > 0) {
    conds.push(
      sql`CAST(${listings.price} AS DECIMAL) <= ${filters.maxPrice}`,
    );
  }

  if (filters.minArea && filters.minArea > 0) {
    conds.push(sql`${properties.squareMeter} >= ${filters.minArea}`);
  }

  if (filters.maxArea && filters.maxArea > 0) {
    conds.push(sql`${properties.squareMeter} <= ${filters.maxArea}`);
  }

  if (filters.isOportunidad) {
    conds.push(eq(listings.isOpportunity, true));
  }

  if (filters.isBankOwned) {
    conds.push(eq(listings.isBankOwned, true));
  }

  if (filters.isFeatured) {
    conds.push(eq(listings.isFeatured, true));
  }

  if (filters.hasPromotion) {
    conds.push(sql`${listings.promotionId} IS NOT NULL`);
  }

  if (filters.promotionId !== undefined && filters.promotionId !== "") {
    const id =
      typeof filters.promotionId === "bigint"
        ? filters.promotionId
        : BigInt(filters.promotionId);
    conds.push(eq(listings.promotionId, id));
  }

  return conds;
}
