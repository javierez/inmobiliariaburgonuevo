"use server";

import { db } from "../db";
import {
  properties,
  listings,
  locations,
  users,
  propertyImages,
  websiteProperties,
} from "~/server/db/schema";
import { eq, and, desc, asc, sql, or, notInArray, inArray, type SQL } from "drizzle-orm";
import { cache } from "react";
import { env } from "~/env";
import { hasAtLeastOnePhoto } from "./filters";
import {
  buildNonLocationFilterConditions,
  type SearchFilters as BaseSearchFilters,
} from "./search-filters";
import { toLocationKey } from "~/lib/location-normalization";

const ACCOUNT_ID = 111n;

export type FeedImage = {
  propertyImageId: string;
  imageUrl: string;
  imageOrder: number;
  imageTag: string | null;
};

export type ListingCardData = {
  // Essential listing fields
  listingId: bigint;
  propertyId: bigint;
  price: string;
  listingType: string;
  status: string;
  isBankOwned: boolean | null;
  isOportunidad: boolean | null;
  isFeatured: boolean | null;
  agentName: string | null;

  // Essential property fields
  title: string | null;
  description: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: string | null;
  squareMeter: number | null;
  builtSurfaceArea: string | null;
  street: string | null;

  // Location fields
  city: string | null;
  province: string | null;

  // Image fields
  imageUrl: string | null;
  imageUrl2: string | null;
  // Original (un-watermarked) URLs, set only when imageUrl/imageUrl2 was
  // rewritten to a watermarked S3 path that may not exist yet (cache not
  // warmed). The card uses these as `onError` fallbacks before giving up to
  // the placeholder.
  imageUrlFallback: string | null;
  imageUrl2Fallback: string | null;
};

// Canonical type lives in ./search-filters (so locations.ts can share the
// same shape). Re-exported here so existing consumers keep their import path.
export type SearchFilters = BaseSearchFilters;

// The URL encodes city names as accent-free slugs (`león` → `leon`) but the
// DB stores the raw "León" variant. Resolve slugs to the exact variants that
// live in `locations.city` so the query can use exact `IN (...)` matching
// instead of a brittle LIKE that fails on diacritics.
async function resolveCityVariants(slugs: string[]): Promise<string[]> {
  if (slugs.length === 0) return [];
  const keys = new Set(slugs.map((s) => toLocationKey(s.replace(/-/g, " "))));
  const rows = await db
    .selectDistinct({ city: locations.city })
    .from(locations)
    .where(eq(locations.isActive, true));
  const matched = rows
    .map((r) => r.city)
    .filter((city) => keys.has(toLocationKey(city)));
  return Array.from(new Set(matched));
}

// Same idea as resolveCityVariants but for provinces: the URL slug is
// accent-free (`provincia-leon`) while the DB stores variants like "León"
// or "LEON". Resolve the slug to all matching DB variants so we can use
// `IN (...)` instead of a brittle LIKE.
async function resolveProvinceVariants(slug: string): Promise<string[]> {
  const key = toLocationKey(slug.replace(/-/g, " "));
  const rows = await db
    .selectDistinct({ province: locations.province })
    .from(locations)
    .where(eq(locations.isActive, true));
  return rows
    .map((r) => r.province)
    .filter((p): p is string => !!p && toLocationKey(p) === key);
}

type ResolvedFilters = SearchFilters & { provinceVariants?: string[] };

async function resolveFilters(
  filters?: SearchFilters,
): Promise<ResolvedFilters | undefined> {
  if (!filters) return filters;
  const resolved: ResolvedFilters = { ...filters };
  if (filters.cities && filters.cities.length > 0) {
    resolved.cities = await resolveCityVariants(filters.cities);
  }
  if (filters.province) {
    resolved.provinceVariants = await resolveProvinceVariants(filters.province);
  }
  return resolved;
}

export type SortOption = "default" | "newest" | "price-asc" | "price-desc" | "size-asc" | "size-desc";

