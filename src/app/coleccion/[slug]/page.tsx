import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "~/components/footer";
import { PropertyCard } from "~/components/listing-card";
import { PromotionCard } from "~/components/promociones/PromotionCard";
import { resolvePromoCardBySlug } from "~/server/queries/promo-cards";
import { getWatermarkConfig } from "~/server/queries/watermark";

const ITEMS_PER_PAGE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolvePromoCardBySlug(slug, 1);
  if (!resolved) return { title: "Colección" };
  return {
    title: resolved.card.title,
    description: resolved.card.subtitle || resolved.card.title,
  };
}

export default async function ColeccionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = await resolvePromoCardBySlug(slug, ITEMS_PER_PAGE);
  if (!resolved) notFound();

  const watermark = await getWatermarkConfig();

  return (
    <>
      <main className="container mx-auto px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <header className="mb-10 max-w-3xl">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            {resolved.card.title}
          </h1>
          {resolved.card.subtitle ? (
            <p className="mt-3 text-base text-muted-foreground">
              {resolved.card.subtitle}
            </p>
          ) : null}
        </header>

        {resolved.kind === "listing_query" ? (
          resolved.listings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resolved.listings.map((listing, index) => (
                <PropertyCard
                  key={listing.listingId.toString()}
                  listing={listing}
                  index={index}
                  watermarkEnabled={watermark.enabled}
                />
              ))}
            </div>
          )
        ) : null}

        {resolved.kind === "promotion_query" ? (
          resolved.promotions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resolved.promotions.map((promotion) => (
                <PromotionCard
                  key={promotion.promotionId}
                  promotion={promotion}
                  selected={false}
                />
              ))}
            </div>
          )
        ) : null}
      </main>
      <Footer />
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
      No hay resultados para esta colección por el momento.
    </div>
  );
}
