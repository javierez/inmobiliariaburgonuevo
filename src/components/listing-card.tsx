"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { Bed, Bath, SquareIcon as SquareFoot, MapPin } from "lucide-react";
import { formatPrice, formatNumber } from "~/lib/utils";
import type { ListingCardData } from "~/server/queries/listings";
import { getWatermarkedImageUrl } from "~/lib/image-url";
import { getBankOwnedLabel, getPropertyTypeLabel } from "~/lib/data";
import { buildPropertySlug, buildPropertyImageAlt } from "~/lib/property-slug";

interface PropertyCardProps {
  listing: ListingCardData;
  index?: number;
  watermarkEnabled?: boolean;
}

export const PropertyCard = React.memo(function PropertyCard({
  listing,
  index = 0,
  watermarkEnabled = false,
}: PropertyCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [image2Loaded, setImage2Loaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for triggering animation when visible
  useEffect(() => {
    if (!listing.isOportunidad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [listing.isOportunidad]);

  // Property types where bedrooms/bathrooms don't apply
  const hideRooms = ["solar", "garaje", "edificio", "oficina", "industrial", "trastero"].includes(
    listing.propertyType?.toLowerCase() ?? "",
  );
  const useEstancias = listing.propertyType?.toLowerCase() === "local";

  // Get primary image with proper fallback. When the server rewrote imageUrl
  // to a watermarked S3 path, `imageUrlFallback` carries the original
  // un-watermarked URL — try that on error before giving up to the placeholder
  // (the watermarked S3 cache may not be warmed for every listing).
  const defaultPlaceholder = "/properties/suburban-dream.png";
  const [imageSrc, setImageSrc] = useState(
    getWatermarkedImageUrl(listing.imageUrl, watermarkEnabled) || defaultPlaceholder,
  );
  const [imageSrc2, setImageSrc2] = useState(
    getWatermarkedImageUrl(listing.imageUrl2 ?? listing.imageUrl, watermarkEnabled) || defaultPlaceholder,
  );
  const [imageFallbackUsed, setImageFallbackUsed] = useState(false);
  const [image2FallbackUsed, setImage2FallbackUsed] = useState(false);


  const onImageError = () => {
    if (!imageFallbackUsed && listing.imageUrlFallback && imageSrc !== listing.imageUrlFallback) {
      setImageFallbackUsed(true);
      setImageSrc(listing.imageUrlFallback);
      return;
    }
    setImageSrc(defaultPlaceholder);
  };

  const onImage2Error = () => {
    const fb = listing.imageUrl2Fallback ?? listing.imageUrlFallback;
    if (!image2FallbackUsed && fb && imageSrc2 !== fb) {
      setImage2FallbackUsed(true);
      setImageSrc2(fb);
      return;
    }
    setImageSrc2(defaultPlaceholder);
  };

  const imageAlt = buildPropertyImageAlt({
    title: listing.title,
    propertyType: listing.propertyType,
    city: listing.city,
    bedrooms: listing.bedrooms,
    squareMeter: listing.squareMeter,
    listingType: listing.listingType,
  });

  return (
    <Link
      href={`/propiedades/${buildPropertySlug({
        listingId: listing.listingId,
        title: listing.title,
        propertyType: listing.propertyType,
        city: listing.city,
        bedrooms: listing.bedrooms,
        listingType: listing.listingType,
      })}`}
      className="block"
      role="article"
      aria-label={imageAlt}
    >
      <Card
        ref={cardRef}
        className={`flex h-full flex-col overflow-hidden transition-all hover:shadow-lg ${listing.isOportunidad && isVisible ? "animate-oportunidad" : ""}`}
        style={listing.isOportunidad && isVisible ? { animationDelay: `${index * 200}ms` } : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <div className="relative h-full w-full">
            {/* First Image */}
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={`object-cover transition-opacity duration-300 ${
                isHovered ? "opacity-0" : "opacity-100"
              } ${imageSrc === defaultPlaceholder || listing.status === "Sold" || listing.status === "Vendido" ? "grayscale" : ""}`}
              priority={index < 3}
              loading={index < 3 ? undefined : "lazy"}
              onLoad={() => setImageLoaded(true)}
              onError={onImageError}
              quality={50}
            />
            {/* Second Image */}
            <Image
              src={imageSrc2}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={`object-cover transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-0"
              } ${imageSrc2 === defaultPlaceholder || listing.status === "Sold" || listing.status === "Vendido" ? "grayscale" : ""}`}
              loading="lazy"
              onLoad={() => setImage2Loaded(true)}
              onError={onImage2Error}
              quality={50}
            />
            {(!imageLoaded || !image2Loaded) && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}
          </div>
          {/* Top Left - Property Type */}
          <Badge
            variant="outline"
            className="absolute left-2 top-2 z-10 bg-white/80 text-sm"
          >
            {getPropertyTypeLabel(listing.propertyType)}
          </Badge>

          {/* Top Right - Current Status — hidden when an overlay state takes
              over the card (Vendido / Alquilado / Reservado), so the same
              info doesn't appear twice. */}
          {!!listing.status &&
            listing.status !== "Vendido" &&
            listing.status !== "Alquilado" &&
            listing.status !== "Reservado" && (
              <Badge
                variant="outline"
                className="absolute right-2 top-2 z-10 whitespace-nowrap border-0 bg-slate-900/55 text-sm text-white shadow-sm backdrop-blur-md"
              >
                {listing.status}
              </Badge>
            )}

          {/* Center overlay — bold pill for terminal/blocked states.
              Rose for Vendido/Alquilado (final), amber for Reservado (pending). */}
          {(listing.status === "Vendido" ||
            listing.status === "Alquilado" ||
            listing.status === "Reservado") && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <span
                className={`whitespace-nowrap rounded-full px-8 py-3 text-base font-semibold uppercase tracking-[0.3em] text-white shadow-2xl backdrop-blur-md ${
                  listing.status === "Reservado"
                    ? "bg-amber-500/95 ring-1 ring-amber-400/40"
                    : "bg-rose-600/95 ring-1 ring-rose-500/40"
                }`}
              >
                {listing.status}
              </span>
            </div>
          )}

          {/* Bottom Center - Flag stack (above reference) */}
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1">
            {!!listing.isBankOwned && (
              <Badge
                variant="outline"
                className="whitespace-nowrap border-0 bg-amber-50/80 px-3 py-1 text-xs text-amber-800 shadow-md backdrop-blur-sm"
              >
                {getBankOwnedLabel(listing.propertyType)}
              </Badge>
            )}
            {!!listing.isFeatured && (
              <Badge
                variant="outline"
                className="whitespace-nowrap border-0 bg-yellow-50/90 px-3 py-1 text-xs text-yellow-800 shadow-md backdrop-blur-sm"
              >
                Destacado
              </Badge>
            )}
            {!!listing.isOportunidad && (
              <Badge
                variant="outline"
                className="whitespace-nowrap border-0 bg-orange-50/90 px-3 py-1 text-xs text-orange-800 shadow-md backdrop-blur-sm"
              >
                Oportunidad
              </Badge>
            )}
          </div>

          {/* Bottom Center - Reference Number */}
          <div className="absolute bottom-1 left-1/2 z-10 -translate-x-1/2">
            <span className="text-[11px] font-semibold tracking-widest text-white/90">
              {listing.listingId.toString()}
            </span>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col p-3">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="line-clamp-1 text-base font-semibold">
                {listing.title || listing.street}
              </h3>
            </div>
            <p className="text-base font-bold">
              {formatPrice(listing.price)}€
              {["Rent", "RentWithOption", "RoomSharing"].includes(
                listing.listingType,
              )
                ? "/mes"
                : ""}
            </p>
          </div>

          {(listing.city ?? listing.province ?? listing.street) && (
          <div className="mb-2 flex items-center text-muted-foreground">
            <MapPin className="mr-1 h-3.5 w-3.5" />
            <p className="line-clamp-1 text-sm">
              {[listing.city, listing.province].filter(Boolean).join(", ") || listing.street?.replace(/,\s*\d+.*$/, "").trim()}
            </p>
          </div>
          )}

          <p className="mb-3 line-clamp-3 flex-1 text-sm text-muted-foreground sm:mb-4 sm:text-base">
            {listing.description?.replace(/\s*con\s+null\s+habitaciones/gi, "") ||
              `${getPropertyTypeLabel(listing.propertyType)}${((listing.squareMeter ?? 0) > 0 || (listing.builtSurfaceArea && Number(listing.builtSurfaceArea) > 0)) ? ` de ${formatNumber(listing.squareMeter || Math.round(Number(listing.builtSurfaceArea)))} m²` : ""}${!hideRooms && listing.bedrooms != null && listing.bedrooms > 0 ? ` con ${listing.bedrooms} ${useEstancias ? "estancias" : "habitaciones"}` : ""}`}
          </p>

          {((!hideRooms && listing.bedrooms != null && listing.bedrooms > 0) ||
            (!hideRooms && listing.bathrooms != null && Number(listing.bathrooms) > 0) ||
            ((listing.squareMeter ?? 0) > 0 || (listing.builtSurfaceArea && Number(listing.builtSurfaceArea) > 0))) && (
          <div className="mt-auto flex justify-between text-sm">
            {!hideRooms && listing.bedrooms != null && listing.bedrooms > 0 && (
              <div className="flex items-center">
                <Bed className="mr-1 h-5 w-5" />
                <span>
                  {listing.bedrooms}{" "}
                  {useEstancias
                    ? (listing.bedrooms === 1 ? "Est" : "Ests")
                    : (listing.bedrooms === 1 ? "Hab" : "Habs")}
                </span>
              </div>
            )}
            {!hideRooms && listing.bathrooms != null && Number(listing.bathrooms) > 0 && (
              <div className="flex items-center">
                <Bath className="mr-1 h-5 w-5" />
                <span>
                  {Math.floor(Number(listing.bathrooms))}{" "}
                  {Math.floor(Number(listing.bathrooms)) === 1
                    ? "Baño"
                    : "Baños"}
                </span>
              </div>
            )}
            {((listing.squareMeter ?? 0) > 0 || (listing.builtSurfaceArea && Number(listing.builtSurfaceArea) > 0)) && (
              <div className="flex items-center">
                <SquareFoot className="mr-1 h-5 w-5" />
                <span>{formatNumber(listing.squareMeter || Math.round(Number(listing.builtSurfaceArea)))} m²</span>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
});