function buildWhereConditions(filters?: ResolvedFilters) {
  // Exclude Draft/Descartado always; Vendido/Alquilado only if updated within last 2 weeks
  const whereConditions = [
    eq(listings.accountId, ACCOUNT_ID),
    eq(listings.isActive, true),
    eq(listings.publishToWebsite, true),
    hasAtLeastOnePhoto(listings.propertyId),
    or(
      notInArray(listings.status, ["Draft", "Descartado", "Vendido", "Alquilado"]),
      and(
        sql`${listings.status} IN ('Vendido', 'Alquilado')`,
        sql`${listings.updatedAt} >= NOW() - INTERVAL '14 days'`,
      ),
    ),
  ];

  if (filters) {
    // Multi-select city + neighborhood filter: any match counts (OR semantics).
    const hasCities = !!filters.cities && filters.cities.length > 0;
    const hasNeighborhoods =
      !!filters.neighborhoodIds && filters.neighborhoodIds.length > 0;

    if (hasCities || hasNeighborhoods) {
      const locationClauses = [] as ReturnType<typeof sql>[];

      if (hasCities) {
        // `filters.cities` is expected to be pre-resolved into real DB-stored
        // variants (see `resolveCityVariants`). Exact match avoids the
        // diacritics / fuzzy-LIKE pitfalls that bit the slug-based approach.
        const variants = filters.cities!.filter((c) => !!c);
        if (variants.length > 0) {
          locationClauses.push(inArray(locations.city, variants));
        } else {
          // The user selected cities but resolution returned zero DB variants
          // — force-fail the query instead of silently dropping the filter
          // (which would return everything and surprise the user).
          locationClauses.push(sql`false`);
        }
      }

      if (hasNeighborhoods) {
        const ids = filters
          .neighborhoodIds!.map((raw) => {
            try {
              return BigInt(raw);
            } catch {
              return null;
            }
          })
          .filter((v): v is bigint => v !== null);
        if (ids.length > 0) {
          locationClauses.push(inArray(locations.neighborhoodId, ids));
        }
      }

      if (locationClauses.length > 0) {
        const combined = or(...locationClauses);
        if (combined) whereConditions.push(combined);
      }
    } else if (filters.location && filters.location !== "todas-ubicaciones") {
      // Legacy single-value fallback (old bookmarked URLs).
      const locationValue = filters.location.replace(/-/g, " ");
      whereConditions.push(
        sql`(
        LOWER(${locations.city}) LIKE ${`%${locationValue.toLowerCase()}%`} OR
        LOWER(${locations.province}) LIKE ${`%${locationValue.toLowerCase()}%`} OR
        LOWER(${properties.street}) LIKE ${`%${locationValue.toLowerCase()}%`}
      )`,
      );
    }

    // Province filter: ANDs with whatever city/neighborhood is selected (if a
    // city is in a different province, the result is empty — which is correct).
    // `provinceVariants` is pre-resolved by `resolveFilters` to the exact
    // DB-stored spelling variants of the slug (handles "León" vs "LEON").
    if (filters.province) {
      const variants = filters.provinceVariants ?? [];
      if (variants.length > 0) {
        whereConditions.push(inArray(locations.province, variants));
      } else {
        // Slug didn't resolve to any known DB variant — force-fail rather
        // than silently dropping the filter (matches city-resolution behavior).
        whereConditions.push(sql`false`);
      }
    }

    // Everything that isn't location: propertyType, status, bedrooms,
    // bathrooms, price, area, isOportunidad — shared with the location-option
    // queries in locations.ts so the dropdown narrows with them.
    whereConditions.push(...buildNonLocationFilterConditions(filters));
  }

  return whereConditions;
}

export const countListings = cache(
  async (filters?: SearchFilters): Promise<number> => {
    try {
      const resolved = await resolveFilters(filters);
      const whereConditions = buildWhereConditions(resolved);

      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(listings)
        .innerJoin(properties, eq(listings.propertyId, properties.propertyId))
        .leftJoin(
          locations,
          eq(properties.neighborhoodId, locations.neighborhoodId),
        )
        .where(and(...whereConditions));

      return Number(result[0]?.count ?? 0);
    } catch (error) {
      console.error("Error counting listings:", error);
      return 0;
    }
  },
);

// Resolve effective watermark URLs for a card row, mirroring the per-listing
// resolution chain in `getPropertyImages` (listing override → account default).
// When watermarking is enabled, rewrite to the deterministic S3 path baked by
// vesta-crm at publish time. The original URL is preserved when no override
// applies, and is also returned so the client can fall back if the watermarked
// file 404s (e.g. listing was published before cache warm-up).
function resolveCardImages(row: {
  accountId: bigint;
  propertyId: bigint;
  imageUrl: string | null;
  imageUrl2: string | null;
  imageOrder: number | null;
  imageOrder2: number | null;
  listingWmProps: unknown;
  accountWmProps: string | null;
}): {
  imageUrl: string | null;
  imageUrl2: string | null;
  imageUrlFallback: string | null;
  imageUrl2Fallback: string | null;
} {
  let accountWm: { enabled?: boolean } = {};
  let listingWm: { enabled?: boolean } | null = null;
  try {
    accountWm =
      typeof row.accountWmProps === "string"
        ? (JSON.parse(row.accountWmProps) as { enabled?: boolean })
        : (row.accountWmProps ?? {});
  } catch {
    accountWm = {};
  }
  try {
    listingWm =
      typeof row.listingWmProps === "string"
        ? (JSON.parse(row.listingWmProps) as { enabled?: boolean })
        : (row.listingWmProps as { enabled?: boolean } | null);
  } catch {
    listingWm = null;
  }
  const effectiveEnabled =
    listingWm?.enabled ?? accountWm?.enabled ?? false;

  if (!effectiveEnabled) {
    return {
      imageUrl: row.imageUrl,
      imageUrl2: row.imageUrl2,
      imageUrlFallback: null,
      imageUrl2Fallback: null,
    };
  }

  const accountId = row.accountId.toString();
  const propertyId = row.propertyId.toString();

  let imageUrl = row.imageUrl;
  let imageUrl2 = row.imageUrl2;
  // Fallback is the original (un-watermarked) URL — populated only when we
  // actually swap to the watermarked path. If the watermarked file 404s
  // (cache not warmed yet for this listing), the card swaps back here
  // before giving up to the placeholder.
  let imageUrlFallback: string | null = null;
  let imageUrl2Fallback: string | null = null;

  if (row.imageOrder != null) {
    const wm = buildWatermarkedUrl(accountId, propertyId, row.imageOrder);
    if (wm) {
      imageUrlFallback = row.imageUrl;
      imageUrl = wm;
    }
  }
  if (row.imageOrder2 != null) {
    const wm2 = buildWatermarkedUrl(accountId, propertyId, row.imageOrder2);
    if (wm2) {
      imageUrl2Fallback = row.imageUrl2;
      imageUrl2 = wm2;
    }
  }

  return { imageUrl, imageUrl2, imageUrlFallback, imageUrl2Fallback };
}

