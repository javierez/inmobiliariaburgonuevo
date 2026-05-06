import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getListingDetails,
  getPropertyImages,
  getPropertyMedia,
} from "~/server/queries/listings";
import { getAccountInfo } from "~/server/queries/account";
import { env } from "~/env";
import { getBankOwnedLabel } from "~/lib/data";
import {
  buildPropertySlug,
  parsePropertySlug,
  buildPropertyImageAlt,
} from "~/lib/property-slug";
import { Badge } from "~/components/ui/badge";
import { Bed, Bath, SquareIcon, MapPin } from "lucide-react";
import { PropertyCard } from "~/components/property-card";
import { ContactSection } from "~/components/contact-section";
import Footer from "~/components/footer";
import { ImageGallery } from "~/components/property/image-gallery";
import { PropertyCharacteristics } from "~/components/property/property-characteristics";
import { PropertyLocationMap } from "~/components/property/property-location-map";
import { PropertyPageClient } from "./property-page-client";
import BreadcrumbJsonLd from "~/components/breadcrumb-json-ld";
import PropertyJsonLd from "~/components/property-json-ld";
import { EnergyCertificateSection } from "~/components/property/energy-certificate-section";
import { PropertyMedia } from "~/components/property/property-media";
import { buildSearchSlug } from "~/lib/search-utils";

