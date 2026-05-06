"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Bed, Bath, SquareIcon as SquareFoot, MapPin } from "lucide-react";
import { formatPrice, formatNumber } from "~/lib/utils";
import type { ListingCardData, FeedImage } from "~/server/queries/listings";
import { getWatermarkedImageUrl } from "~/lib/image-url";
import { getBankOwnedLabel } from "~/lib/data";
import { buildPropertySlug, buildPropertyImageAlt } from "~/lib/property-slug";

interface PropertyFeedCardProps {
  listing: ListingCardData;
  images: FeedImage[];
  watermarkEnabled: boolean;
}

export function PropertyFeedCard({
  listing,
  images,
  watermarkEnabled,
}: PropertyFeedCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Build image list: use fetched images, fallback to listing's 2 images
  const imageUrls =
    images.length > 0
      ? images.map((img) =>
          getWatermarkedImageUrl(img.imageUrl, watermarkEnabled),
        )
      : [
          getWatermarkedImageUrl(listing.imageUrl, watermarkEnabled),
          getWatermarkedImageUrl(listing.imageUrl2, watermarkEnabled),
        ].filter(Boolean);

  const totalImages = imageUrls.length;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || totalImages <= 1) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setCurrentIndex(Math.min(index, totalImages - 1));
  }, [totalImages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const {
    title,
    street,
    price,
    listingType,
    propertyType,
    bedrooms,
    bathrooms,
    squareMeter,
    city,
    province,
    isBankOwned,
    isOportunidad,
    isFeatured,
    status,
    listingId,
  } = listing;

  const displayTitle = title ?? street ?? "Propiedad";
  const isRental = listingType === "Rent" || listingType === "RentWithOption";
  const imageAlt = buildPropertyImageAlt({
    title,
    propertyType,
    city,
    bedrooms,
    squareMeter,
    listingType,
  });
  const showBeds =
    propertyType !== "solar" &&
    propertyType !== "garaje" &&
    propertyType !== "trastero" &&
    (bedrooms ?? 0) > 0;
  const showBaths =
    propertyType !== "solar" &&
    propertyType !== "garaje" &&
    propertyType !== "trastero" &&
    parseFloat(bathrooms ?? "0") > 0;

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always">
      {/* Horizontal photo scroller */}
      <div
        ref={scrollRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-scroll"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {imageUrls.length > 0 ? (
          imageUrls.map((url, i) => (
            <div
              key={i}
              className="relative h-full w-full flex-shrink-0 snap-start snap-always"
            >
              <Image
                src={url}
                alt={`${imageAlt} - Foto ${i + 1}`}
                fill
                className="object-cover"
                sizes="100vw"
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
              />
            </div>
          ))
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-900">
            <span className="text-white/50">Sin fotos</span>
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Dot indicators */}
      {totalImages > 1 && (
        <div className="absolute bottom-56 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {imageUrls.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === currentIndex
                  ? "h-2 w-2 bg-white"
                  : "h-1.5 w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}

      {/* Property info overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-8">
        {/* Badges */}
        <div className="mb-2 flex items-center gap-2">
          {propertyType && (
            <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm">
              {propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
            </Badge>
          )}
          {!!status && (
            <Badge variant="secondary" className="bg-white/20 text-white backdrop-blur-sm">
              {status}
            </Badge>
          )}
          {isBankOwned && (
            <Badge className="bg-blue-600/80 text-white backdrop-blur-sm">
              {getBankOwnedLabel(propertyType)}
            </Badge>
          )}
          {isOportunidad && (
            <Badge className="bg-orange-500/90 text-white backdrop-blur-sm">
              Oportunidad
            </Badge>
          )}
          {isFeatured && (
            <Badge className="bg-yellow-500/90 text-white backdrop-blur-sm">
              Destacado
            </Badge>
          )}
        </div>

        {/* Title - tappable link */}
        <Link
          href={`/propiedades/${buildPropertySlug({
            listingId,
            title,
            propertyType,
            city,
            bedrooms,
            listingType,
          })}`}
        >
          <h2 className="mb-1 text-xl font-bold text-white underline decoration-white/40 underline-offset-2">
            {displayTitle}
          </h2>
        </Link>

        {/* Price */}
        <p className="mb-2 text-2xl font-extrabold text-white">
          {formatPrice(price)}€{isRental ? "/mes" : ""}
        </p>

        {/* Location */}
        {(city ?? province) && (
          <div className="mb-3 flex items-center text-white/80">
            <MapPin className="mr-1 h-3.5 w-3.5" />
            <span className="text-sm">
              {[city, province].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-4 text-sm text-white/90">
          {showBeds && (
            <div className="flex items-center gap-1">
              <Bed className="h-4 w-4" />
              <span>{bedrooms} Hab</span>
            </div>
          )}
          {showBaths && (
            <div className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              <span>{bathrooms} Baños</span>
            </div>
          )}
          {(squareMeter ?? 0) > 0 && (
            <div className="flex items-center gap-1">
              <SquareFoot className="h-4 w-4" />
              <span>{formatNumber(squareMeter!)} m²</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