export const searchListings = cache(
  async (
    filters?: SearchFilters,
    limit = 24,
    sort: SortOption = "default",
    offset = 0,
    extraPredicate?: SQL,
  ): Promise<ListingCardData[]> => {
    try {
      const resolved = await resolveFilters(filters);
      const whereConditions = buildWhereConditions(resolved);
      if (extraPredicate) whereConditions.push(extraPredicate);

      const listingsData = await db
        .select({
          // Essential listing fields
          listingId: listings.listingId,
          propertyId: listings.propertyId,
          accountId: listings.accountId,
          price: listings.price,
          listingType: listings.listingType,
          status: listings.status,
          isBankOwned: listings.isBankOwned,
          isOportunidad: listings.isOpportunity,
          isFeatured: listings.isFeatured,

          // Essential property fields
          // Listing's publishableTitle overrides property title when set.
          title: sql<string | null>`COALESCE(${listings.publishableTitle}, ${properties.title})`,
          description: listings.description,
          propertyType: properties.propertyType,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          squareMeter: properties.squareMeter,
          builtSurfaceArea: properties.builtSurfaceArea,
          street: properties.street,

          // Location fields
          city: locations.city,
          province: locations.province,

          // Agent name
          agentName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,

          // First image: URL + image_order so we can rewrite to the watermarked
          // S3 path when watermarking is enabled. The tiebreaker on
          // property_image_id is required because image_order has default 0
          // and may collide; without it the URL and order subqueries could
          // select different rows.
          imageUrl: sql<string | null>`(
          SELECT COALESCE(thumb_url, image_url)
          FROM property_images
          WHERE property_id = ${properties.propertyId}
            AND is_active = true
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC, property_image_id ASC
          LIMIT 1
        )`,
          imageOrder: sql<number | null>`(
          SELECT image_order
          FROM property_images
          WHERE property_id = ${properties.propertyId}
            AND is_active = true
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC, property_image_id ASC
          LIMIT 1
        )`,

          // Second image (same pair).
          imageUrl2: sql<string | null>`(
          SELECT COALESCE(thumb_url, image_url)
          FROM property_images
          WHERE property_id = ${properties.propertyId}
            AND is_active = true
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC, property_image_id ASC
          LIMIT 1 OFFSET 1
        )`,
          imageOrder2: sql<number | null>`(
          SELECT image_order
          FROM property_images
          WHERE property_id = ${properties.propertyId}
            AND is_active = true
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC, property_image_id ASC
          LIMIT 1 OFFSET 1
        )`,

          // Watermark resolution inputs (listing override + account default).
          listingWmProps: listings.watermarkProps,
          accountWmProps: websiteProperties.watermarkProps,
        })
        .from(listings)
        .innerJoin(properties, eq(listings.propertyId, properties.propertyId))
        .leftJoin(
          locations,
          eq(properties.neighborhoodId, locations.neighborhoodId),
        )
        .leftJoin(users, eq(listings.agentId, users.id))
        .leftJoin(
          websiteProperties,
          eq(websiteProperties.accountId, listings.accountId),
        )
        .where(and(...whereConditions))
        .orderBy(
          ...(() => {
            switch (sort) {
              case "newest":
                return [desc(listings.createdAt)];
              case "price-asc":
                return [asc(sql`CAST(${listings.price} AS DECIMAL)`)];
              case "price-desc":
                return [desc(sql`CAST(${listings.price} AS DECIMAL)`)];
              case "size-asc":
                return [asc(sql`COALESCE(${properties.squareMeter}, 0)`)];
              case "size-desc":
                return [desc(sql`COALESCE(${properties.squareMeter}, 0)`)];
              default:
                // Group by property type: casa/piso first, local second, rest last
                return [
                  asc(sql`CASE
                    WHEN ${properties.propertyType} IN ('casa', 'piso') THEN 0
                    WHEN ${properties.propertyType} = 'local' THEN 1
                    ELSE 2
                  END`),
                  desc(listings.isFeatured),
                  desc(sql`CAST(${listings.price} AS DECIMAL)`),
                ];
            }
          })(),
        )
        .limit(limit)
        .offset(offset);

      // Transform the data
      return listingsData.map((listing) => {
        const { imageUrl, imageUrl2, imageUrlFallback, imageUrl2Fallback } =
          resolveCardImages(listing);
        return {
          listingId: listing.listingId,
          propertyId: listing.propertyId,
          price: listing.price?.toString() || "0",
          listingType: listing.listingType,
          status: listing.status,
          isBankOwned: listing.isBankOwned,
          isOportunidad: listing.isOportunidad,
          isFeatured: listing.isFeatured,
          agentName: listing.agentName,
          title: listing.title,
          description: listing.description,
          propertyType: listing.propertyType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms?.toString() || null,
          squareMeter: listing.squareMeter,
          builtSurfaceArea: listing.builtSurfaceArea?.toString() || null,
          street: listing.street,
          city: listing.city,
          province: listing.province,
          imageUrl,
          imageUrl2,
          imageUrlFallback,
          imageUrl2Fallback,
        };
      });
    } catch (error) {
      console.error("Error searching listings:", error);
      return [];
    }
  },
);

