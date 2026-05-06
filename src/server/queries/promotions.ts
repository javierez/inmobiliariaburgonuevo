"use server";

import { db } from "../db";
import {
  promotions,
  promotionImages,
  listings,
  locations,
} from "~/server/db/schema";
import { and, eq, sql, desc, type SQL } from "drizzle-orm";
import { cache } from "react";
import { env } from "~/env";

const ACCOUNT_ID = BigInt(env.NEXT_PUBLIC_ACCOUNT_ID);

export interface PromotionCardData {
  promotionId: string;
  name: string;
  newDevelopmentType: string | null;
  forSale: boolean;
  forRent: boolean;
  description: string | null;
  mainImageUrl: string | null;
  listingCount: number;
  minPrice: string | null;
  maxPrice: string | null;
}

export interface PromotionDetailData extends PromotionCardData {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  province: string | null;
  finished: boolean | null;
  keyDeliveryYear: number | null;
  keyDeliveryMonth: number | null;
  builtPhase: string | null;
  energyCertificateRating: string | null;
  hasPool: boolean | null;
  hasGarden: boolean | null;
  hasLift: boolean | null;
  hasSecurityDoor: boolean | null;
  hasSecurityAlarm: boolean | null;
  hasDoorman: boolean | null;
}

export const getPromotionsForAccount = cache(
  async (): Promise<PromotionCardData[]> => {
    try {
      const rows = await db
        .select({
          promotionId: promotions.promotionId,
          name: promotions.name,
          newDevelopmentType: promotions.newDevelopmentType,
          forSale: promotions.forSale,
          forRent: promotions.forRent,
          description: promotions.description,
          mainImageUrl: sql<string | null>`(
            SELECT COALESCE(${promotionImages.thumbUrl}, ${promotionImages.imageUrl})
            FROM ${promotionImages}
            WHERE ${promotionImages.promotionId} = ${promotions.promotionId}
              AND ${promotionImages.isActive} = true
              AND (${promotionImages.imageTag} IS NULL OR ${promotionImages.imageTag} NOT IN ('tour', 'youtube', 'video'))
            ORDER BY ${promotionImages.imageOrder} ASC
            LIMIT 1
          )`,
          listingCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
          minPrice: sql<string | null>`(
            SELECT MIN(CAST(${listings.price} AS DECIMAL))
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
          maxPrice: sql<string | null>`(
            SELECT MAX(CAST(${listings.price} AS DECIMAL))
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
        })
        .from(promotions)
        .where(
          and(
            eq(promotions.accountId, ACCOUNT_ID),
            eq(promotions.isActive, true),
          ),
        )
        .orderBy(desc(promotions.createdAt));

      return rows.map((r) => ({
        promotionId: r.promotionId.toString(),
        name: r.name,
        newDevelopmentType: r.newDevelopmentType,
        forSale: r.forSale ?? false,
        forRent: r.forRent ?? false,
        description: r.description,
        mainImageUrl: r.mainImageUrl,
        listingCount: Number(r.listingCount ?? 0),
        minPrice: r.minPrice ? r.minPrice.toString() : null,
        maxPrice: r.maxPrice ? r.maxPrice.toString() : null,
      }));
    } catch (error) {
      console.error("Error fetching promotions:", error);
      return [];
    }
  },
);

export const searchPromotionsByPredicate = cache(
  async (
    extraPredicate: SQL,
    limit = 12,
  ): Promise<PromotionCardData[]> => {
    try {
      const rows = await db
        .select({
          promotionId: promotions.promotionId,
          name: promotions.name,
          newDevelopmentType: promotions.newDevelopmentType,
          forSale: promotions.forSale,
          forRent: promotions.forRent,
          description: promotions.description,
          mainImageUrl: sql<string | null>`(
            SELECT COALESCE(${promotionImages.thumbUrl}, ${promotionImages.imageUrl})
            FROM ${promotionImages}
            WHERE ${promotionImages.promotionId} = ${promotions.promotionId}
              AND ${promotionImages.isActive} = true
              AND (${promotionImages.imageTag} IS NULL OR ${promotionImages.imageTag} NOT IN ('tour', 'youtube', 'video'))
            ORDER BY ${promotionImages.imageOrder} ASC
            LIMIT 1
          )`,
          listingCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
          minPrice: sql<string | null>`(
            SELECT MIN(CAST(${listings.price} AS DECIMAL))
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
          maxPrice: sql<string | null>`(
            SELECT MAX(CAST(${listings.price} AS DECIMAL))
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
        })
        .from(promotions)
        .where(
          and(
            eq(promotions.accountId, ACCOUNT_ID),
            eq(promotions.isActive, true),
            extraPredicate,
          ),
        )
        .orderBy(desc(promotions.createdAt))
        .limit(limit);

      return rows.map((r) => ({
        promotionId: r.promotionId.toString(),
        name: r.name,
        newDevelopmentType: r.newDevelopmentType,
        forSale: r.forSale ?? false,
        forRent: r.forRent ?? false,
        description: r.description,
        mainImageUrl: r.mainImageUrl,
        listingCount: Number(r.listingCount ?? 0),
        minPrice: r.minPrice ? r.minPrice.toString() : null,
        maxPrice: r.maxPrice ? r.maxPrice.toString() : null,
      }));
    } catch (error) {
      console.error("Error searching promotions by predicate:", error);
      return [];
    }
  },
);

export const getPromotionImages = cache(
  async (
    promotionId: string,
  ): Promise<{ id: string; url: string; alt: string | null }[]> => {
    try {
      const id = BigInt(promotionId);
      const rows = await db
        .select({
          id: promotionImages.promotionImageId,
          url: sql<string>`COALESCE(${promotionImages.medUrl}, ${promotionImages.fullUrl}, ${promotionImages.imageUrl})`,
          alt: promotionImages.imageTag,
        })
        .from(promotionImages)
        .where(
          and(
            eq(promotionImages.promotionId, id),
            eq(promotionImages.isActive, true),
            sql`(${promotionImages.imageTag} IS NULL OR ${promotionImages.imageTag} NOT IN ('tour', 'youtube', 'video'))`,
          ),
        )
        .orderBy(promotionImages.imageOrder);

      return rows.map((r) => ({
        id: r.id.toString(),
        url: r.url,
        alt: r.alt,
      }));
    } catch (error) {
      console.error("Error fetching promotion images:", error);
      return [];
    }
  },
);

export const getPromotionDetail = cache(
  async (promotionId: string): Promise<PromotionDetailData | null> => {
    try {
      const id = BigInt(promotionId);
      const rows = await db
        .select({
          promotionId: promotions.promotionId,
          name: promotions.name,
          newDevelopmentType: promotions.newDevelopmentType,
          forSale: promotions.forSale,
          forRent: promotions.forRent,
          description: promotions.description,
          street: promotions.street,
          postalCode: promotions.postalCode,
          finished: promotions.finished,
          keyDeliveryYear: promotions.keyDeliveryYear,
          keyDeliveryMonth: promotions.keyDeliveryMonth,
          builtPhase: promotions.builtPhase,
          energyCertificateRating: promotions.energyCertificateRating,
          hasPool: promotions.hasPool,
          hasGarden: promotions.hasGarden,
          hasLift: promotions.hasLift,
          hasSecurityDoor: promotions.hasSecurityDoor,
          hasSecurityAlarm: promotions.hasSecurityAlarm,
          hasDoorman: promotions.hasDoorman,
          city: locations.city,
          province: locations.province,
          mainImageUrl: sql<string | null>`(
            SELECT COALESCE(${promotionImages.thumbUrl}, ${promotionImages.imageUrl})
            FROM ${promotionImages}
            WHERE ${promotionImages.promotionId} = ${promotions.promotionId}
              AND ${promotionImages.isActive} = true
              AND (${promotionImages.imageTag} IS NULL OR ${promotionImages.imageTag} NOT IN ('tour', 'youtube', 'video'))
            ORDER BY ${promotionImages.imageOrder} ASC
            LIMIT 1
          )`,
          listingCount: sql<number>`(
            SELECT COUNT(*)
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
          minPrice: sql<string | null>`(
            SELECT MIN(CAST(${listings.price} AS DECIMAL))
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
          maxPrice: sql<string | null>`(
            SELECT MAX(CAST(${listings.price} AS DECIMAL))
            FROM ${listings}
            WHERE ${listings.promotionId} = ${promotions.promotionId}
              AND ${listings.isActive} = true
              AND ${listings.publishToWebsite} = true
          )`,
        })
        .from(promotions)
        .leftJoin(
          locations,
          eq(promotions.neighborhoodId, locations.neighborhoodId),
        )
        .where(
          and(
            eq(promotions.promotionId, id),
            eq(promotions.accountId, ACCOUNT_ID),
            eq(promotions.isActive, true),
          ),
        )
        .limit(1);

      const r = rows[0];
      if (!r) return null;
      return {
        promotionId: r.promotionId.toString(),
        name: r.name,
        newDevelopmentType: r.newDevelopmentType,
        forSale: r.forSale ?? false,
        forRent: r.forRent ?? false,
        description: r.description,
        mainImageUrl: r.mainImageUrl,
        listingCount: Number(r.listingCount ?? 0),
        minPrice: r.minPrice ? r.minPrice.toString() : null,
        maxPrice: r.maxPrice ? r.maxPrice.toString() : null,
        street: r.street,
        postalCode: r.postalCode,
        city: r.city,
        province: r.province,
        finished: r.finished,
        keyDeliveryYear: r.keyDeliveryYear,
        keyDeliveryMonth: r.keyDeliveryMonth,
        builtPhase: r.builtPhase,
        energyCertificateRating: r.energyCertificateRating,
        hasPool: r.hasPool,
        hasGarden: r.hasGarden,
        hasLift: r.hasLift,
        hasSecurityDoor: r.hasSecurityDoor,
        hasSecurityAlarm: r.hasSecurityAlarm,
        hasDoorman: r.hasDoorman,
      };
    } catch (error) {
      console.error("Error fetching promotion detail:", error);
      return null;
    }
  },
);
