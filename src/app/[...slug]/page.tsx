import type { Metadata } from "next";
import Link from "next/link";
import { searchListings, countListings, type SearchFilters, type SortOption } from "~/server/queries/listings";
import { PropertyCard } from "~/components/listing-card";
import { getProvinces, getPriceRange } from "~/server/actions/locations";
import { getWatermarkConfig } from "~/server/queries/watermark";
import { env } from "~/env";
import { PropertyCardSkeleton } from "~/components/property-card-skeleton";
import {
  parseSearchSlug,
  normalizePropertyTypes,
  type PropertyType,
} from "~/lib/search-utils";
import Footer from "~/components/footer";
import { SearchBar } from "~/components/search-bar";
import { SortDropdown } from "~/components/sort-dropdown";
import { Pagination } from "~/components/pagination";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import BreadcrumbJsonLd from "~/components/breadcrumb-json-ld";
import { FeedViewToggle } from "~/components/propiedades/FeedViewToggle";
import { PropertyFeed } from "~/components/propiedades/PropertyFeed";
import { CityIntro } from "~/components/city/city-intro";
import { CityFaq } from "~/components/city/city-faq";
import FaqJsonLd from "~/components/city/faq-json-ld";
import { getCityContent } from "~/server/queries/city-content";

const ITEMS_PER_PAGE = 24;

const PROPERTY_TYPE_PLURAL: Record<Exclude<PropertyType, "any">, string> = {
  piso: "Pisos",
  casa: "Casas",
  local: "Locales",
  solar: "Solares",
  garaje: "Garajes",
  edificio: "Edificios",
  oficina: "Oficinas",
  industrial: "Naves Industriales",
  trastero: "Trasteros",
};