export const getListingsForGrid = cache(
  async (limit = 12): Promise<ListingCardData[]> => {
    try {
      // Simplified query with subqueries for images
      const listingsData = await db
        .select({
          // Essential listing fields
          listingId: listings.listingId,
          propertyId: listings.propertyId,
          accountId: listings.accountId,
          price: listings.price,
          listingType: listings.listingType,
          status: listings.status,
          isBankOwned: listings.isBankOwned,
          isOportunidad: listings.isOpportunity,
          isFeatured: listings.isFeatured,

          // Essential property fields
          // Listing's publishableTitle overrides property title when set.
          title: sql<string | null>`COALESCE(${listings.publishableTitle}, ${properties.title})`,
          description: listings.description,
          propertyType: properties.propertyType,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          squareMeter: properties.squareMeter,
          builtSurfaceArea: properties.builtSurfaceArea,
          street: properties.street,

          // Location fields
          city: locations.city,
          province: locations.province,

          // Agent name
          agentName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,

          // First image: URL + image_order paired with the same ORDER BY +
          // tiebreaker so they pick the same row. See `searchListings` for the
          // rationale behind selecting image_order alongside the URL.
          imageUrl: sql<string | null>`(
          SELECT COALESCE(thumb_url, image_url)
          FROM property_images
          WHERE property_id = ${properties.propertyId}
            AND is_active = true
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC, property_image_id ASC
          LIMIT 1
        )`,
          imageOrder: sql<number | null>`(
          SELECT image_order
          FROM property_images
          WHERE property_id = ${properties.propertyId}
            AND is_active = true
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC, property_image_id ASC
          LIMIT 1
        )`,

          // Second image (same pair).
          imageUrl2: sql<string | null>`(
          SELECT COALESCE(thumb_url, image_url)
          FROM property_images
          WHERE property_id = ${properties.propertyId}
            AND is_active = true
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC, property_image_id ASC
          LIMIT 1 OFFSET 1
        )`,
          imageOrder2: sql<number | null>`(
          SELECT image_order
          FROM property_images
          WHERE property_id = ${properties.propertyId}
            AND is_active = true
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC, property_image_id ASC
          LIMIT 1 OFFSET 1
        )`,

          // Watermark resolution inputs (listing override + account default).
          listingWmProps: listings.watermarkProps,
          accountWmProps: websiteProperties.watermarkProps,
        })
        .from(listings)
        .innerJoin(properties, eq(listings.propertyId, properties.propertyId))
        .leftJoin(
          locations,
          eq(properties.neighborhoodId, locations.neighborhoodId),
        )
        .leftJoin(users, eq(listings.agentId, users.id))
        .leftJoin(
          websiteProperties,
          eq(websiteProperties.accountId, listings.accountId),
        )
        .where(
          and(
            eq(listings.accountId, ACCOUNT_ID),
            eq(listings.isActive, true),
            eq(listings.publishToWebsite, true),
            hasAtLeastOnePhoto(listings.propertyId),
            inArray(properties.propertyType, ["casa", "piso"]),
            or(
              notInArray(listings.status, ["Draft", "Descartado", "Vendido", "Alquilado"]),
              and(
                sql`${listings.status} IN ('Vendido', 'Alquilado')`,
                sql`${listings.updatedAt} >= NOW() - INTERVAL '14 days'`,
              ),
            ),
          ),
        )
        .orderBy(desc(listings.isFeatured), desc(listings.price))
        .limit(limit);

      // Transform the data
      return listingsData.map((listing) => {
        const { imageUrl, imageUrl2, imageUrlFallback, imageUrl2Fallback } =
          resolveCardImages(listing);
        return {
          listingId: listing.listingId,
          propertyId: listing.propertyId,
          price: listing.price?.toString() || "0",
          listingType: listing.listingType,
          status: listing.status,
          isBankOwned: listing.isBankOwned,
          isOportunidad: listing.isOportunidad,
          isFeatured: listing.isFeatured,
          agentName: listing.agentName,
          title: listing.title,
          description: listing.description,
          propertyType: listing.propertyType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms?.toString() || null,
          squareMeter: listing.squareMeter,
          builtSurfaceArea: listing.builtSurfaceArea?.toString() || null,
          street: listing.street,
          city: listing.city,
          province: listing.province,
          imageUrl,
          imageUrl2,
          imageUrlFallback,
          imageUrl2Fallback,
        };
      });
    } catch (error) {
      console.error("Error fetching listings:", error);
      return [];
    }
  },
);

