"use server";

import { db } from "../db";
import { websiteProperties } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { env } from "~/env";
import {
  promoCardsArraySchema,
  type PromoCard,
  type ListingQueryCard,
  type PromotionQueryCard,
} from "~/server/promo-cards/dsl-types";
import {
  translateListingDsl,
  translatePromotionDsl,
} from "~/server/promo-cards/dsl-translator";
import { searchListings, type ListingCardData } from "./listings";
import {
  searchPromotionsByPredicate,
  getPromotionDetail,
  type PromotionCardData,
  type PromotionDetailData,
} from "./promotions";

const ACCOUNT_ID = 111n;

export const getPromoCards = cache(async (): Promise<PromoCard[]> => {
  try {
    const [config] = await db
      .select({ promoCardsProps: websiteProperties.promoCardsProps })
      .from(websiteProperties)
      .where(eq(websiteProperties.accountId, ACCOUNT_ID))
      .limit(1);

    if (!config?.promoCardsProps) return [];
    const parsed = JSON.parse(config.promoCardsProps) as unknown;
    const result = promoCardsArraySchema.safeParse(parsed);
    if (!result.success) {
      console.error("Invalid promo cards JSON:", result.error.flatten());
      return [];
    }
    return [...result.data].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0),
    );
  } catch (error) {
    console.error("Error fetching promo cards:", error);
    return [];
  }
});

export type ResolvedListingQuery = {
  kind: "listing_query";
  card: ListingQueryCard;
  listings: ListingCardData[];
};

export type ResolvedPromotionQuery = {
  kind: "promotion_query";
  card: PromotionQueryCard;
  promotions: PromotionCardData[];
};

export type ResolvedPromotion = {
  kind: "promotion";
  card: PromoCard & { kind: "promotion" };
  promotion: PromotionDetailData | null;
};

export type ResolvedStaticLink = {
  kind: "static_link";
  card: PromoCard & { kind: "static_link" };
};

export type ResolvedCard =
  | ResolvedListingQuery
  | ResolvedPromotionQuery
  | ResolvedPromotion
  | ResolvedStaticLink;

export async function resolvePromoCardBySlug(
  slug: string,
  limit = 24,
): Promise<ResolvedCard | null> {
  const cards = await getPromoCards();
  const card = cards.find(
    (c) =>
      (c.kind === "listing_query" || c.kind === "promotion_query") &&
      c.slug === slug,
  );
  if (!card) return null;

  if (card.kind === "listing_query") {
    try {
      const predicate = await translateListingDsl(card.filter);
      const results = await searchListings(undefined, limit, "default", 0, predicate);
      return { kind: "listing_query", card, listings: results };
    } catch (e) {
      console.error("DSL translation failed for listing card", card.id, e);
      return { kind: "listing_query", card, listings: [] };
    }
  }

  if (card.kind === "promotion_query") {
    try {
      const predicate = await translatePromotionDsl(card.filter);
      const results = await searchPromotionsByPredicate(predicate, limit);
      return { kind: "promotion_query", card, promotions: results };
    } catch (e) {
      console.error("DSL translation failed for promotion card", card.id, e);
      return { kind: "promotion_query", card, promotions: [] };
    }
  }

  return null;
}

export async function getPromotionForCard(
  promotionId: string,
): Promise<PromotionDetailData | null> {
  return getPromotionDetail(promotionId);
}