interface PropertyPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const unwrappedParams = await params;
  const parsed = parsePropertySlug(unwrappedParams.id);

  let property = null;
  let propertyImages = [];

  if (parsed) {
    try {
      property = await getListingDetails(parsed.id);
      if (property) {
        propertyImages = await getPropertyImages(property.propertyId);
      }
    } catch (error) {
      console.error("Error fetching property for metadata:", error);
    }
  }

  // Fetch website configuration from database
  const accountInfo = await getAccountInfo(env.NEXT_PUBLIC_ACCOUNT_ID);
  const companyName = accountInfo?.name || "Inmobiliaria";

  if (!property) {
    return {
      title: `Propiedad no encontrada | ${companyName}`,
      description:
        "La propiedad que estás buscando no existe o ha sido eliminada.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const canonicalSlug = buildPropertySlug({
    listingId: property.listingId,
    title: property.title,
    propertyType: property.propertyType,
    city: property.city,
    bedrooms: property.bedrooms,
    listingType: property.listingType,
  });

  return {
    title: `${property.title} | ${companyName}`,
    description: property.description || `Propiedad en ${property.city}`,
    alternates: {
      canonical: `${baseUrl}/propiedades/${canonicalSlug}`,
    },
    openGraph: {
      title: `${property.title} | ${companyName}`,
      description: property.description || `Propiedad en ${property.city}`,
      url: `${baseUrl}/propiedades/${canonicalSlug}`,
      images: [
        {
          url: propertyImages[0]?.imageUrl ?? "/properties/suburban-dream.png",
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
    },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const unwrappedParams = await params;
  const parsed = parsePropertySlug(unwrappedParams.id);

  if (!parsed) {
    notFound();
  }

  let property = null;
  let propertyImages = [];
  let propertyMediaData = { videos: [] as { id: string; url: string }[], youtubeLinks: [] as { id: string; url: string }[], virtualTours: [] as { id: string; url: string }[] };

  try {
    property = await getListingDetails(parsed.id);
    if (property) {
      [propertyImages, propertyMediaData] = await Promise.all([
        getPropertyImages(property.propertyId),
        getPropertyMedia(property.propertyId),
      ]);
    }
  } catch (error) {
    console.error("Error fetching property:", error);
    notFound();
  }

  const accountInfo = await getAccountInfo(env.NEXT_PUBLIC_ACCOUNT_ID);

  if (!property) {
    notFound();
  }

  // 301-redirect to the canonical slug URL if the requested slug doesn't match.
  // This covers legacy numeric IDs and any stale/altered slugs indexed by search engines.
  const canonicalSlug = buildPropertySlug({
    listingId: property.listingId,
    title: property.title,
    propertyType: property.propertyType,
    city: property.city,
    bedrooms: property.bedrooms,
    listingType: property.listingType,
  });
  if (parsed.raw !== canonicalSlug) {
    permanentRedirect(`/propiedades/${canonicalSlug}`);
  }

  // Transform database images to PropertyImage format, with videos first
  const baseAlt = buildPropertyImageAlt({
    title: property.title,
    propertyType: property.propertyType,
    city: property.city,
    bedrooms: property.bedrooms,
    squareMeter: property.squareMeter,
    listingType: property.listingType,
  });

  const videoSlides = propertyMediaData.videos.map((v) => ({
    id: v.id,
    url: v.url,
    alt: `${baseAlt} - Vídeo`,
    tag: "video" as const,
    originImageId: null,
  }));

  const imageSlides = propertyImages.map((img: any) => ({
    id: img.propertyImageId,
    url: img.imageUrl,
    alt: `${baseAlt} - Foto ${img.imageOrder}`,
    tag: img.imageTag || undefined,
    originImageId: img.originImageId || null,
    fallbackUrl: img.originalImageUrl !== img.imageUrl ? img.originalImageUrl : undefined,
    thumbUrl: img.thumbUrl || null,
    medUrl: img.medUrl || null,
    fullUrl: img.fullUrl || null,
  }));

  const transformedImages = [...videoSlides, ...imageSlides];

  // Create features array from database fields
  const features = [];
  if (property.hasElevator) features.push("Ascensor");
  if (property.hasGarage) features.push("Garaje");
  if (property.hasStorageRoom) features.push("Trastero");
  if (property.hasHeating) features.push("Calefacción");
  if (property.airConditioningType) features.push("Aire acondicionado");
  if (property.terrace) features.push("Terraza");
  if (property.garden) features.push("Jardín");
  if (property.pool) features.push("Piscina");
  if (property.bright) features.push("Luminoso");
  if (property.exterior) features.push("Exterior");

  // Get similar properties (same city or type) - for now just return empty array
  // TODO: Implement similar properties query
  const similarProperties: any[] = [];

  // Map coordinates from database or default to center of Spain
  const mapCoordinates = {
    lat: Number(property.latitude) || 40.4168,
    lng: Number(property.longitude) || -3.7038,
  };

  // Format address based on location visibility setting
  // 1 = Exact (full address), 2 = Street (no number), 3 = Zone (no street)
  const getFormattedAddress = () => {
    const visibility = property.fcLocationVisibility ?? 1;
    const street = property.street;

    // Remove street number from street name
    const streetWithoutNumber = street
      ?.replace(/,?\s*\d+[A-Za-z]?\s*$/g, "") // Remove number at end (e.g., ", 5" or " 12B")
      ?.replace(/^\d+[A-Za-z]?\s*,?\s*/g, "") // Remove number at start (e.g., "5, " or "12B ")
      ?.trim();

    // Avoid duplicating city and province when they are the same (e.g., "León, León")
    const province = property.province !== property.city ? property.province : null;
    const parts: (string | null | undefined)[] = [];

    if (visibility === 1) {
      // Exact: show full address
      parts.push(street, property.city, province, property.postalCode);
    } else if (visibility === 2) {
      // Street: show street name without number
      parts.push(streetWithoutNumber, property.city, province, property.postalCode);
    } else {
      // Zone: show only city/province (no street)
      parts.push(property.city, province);
    }

    return parts.filter(Boolean).join(", ");
  };

  return (
    <>
      <BreadcrumbJsonLd
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}
        items={[
          { name: "Inicio", href: "/" },
          { name: "Propiedades", href: "/" },
          { name: property.title || "Propiedad", href: `/propiedades/${canonicalSlug}` },
        ]}
      />
      <PropertyJsonLd
        property={property}
        images={propertyImages}
        companyName={accountInfo?.name || "Inmobiliaria"}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"}
      />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mt-2 py-4" aria-label="Breadcrumb">
          <ol className="flex items-center text-sm">
            <li>
              <Link
                href="/"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Inicio
              </Link>
            </li>
            <li className="mx-2">/</li>
            <li>
              <Link
                href="/"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Propiedades
              </Link>
            </li>
            <li className="mx-2">/</li>
            <li className="font-medium" aria-current="page">
              {property.title || "Propiedad"}
            </li>
          </ol>
        </nav>

        {/* Encabezado de la propiedad */}
        <article className="py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {property.title || "Propiedad"}
              </h1>
              <div className="mt-2 flex items-center text-muted-foreground">
                <MapPin className="mr-1 h-4 w-4" />
                <p>{getFormattedAddress()}</p>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Ref: {property.listingId || "N/A"}
              </div>
            </div>
            <div className="flex flex-col md:items-end">
              <div className="text-3xl font-bold">
                {(() => {
                  const price = property.price;
                  if (!price || price === "0" || price === 0) {
                    return "Precio a consultar";
                  }
                  try {
                    return Number(price).toLocaleString("es-ES");
                  } catch {
                    return "Precio a consultar";
                  }
                })()}
                €
                {property.listingType === "Rent" ||
                property.listingType === "RentWithOption"
                  ? "/mes"
                  : ""}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge>
                  {property.listingType === "Sale"
                    ? "En Venta"
                    : property.listingType === "Rent" ||
                        property.listingType === "RentWithOption"
                      ? "En Alquiler"
                      : property.status}
                </Badge>
                {!!property.isBankOwned && (
                  <Badge
                    variant="outline"
                    className="border-0 bg-amber-50/80 text-amber-800 shadow-md backdrop-blur-sm"
                  >
                    {getBankOwnedLabel(property.propertyType)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Galería de imágenes */}
        <div className="pb-8">
          <ImageGallery
            images={transformedImages}
            title={property.title || "Property"}
          />
        </div>

        {/* Videos, YouTube, Virtual Tours */}
        <div className="pb-8">
          <PropertyMedia
            videos={[]}
            youtubeLinks={propertyMediaData.youtubeLinks}
            virtualTours={propertyMediaData.virtualTours}
          />
        </div>

        {/* Contenido principal */}
        <div className="pb-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Columna principal */}
            <div className="space-y-8 lg:col-span-2">
              {/* Características principales - Only show if at least one value exists */}
              {!!((property.bedrooms && property.bedrooms > 0) ||
                (property.bathrooms && property.bathrooms > 0) ||
                (property.squareMeter && property.squareMeter > 0)) && (
                <div className="grid gap-4 rounded-lg bg-muted p-6" style={{
                  gridTemplateColumns: `repeat(${[
                    property.bedrooms && property.bedrooms > 0,
                    property.bathrooms && property.bathrooms > 0,
                    property.squareMeter && property.squareMeter > 0
                  ].filter(Boolean).length}, 1fr)`
                }}>
                  {!!property.bedrooms && property.bedrooms > 0 && (
                    <div className="flex flex-col items-center text-center">
                      <Bed className="mb-2 h-8 w-8 text-primary" />
                      <span className="font-bold">{property.bedrooms}</span>
                    </div>
                  )}
                  {!!property.bathrooms && property.bathrooms > 0 && (
                    <div className="flex flex-col items-center text-center">
                      <Bath className="mb-2 h-8 w-8 text-primary" />
                      <span className="font-bold">
                        {Math.floor(Number(property.bathrooms))}
                      </span>
                    </div>
                  )}
                  {!!property.squareMeter && property.squareMeter > 0 && (
                    <div className="flex flex-col items-center text-center">
                      <SquareIcon className="mb-2 h-8 w-8 text-primary" />
                      <span className="font-bold">
                        {Number(property.squareMeter).toLocaleString("es-ES")} m²
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Descripción - Only show if description exists */}
              {!!property.description && (
                <div>
                  <h2 className="mb-4 text-2xl font-bold">Descripción</h2>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {property.description}
                  </p>
                </div>
              )}

              {/* Características */}
              <PropertyCharacteristics property={property} />

              {/* Energy Certificate */}
              <EnergyCertificateSection
                energyConsumptionScale={property.energyConsumptionScale}
                energyConsumptionValue={property.energyConsumptionValue}
                emissionsScale={property.emissionsScale}
                emissionsValue={property.emissionsValue}
                propertyType={property.propertyType}
              />

              {/* Mapa */}
              <div>
                <h2 className="mb-4 text-2xl font-bold">Ubicación</h2>
                <div className="aspect-[16/9] w-full overflow-hidden rounded-lg">
                  <PropertyLocationMap
                    lat={mapCoordinates.lat}
                    lng={mapCoordinates.lng}
                    locationVisibility={property.fcLocationVisibility}
                  />
                </div>
              </div>
            </div>

            {/* Barra lateral */}
            <PropertyPageClient property={property} />
          </div>
        </div>

        {property.city && (
          <div className="pb-8">
            <Link
              href={`/${buildSearchSlug({ location: property.city, status: "for-sale" })}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Ver más propiedades en {property.city}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}

        {/* Propiedades similares - Only show if there are similar properties */}
        {similarProperties.length > 0 && (
          <section className="py-16" aria-label="Propiedades similares">
            <h2 className="mb-8 text-2xl font-bold">Propiedades Similares</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {similarProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </section>
        )}
      </main>
      <div className="mx-auto hidden max-w-7xl px-4 sm:px-6 md:block lg:px-8">
        <ContactSection />
      </div>
      <Footer />
    </>
  );
}