// Get detailed listing information including all related data
export const getListingDetails = cache(
  async (listingId: number): Promise<any> => {
    try {
      const ACCOUNT_ID = 111n;

      const [listingDetails] = await db
        .select({
          // Listing fields
          listingId: listings.listingId,
          propertyId: listings.propertyId,
          agentId: listings.agentId,
          listingType: listings.listingType,
          price: listings.price,
          status: listings.status,
          isFurnished: listings.isFurnished,
          furnitureQuality: listings.furnitureQuality,
          optionalGarage: listings.optionalGarage,
          optionalGaragePrice: listings.optionalGaragePrice,
          optionalStorageRoom: listings.optionalStorageRoom,
          optionalStorageRoomPrice: listings.optionalStorageRoomPrice,
          hasKeys: listings.hasKeys,
          studentFriendly: listings.studentFriendly,
          petsAllowed: listings.petsAllowed,
          appliancesIncluded: listings.appliancesIncluded,
          internet: listings.internet,
          oven: listings.oven,
          microwave: listings.microwave,
          washingMachine: listings.washingMachine,
          fridge: listings.fridge,
          tv: listings.tv,
          stoneware: listings.stoneware,
          fotocasa: listings.fotocasa,
          fcLocationVisibility: listings.fcLocationVisibility,
          idealista: listings.idealista,
          habitaclia: listings.habitaclia,
          pisoscom: listings.pisoscom,
          yaencontre: listings.yaencontre,
          milanuncios: listings.milanuncios,
          isFeatured: listings.isFeatured,
          isBankOwned: listings.isBankOwned,
          visibilityMode: listings.visibilityMode,
          isActive: listings.isActive,
          viewCount: listings.viewCount,
          inquiryCount: listings.inquiryCount,
          createdAt: listings.createdAt,
          updatedAt: listings.updatedAt,

          // Property fields
          // Listing's publishableTitle overrides property title when set.
          title: sql<string | null>`COALESCE(${listings.publishableTitle}, ${properties.title})`,
          description: listings.description,
          propertyType: properties.propertyType,
          propertySubtype: properties.propertySubtype,
          formPosition: properties.formPosition,
          bedrooms: properties.bedrooms,
          bathrooms: properties.bathrooms,
          squareMeter: properties.squareMeter,
          yearBuilt: properties.yearBuilt,
          cadastralReference: properties.cadastralReference,
          builtSurfaceArea: properties.builtSurfaceArea,
          street: properties.street,
          addressDetails: properties.addressDetails,
          postalCode: properties.postalCode,
          neighborhoodId: properties.neighborhoodId,
          latitude: properties.latitude,
          longitude: properties.longitude,
          energyCertification: properties.energyCertification,
          energyCertificateStatus: properties.energyCertificateStatus,
          energyConsumptionScale: properties.energyConsumptionScale,
          energyConsumptionValue: properties.energyConsumptionValue,
          emissionsScale: properties.emissionsScale,
          emissionsValue: properties.emissionsValue,
          hasHeating: properties.hasHeating,
          heatingType: properties.heatingType,
          hasElevator: properties.hasElevator,
          hasGarage: properties.hasGarage,
          hasStorageRoom: properties.hasStorageRoom,
          garageType: properties.garageType,
          garageSpaces: properties.garageSpaces,
          garageInBuilding: properties.garageInBuilding,
          elevatorToGarage: properties.elevatorToGarage,
          garageNumber: properties.garageNumber,
          disabledAccessible: properties.disabledAccessible,
          vpo: properties.vpo,
          videoIntercom: properties.videoIntercom,
          conciergeService: properties.conciergeService,
          securityGuard: properties.securityGuard,
          satelliteDish: properties.satelliteDish,
          doubleGlazing: properties.doubleGlazing,
          alarm: properties.alarm,
          securityDoor: properties.securityDoor,
          brandNew: properties.brandNew,
          newConstruction: properties.newConstruction,
          underConstruction: properties.underConstruction,
          needsRenovation: properties.needsRenovation,
          lastRenovationYear: properties.lastRenovationYear,
          kitchenType: properties.kitchenType,
          hotWaterType: properties.hotWaterType,
          openKitchen: properties.openKitchen,
          frenchKitchen: properties.frenchKitchen,
          furnishedKitchen: properties.furnishedKitchen,
          pantry: properties.pantry,
          storageRoomSize: properties.storageRoomSize,
          storageRoomNumber: properties.storageRoomNumber,
          terrace: properties.terrace,
          terraceSize: properties.terraceSize,
          wineCellar: properties.wineCellar,
          wineCellarSize: properties.wineCellarSize,
          livingRoomSize: properties.livingRoomSize,
          balconyCount: properties.balconyCount,
          galleryCount: properties.galleryCount,
          buildingFloors: properties.buildingFloors,
          builtInWardrobes: properties.builtInWardrobes,
          mainFloorType: properties.mainFloorType,
          shutterType: properties.shutterType,
          carpentryType: properties.carpentryType,
          orientation: properties.orientation,
          airConditioningType: properties.airConditioningType,
          windowType: properties.windowType,
          exterior: properties.exterior,
          bright: properties.bright,
          views: properties.views,
          mountainViews: properties.mountainViews,
          seaViews: properties.seaViews,
          beachfront: properties.beachfront,
          jacuzzi: properties.jacuzzi,
          hydromassage: properties.hydromassage,
          garden: properties.garden,
          pool: properties.pool,
          homeAutomation: properties.homeAutomation,
          musicSystem: properties.musicSystem,
          laundryRoom: properties.laundryRoom,
          coveredClothesline: properties.coveredClothesline,
          fireplace: properties.fireplace,
          gym: properties.gym,
          sportsArea: properties.sportsArea,
          childrenArea: properties.childrenArea,
          suiteBathroom: properties.suiteBathroom,
          nearbyPublicTransport: properties.nearbyPublicTransport,
          communityPool: properties.communityPool,
          privatePool: properties.privatePool,
          tennisCourt: properties.tennisCourt,
          conservationStatus: properties.conservationStatus,

          // Location fields
          city: locations.city,
          province: locations.province,
          municipality: locations.municipality,
          neighborhood: locations.neighborhood,

          // Agent information
          agentName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          agentEmail: users.email,
          agentPhone: users.phone,
          agentImage: users.image,

          // Owner information (just full name)
          owner: sql<string>`(
          SELECT CONCAT(c.first_name, ' ', c.last_name)
          FROM listing_contacts lc
          JOIN contacts c ON lc.contact_id = c.contact_id
          WHERE lc.listing_id = ${listings.listingId}
          AND lc.contact_type = 'owner'
          AND lc.is_active = true
          AND c.is_active = true
          LIMIT 1
        )`,

          // First image only (we'll fetch all images separately if needed)
          firstImageUrl: sql<string>`(
          SELECT image_url 
          FROM property_images 
          WHERE property_id = ${properties.propertyId} 
            AND is_active = true 
            AND (image_tag IS NULL OR image_tag NOT IN ('tour', 'youtube', 'video'))
          ORDER BY image_order ASC
          LIMIT 1
        )`,
        })
        .from(listings)
        .innerJoin(properties, eq(listings.propertyId, properties.propertyId))
        .leftJoin(
          locations,
          eq(properties.neighborhoodId, locations.neighborhoodId),
        )
        .leftJoin(users, eq(listings.agentId, users.id))
        .where(
          and(
            eq(listings.listingId, BigInt(listingId)),
            eq(listings.accountId, ACCOUNT_ID),
            eq(listings.isActive, true),
            eq(listings.publishToWebsite, true),
            hasAtLeastOnePhoto(listings.propertyId),
          ),
        );

      if (!listingDetails) {
        throw new Error("Listing not found");
      }


      // Convert BigInt values to strings to avoid serialization issues
      const serializedDetails = {
        ...listingDetails,
        listingId: listingDetails.listingId.toString(),
        propertyId: listingDetails.propertyId.toString(),
        neighborhoodId: listingDetails.neighborhoodId
          ? listingDetails.neighborhoodId.toString()
          : null,
      };

      return serializedDetails;
    } catch (error) {
      console.error("Error fetching listing details:", error);
      throw error;
    }
  },
);

