"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ListingCardData, FeedImage } from "~/server/queries/listings";
import { fetchFeedImages } from "~/server/actions/property-listing";
import { PropertyFeedCard } from "./PropertyFeedCard";

interface PropertyFeedProps {
  listings: ListingCardData[];
  watermarkEnabled: boolean;
  slugString: string;
  currentSort: string;
}

export function PropertyFeed({
  listings,
  watermarkEnabled,
  slugString,
  currentSort,
}: PropertyFeedProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageMap, setImageMap] = useState<Record<string, FeedImage[]>>({});
  const [, startTransition] = useTransition();
  const fetchedRef = useRef<Set<string>>(new Set());

  // Fetch images for a batch of property IDs
  const loadImages = useCallback(
    (propertyIds: string[]) => {
      const newIds = propertyIds.filter((id) => !fetchedRef.current.has(id));
      if (newIds.length === 0) return;
      newIds.forEach((id) => fetchedRef.current.add(id));

      startTransition(async () => {
        const result = await fetchFeedImages(newIds);
        setImageMap((prev) => ({ ...prev, ...result }));
      });
    },
    [],
  );

  // Load images for first few properties on mount
  useEffect(() => {
    const initialIds = listings.slice(0, 3).map((l) => l.propertyId.toString());
    loadImages(initialIds);
  }, [listings, loadImages]);

  // IntersectionObserver to preload images as user scrolls
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number(entry.target.getAttribute("data-index"));
          if (isNaN(index)) continue;
          // Preload current + next 2
          const idsToLoad = listings
            .slice(index, index + 3)
            .map((l) => l.propertyId.toString());
          loadImages(idsToLoad);
        }
      },
      { threshold: 0.3 },
    );

    const items = container.querySelectorAll("[data-index]");
    items.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [listings, loadImages]);

  const handleClose = () => {
    const sortParam = currentSort !== "default" ? `?sort=${currentSort}` : "";
    router.push(`/${slugString}${sortParam}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 z-50 rounded-full bg-black/40 p-2 backdrop-blur-sm transition-colors hover:bg-black/60"
        aria-label="Cerrar vista feed"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Vertical snap scroll container */}
      <div
        ref={containerRef}
        className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll"
        style={{ scrollbarWidth: "none" }}
      >
        {listings.map((listing, index) => (
          <div key={listing.listingId.toString()} data-index={index}>
            <PropertyFeedCard
              listing={listing}
              images={imageMap[listing.propertyId.toString()] ?? []}
              watermarkEnabled={watermarkEnabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