function buildPropertyTypeTitle(
  types: Exclude<PropertyType, "any">[],
  status: "for-sale" | "for-rent" | "any",
): string {
  // "Solar" is sale-only; if it's the only selected type and rent is requested,
  // we still keep the rent suffix to match what the URL expresses.
  const suffix =
    status === "for-rent" ? "en Alquiler" : "en Venta";
  const labels = types.map((t) => PROPERTY_TYPE_PLURAL[t]);
  let joined: string;
  if (labels.length === 1) {
    joined = labels[0]!;
  } else {
    joined = `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
  }
  return `${joined} ${suffix}`;
}

// Generate dynamic metadata based on search parameters
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}): Promise<Metadata> {
  const unwrappedParams = await params;
  const unwrappedSearchParams = await searchParams;
  const slugString = unwrappedParams.slug.join("/");
  const currentPage = Math.max(1, parseInt(unwrappedSearchParams.page ?? "1", 10) || 1);
  const parsedParams = parseSearchSlug(slugString);
  const {
    location = "",
    status = "for-sale",
    isOportunidad,
    isBankOwned,
    isFeatured,
  } = parsedParams;
  const selectedTypes = normalizePropertyTypes(parsedParams.propertyType);

  // Build title and description based on search parameters
  let title = "Propiedades";
  let description = "Explora nuestras propiedades disponibles.";

  if (status === "for-rent") {
    title = "Propiedades en Alquiler";
    description =
      "Encuentra propiedades en alquiler en las mejores ubicaciones.";
  } else if (status === "for-sale") {
    title = "Propiedades en Venta";
    description =
      "Descubre propiedades en venta que se adaptan a tus necesidades.";
  }

  if (selectedTypes.length > 0) {
    title = buildPropertyTypeTitle(selectedTypes, status);
  }

  // Handle oportunidad filter
  if (isOportunidad) {
    title += " - Oportunidad";
    description = "Descubre nuestras mejores oportunidades inmobiliarias.";
  }

  if (isBankOwned) {
    title += " - Origen Bancario";
    description = "Descubre nuestras propiedades de origen bancario.";
  }

  if (isFeatured) {
    title += " - Destacados";
    description = "Descubre nuestras propiedades destacadas.";
  }

  if (location && location !== "todas-ubicaciones") {
    const locationName = decodeURIComponent(location.replace(/-/g, " "));
    const capitalizedLocationName =
      locationName.charAt(0).toUpperCase() + locationName.slice(1);
    title += ` en ${capitalizedLocationName}`;
    description += ` en ${capitalizedLocationName}.`;
  }

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/${slugString}`,
      type: "website",
    },
    alternates: {
      canonical: currentPage > 1 ? `/${slugString}?page=${currentPage}` : `/${slugString}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface SearchPageProps {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<{
    sort?: string;
    page?: string;
    vista?: string;
  }>;
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  // Join the slug array into a single string
  const unwrappedParams = await params;
  const unwrappedSearchParams = await searchParams;
  const slugString = unwrappedParams.slug.join("/");
  const validSorts: SortOption[] = ["default", "newest", "price-asc", "price-desc", "size-asc", "size-desc"];
  const sort: SortOption = validSorts.includes(unwrappedSearchParams.sort as SortOption)
    ? (unwrappedSearchParams.sort as SortOption)
    : "default";
  const isFeedView = unwrappedSearchParams.vista === "feed";

  // Parse the slug to get search parameters
  const parsedParams = parseSearchSlug(slugString);

  // Destructure search parameters
  const {
    location = "",
    cities,
    neighborhoodIds,
    province,
    bedrooms = "any",
    bathrooms = "any",
    status = "for-sale",
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    isOportunidad,
    isBankOwned,
    isFeatured,
  } = parsedParams;
  const selectedTypes = normalizePropertyTypes(parsedParams.propertyType);

  // Build search filters
  const searchFilters: SearchFilters = {
    location: location || undefined,
    cities: cities && cities.length > 0 ? cities : undefined,
    neighborhoodIds:
      neighborhoodIds && neighborhoodIds.length > 0 ? neighborhoodIds : undefined,
    province: province && province !== "all" ? province : undefined,
    propertyType: selectedTypes.length > 0 ? selectedTypes : undefined,
    status: status as "for-sale" | "for-rent",
    bedrooms: bedrooms === "any" ? undefined : parseInt(bedrooms),
    bathrooms: bathrooms === "any" ? undefined : parseInt(bathrooms),
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    isOportunidad,
    isBankOwned,
    isFeatured,
  };

  // Pagination
  const currentPage = Math.max(1, parseInt(unwrappedSearchParams.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Get data for search bar
  const accountId = BigInt(env.NEXT_PUBLIC_ACCOUNT_ID);
  const citySlugForContent =
    location && location !== "todas-ubicaciones" ? location : null;
  const [provinces, priceRange, totalCount, listings, watermarkConfig, cityContent] = await Promise.all([
    getProvinces(accountId),
    getPriceRange(accountId),
    countListings(searchFilters),
    searchListings(searchFilters, ITEMS_PER_PAGE, sort, offset),
    getWatermarkConfig(),
    citySlugForContent ? getCityContent(citySlugForContent) : Promise.resolve(null),
  ]);

  // Only surface intro + FAQ on the first page, to keep paginated pages distinct
  // without duplicating the hero content (Google indexes ?page=2 separately).
  const showCityContent = cityContent && currentPage === 1;

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // 404 for invalid page numbers
  if (currentPage > totalPages && totalPages > 0) {
    notFound();
  }

  const watermarkEnabled = watermarkConfig.enabled && !!watermarkConfig.logoUrl;

  // Hardcoded property types
  const propertyTypes = ["piso", "casa", "local", "solar", "garaje", "edificio", "oficina", "industrial", "trastero"];

  // Ensure priceRange has valid numbers
  const validPriceRange = {
    minPrice: typeof priceRange.minPrice === "number" ? priceRange.minPrice : 0,
    maxPrice:
      typeof priceRange.maxPrice === "number" ? priceRange.maxPrice : 2000000,
  };

  // Build title of the search
  let searchTitle = "Propiedades";

  if (status === "for-rent") {
    searchTitle = "Propiedades en Alquiler";
  } else if (status === "for-sale") {
    searchTitle = "Propiedades en Venta";
  }

  if (selectedTypes.length > 0) {
    searchTitle = buildPropertyTypeTitle(selectedTypes, status);
  }

  // Add "Oportunidad" suffix if filtering by oportunidad
  if (isOportunidad) {
    searchTitle += " - Oportunidad";
  }

  if (isBankOwned) {
    searchTitle += " - Origen Bancario";
  }

  if (isFeatured) {
    searchTitle += " - Destacados";
  }

  let capitalizedCityName: string | null = null;
  if (location && location !== "todas-ubicaciones") {
    const locationName = decodeURIComponent(location.replace(/-/g, " "));
    capitalizedCityName =
      locationName.charAt(0).toUpperCase() + locationName.slice(1);
    searchTitle += ` en ${capitalizedCityName}`;
  }

  return (
    <>
      <BreadcrumbJsonLd
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}
        items={[
          { name: "Inicio", href: "/" },
          { name: searchTitle, href: `/${slugString}` },
        ]}
      />
      {currentPage > 1 && (
        <link
          rel="prev"
          href={currentPage === 2 ? `/${slugString}` : `/${slugString}?page=${currentPage - 1}`}
        />
      )}
      {currentPage < totalPages && (
        <link rel="next" href={`/${slugString}?page=${currentPage + 1}`} />
      )}
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="py-4" aria-label="Breadcrumb">
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
            <li className="font-medium" aria-current="page">
              {searchTitle}
            </li>
          </ol>
        </nav>

        <div className="mb-8 mt-8">
          <SearchBar
            initialParams={parsedParams}
            provinces={provinces}
            propertyTypes={propertyTypes}
            priceRange={validPriceRange}
            accountId={env.NEXT_PUBLIC_ACCOUNT_ID}
          />
        </div>

        <div className="mb-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold">{searchTitle}</h1>
            <div className="flex items-center gap-2">
              <FeedViewToggle slugString={slugString} currentSort={sort} />
              <SortDropdown slugString={slugString} currentSort={sort} />
            </div>
          </div>
          <p className="hidden text-muted-foreground sm:block">
            {totalCount} propiedades encontradas
            {totalPages > 1 && ` — Página ${currentPage} de ${totalPages}`}
          </p>
        </div>

        {showCityContent && cityContent && capitalizedCityName && (
          <CityIntro city={capitalizedCityName} intro={cityContent.intro} />
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Suspense
            fallback={Array.from({ length: 6 }).map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          >
            {listings.map((listing, index) => (
              <PropertyCard
                key={listing.listingId.toString()}
                listing={listing}
                index={index}
                watermarkEnabled={watermarkEnabled}
              />
            ))}
          </Suspense>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          slugString={slugString}
          currentSort={sort}
        />

        {showCityContent && cityContent && capitalizedCityName && (
          <>
            <CityFaq city={capitalizedCityName} faq={cityContent.faq} />
            <FaqJsonLd faq={cityContent.faq} />
          </>
        )}

        {isFeedView && (
          <PropertyFeed
            listings={listings}
            watermarkEnabled={watermarkEnabled}
            slugString={slugString}
            currentSort={sort}
          />
        )}
      </div>
      <Footer />
    </main>
    </>
  );
}