// Lightweight query for sitemap generation — active published listings only.
// Includes the fields needed to build SEO-friendly slugs (see lib/property-slug.ts).
export const getAllListingSitemapData = cache(
  async (): Promise<
    {
      listingId: string;
      updatedAt: Date | null;
      title: string | null;
      propertyType: string | null;
      city: string | null;
      bedrooms: number | null;
      listingType: string | null;
    }[]
  > => {
    try {
      const rows = await db
        .select({
          listingId: listings.listingId,
          updatedAt: listings.updatedAt,
          listingType: listings.listingType,
          // Listing's publishableTitle overrides property title when set.
          title: sql<string | null>`COALESCE(${listings.publishableTitle}, ${properties.title})`,
          propertyType: properties.propertyType,
          bedrooms: properties.bedrooms,
          city: locations.city,
        })
        .from(listings)
        .innerJoin(properties, eq(listings.propertyId, properties.propertyId))
        .leftJoin(
          locations,
          eq(properties.neighborhoodId, locations.neighborhoodId),
        )
        .where(
          and(
            eq(listings.accountId, ACCOUNT_ID),
            eq(listings.isActive, true),
            eq(listings.publishToWebsite, true),
            hasAtLeastOnePhoto(listings.propertyId),
          ),
        );

      return rows.map((row) => ({
        listingId: row.listingId.toString(),
        updatedAt: row.updatedAt,
        title: row.title,
        propertyType: row.propertyType,
        city: row.city,
        bedrooms: row.bedrooms,
        listingType: row.listingType,
      }));
    } catch (error) {
      console.error("Error fetching listing sitemap data:", error);
      return [];
    }
  },
);

// Returns distinct (propertyType, city, listingType) tuples for search landing pages
export const getDistinctSearchCombinations = cache(
  async (): Promise<
    { propertyType: string; city: string; status: "for-sale" | "for-rent" }[]
  > => {
    try {
      const rows = await db
        .selectDistinct({
          propertyType: properties.propertyType,
          city: locations.city,
          listingType: listings.listingType,
        })
        .from(listings)
        .innerJoin(properties, eq(listings.propertyId, properties.propertyId))
        .leftJoin(
          locations,
          eq(properties.neighborhoodId, locations.neighborhoodId),
        )
        .where(
          and(
            eq(listings.accountId, ACCOUNT_ID),
            eq(listings.isActive, true),
            eq(listings.publishToWebsite, true),
            hasAtLeastOnePhoto(listings.propertyId),
          ),
        );

      const results: {
        propertyType: string;
        city: string;
        status: "for-sale" | "for-rent";
      }[] = [];

      for (const row of rows) {
        if (!row.propertyType || !row.city) continue;

        let status: "for-sale" | "for-rent";
        if (row.listingType === "Sale") {
          status = "for-sale";
        } else if (
          row.listingType === "Rent" ||
          row.listingType === "RentWithOption"
        ) {
          status = "for-rent";
        } else {
          continue; // skip Transfer, Sold, etc.
        }

        results.push({
          propertyType: row.propertyType,
          city: row.city,
          status,
        });
      }

      return results;
    } catch (error) {
      console.error("Error fetching distinct search combinations:", error);
      return [];
    }
  },
);

/**
 * Build the deterministic S3 URL for a pre-baked watermarked image.
 * Watermarked files are generated by vesta-crm at publish time and live at:
 *   accounts/{accountId}/watermarked/{propertyId}/image_{imageOrder}.jpg
 * See ~/Desktop/vesta/src/server/utils/watermarked-upload.ts:83 for the canonical key.
 */
function buildWatermarkedUrl(
  accountId: string,
  propertyId: string,
  imageOrder: number,
): string | null {
  // Mirror vesta-crm's bucket resolution: S3_CONSOLIDATED_BUCKET ?? AWS_S3_BUCKET
  // See ~/Desktop/vesta/src/lib/s3-config.ts:8-9
  const bucket = env.S3_CONSOLIDATED_BUCKET ?? env.AWS_S3_BUCKET;
  const region = env.AWS_REGION;
  if (!bucket || !region) return null;
  return `https://${bucket}.s3.${region}.amazonaws.com/accounts/${accountId}/watermarked/${propertyId}/image_${imageOrder}.jpg`;
}

// Get all images for a property
export const getPropertyImages = cache(
  async (propertyId: string): Promise<any[]> => {
    try {
      const images = await db
        .select({
          propertyImageId: propertyImages.propertyImageId,
          imageUrl: propertyImages.imageUrl,
          thumbUrl: propertyImages.thumbUrl,
          medUrl: propertyImages.medUrl,
          fullUrl: propertyImages.fullUrl,
          s3key: propertyImages.s3key,
          imageOrder: propertyImages.imageOrder,
          imageTag: propertyImages.imageTag,
          originImageId: propertyImages.originImageId,
        })
        .from(propertyImages)
        .where(
          and(
            eq(propertyImages.propertyId, BigInt(propertyId)),
            eq(propertyImages.isActive, true),
            sql`(${propertyImages.imageTag} IS NULL OR ${propertyImages.imageTag} NOT IN ('tour', 'youtube', 'video'))`,
          ),
        )
        .orderBy(propertyImages.imageOrder);

      // Resolve watermark context: find a published listing for this property
      // and check the account + listing watermark enabled flags.
      let useWatermarked = false;
      let resolvedAccountId: string | null = null;

      try {
        const [listingCtx] = await db
          .select({
            accountId: listings.accountId,
            listingWmProps: sql<string | null>`"listings"."watermark_props"`,
            accountWmProps: websiteProperties.watermarkProps,
          })
          .from(listings)
          .leftJoin(
            websiteProperties,
            eq(websiteProperties.accountId, listings.accountId),
          )
          .where(
            and(
              eq(listings.propertyId, BigInt(propertyId)),
              eq(listings.publishToWebsite, true),
              eq(listings.isActive, true),
            ),
          )
          .limit(1);

        if (listingCtx) {
          resolvedAccountId = listingCtx.accountId.toString();

          // Parse watermark config JSON (account-level is text, listing-level is jsonb)
          let accountWm: { enabled?: boolean } = {};
          let listingWm: { enabled?: boolean } | null = null;

          try {
            accountWm =
              typeof listingCtx.accountWmProps === "string"
                ? JSON.parse(listingCtx.accountWmProps)
                : (listingCtx.accountWmProps ?? {});
          } catch {
            accountWm = {};
          }

          try {
            listingWm =
              typeof listingCtx.listingWmProps === "string"
                ? JSON.parse(listingCtx.listingWmProps)
                : (listingCtx.listingWmProps as { enabled?: boolean } | null);
          } catch {
            listingWm = null;
          }

          // Resolution chain: listing override → account default → false
          // See ~/Desktop/vesta/src/server/utils/apply-watermarks.ts:47-52
          const effectiveEnabled =
            listingWm?.enabled ?? accountWm?.enabled ?? false;

          useWatermarked = effectiveEnabled;
        }
      } catch (err) {
        console.warn(
          "[getPropertyImages] Failed to resolve watermark context, using originals:",
          err,
        );
      }

      // Convert BigInt to string and optionally rewrite URLs to watermarked S3 paths.
      // Always preserve the original URL so the client can fall back if the
      // watermarked file doesn't exist in S3 (e.g. cache never warmed).
      return images.map((img) => {
        const originalImageUrl = img.imageUrl;
        let imageUrl = originalImageUrl;

        if (useWatermarked && resolvedAccountId) {
          const wmUrl = buildWatermarkedUrl(
            resolvedAccountId,
            propertyId,
            img.imageOrder,
          );
          if (wmUrl) {
            imageUrl = wmUrl;
          } else if (!env.S3_CONSOLIDATED_BUCKET && !env.AWS_S3_BUCKET) {
            console.warn(
              "[getPropertyImages] S3_CONSOLIDATED_BUCKET and AWS_S3_BUCKET not set — falling back to original images",
            );
          }
        }

        return {
          ...img,
          imageUrl,
          originalImageUrl,
          propertyImageId: img.propertyImageId.toString(),
          originImageId: img.originImageId?.toString() ?? null,
        };
      });
    } catch (error) {
      console.error("Error fetching property images:", error);
      return [];
    }
  },
);

// Get media (videos, youtube links, virtual tours) for a property
export const getPropertyMedia = cache(
  async (
    propertyId: string,
  ): Promise<{
    videos: { id: string; url: string }[];
    youtubeLinks: { id: string; url: string }[];
    virtualTours: { id: string; url: string }[];
  }> => {
    try {
      const media = await db
        .select({
          propertyImageId: propertyImages.propertyImageId,
          imageUrl: propertyImages.imageUrl,
          imageTag: propertyImages.imageTag,
          imageOrder: propertyImages.imageOrder,
        })
        .from(propertyImages)
        .where(
          and(
            eq(propertyImages.propertyId, BigInt(propertyId)),
            eq(propertyImages.isActive, true),
            sql`${propertyImages.imageTag} IN ('video', 'youtube', 'tour')`,
          ),
        )
        .orderBy(propertyImages.imageOrder);

      const videos: { id: string; url: string }[] = [];
      const youtubeLinks: { id: string; url: string }[] = [];
      const virtualTours: { id: string; url: string }[] = [];

      for (const row of media) {
        const item = {
          id: row.propertyImageId.toString(),
          url: row.imageUrl,
        };
        if (row.imageTag === "video") videos.push(item);
        else if (row.imageTag === "youtube") youtubeLinks.push(item);
        else if (row.imageTag === "tour") virtualTours.push(item);
      }

      return { videos, youtubeLinks, virtualTours };
    } catch (error) {
      console.error("Error fetching property media:", error);
      return { videos: [], youtubeLinks: [], virtualTours: [] };
    }
  },
);

// Get all images for multiple properties at once (for feed view)
export const getImagesForListings = cache(
  async (propertyIds: bigint[]): Promise<Map<string, FeedImage[]>> => {
    if (propertyIds.length === 0) return new Map();

    try {
      const images = await db
        .select({
          propertyId: propertyImages.propertyId,
          propertyImageId: propertyImages.propertyImageId,
          imageUrl: propertyImages.imageUrl,
          thumbUrl: propertyImages.thumbUrl,
          imageOrder: propertyImages.imageOrder,
          imageTag: propertyImages.imageTag,
        })
        .from(propertyImages)
        .where(
          and(
            inArray(propertyImages.propertyId, propertyIds),
            eq(propertyImages.isActive, true),
            sql`(${propertyImages.imageTag} IS NULL OR ${propertyImages.imageTag} NOT IN ('tour', 'youtube', 'video'))`,
          ),
        )
        .orderBy(propertyImages.propertyId, propertyImages.imageOrder);

      const grouped = new Map<string, FeedImage[]>();
      for (const img of images) {
        const key = img.propertyId.toString();
        const entry: FeedImage = {
          propertyImageId: img.propertyImageId.toString(),
          imageUrl: img.thumbUrl ?? img.imageUrl,
          imageOrder: img.imageOrder,
          imageTag: img.imageTag,
        };
        const existing = grouped.get(key);
        if (existing) {
          existing.push(entry);
        } else {
          grouped.set(key, [entry]);
        }
      }
      return grouped;
    } catch (error) {
      console.error("Error fetching images for listings:", error);
      return new Map();
    }
  },
);
