import { PropertyGrid } from "~/components/property-grid";
import Hero from "~/components/hero";
import { ContactSection } from "~/components/contact-section";
import { AboutSection } from "~/components/about-section";
import { CategoryPanel, type CategoryPanelCardInput } from "~/components/category-panel";
import { getPromoCards } from "~/server/queries/promo-cards";
import { hrefForCard } from "~/server/promo-cards/href";
import JsonLd from "~/components/json-ld";
import WebsiteJsonLd from "~/components/website-json-ld";
import Footer from "~/components/footer";
import { PropertySearchWrapper } from "~/components/property-search-wrapper";
import CityShortcuts from "~/components/city-shortcuts";
import type { Metadata } from "next";
import { getMetadataProps } from "~/server/queries/meta";

// Regenerate the page every 5 minutes with fresh data from the database
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const metadataProps = await getMetadataProps();

  // Extract mainpage metadata if it exists
  const mainpageData = metadataProps?.mainpage;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

  const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: mainpageData?.title || "Casas y pisos, alquiler y venta",
    description: mainpageData?.description || "¿Buscas casa? Pisos y casas en venta o alquiler.",
    keywords: mainpageData?.keywords || [],
    alternates: {
      canonical: siteUrl,
    },
  };

  // Allow DB config to override canonical/alternates
  if (mainpageData?.alternates) {
    metadata.alternates = mainpageData.alternates;
  }

  // Handle OpenGraph with proper typing
  if (mainpageData?.openGraph) {
    const ogImages = mainpageData.openGraph.images?.map((img: any) => ({
      url: img.url || '',
      width: img.width,
      height: img.height,
      alt: img.alt,
    })).filter((img: any) => img.url) || [];

    metadata.openGraph = {
      title: mainpageData.openGraph.title,
      description: mainpageData.openGraph.description,
      type: (mainpageData.openGraph.type as any) || 'website',
      locale: mainpageData.openGraph.locale,
      siteName: mainpageData.openGraph.siteName,
      images: ogImages.length > 0 ? ogImages : undefined,
    };
  }

  // Handle Twitter metadata
  if (mainpageData?.twitter) {
    metadata.twitter = {
      card: (mainpageData.twitter.card as any) || 'summary_large_image',
      title: mainpageData.twitter.title,
      description: mainpageData.twitter.description,
      images: mainpageData.twitter.images,
    };
  }

  // Handle robots with proper boolean typing
  if (mainpageData?.robots) {
    const robotsIndex = typeof mainpageData.robots.index === 'number' 
      ? mainpageData.robots.index === 1 
      : mainpageData.robots.index === true;
    
    const robotsFollow = typeof mainpageData.robots.follow === 'number'
      ? mainpageData.robots.follow === 1
      : mainpageData.robots.follow === true;

    metadata.robots = {
      index: robotsIndex,
      follow: robotsFollow,
    };

    if (mainpageData.robots.googleBot) {
      const googleBotIndex = typeof mainpageData.robots.googleBot.index === 'number'
        ? mainpageData.robots.googleBot.index === 1
        : mainpageData.robots.googleBot.index === true;
      
      const googleBotFollow = typeof mainpageData.robots.googleBot.follow === 'number'
        ? mainpageData.robots.googleBot.follow === 1
        : mainpageData.robots.googleBot.follow === true;

      metadata.robots.googleBot = {
        index: googleBotIndex,
        follow: googleBotFollow,
        'max-image-preview': mainpageData.robots.googleBot['max-image-preview'] as any,
        'max-snippet': mainpageData.robots.googleBot['max-snippet'],
      };
    }
  }

  return metadata;
}

export default async function Home() {
  const promoCards = await getPromoCards();
  const categoryCards: CategoryPanelCardInput[] = promoCards.map((c) => ({
    title: c.title,
    subtitle: c.subtitle,
    href: hrefForCard(c),
    imageUrl: c.imageUrl,
  }));

  return (
    <>
      <div className="relative">
        {/* Hero Section - background handled by Hero component */}
        <JsonLd />
        <WebsiteJsonLd />
        <Hero />

        {/* Search Form Container */}
        <div className="relative z-20 -mt-16 sm:-mt-24 md:-mt-32 lg:-mt-40 px-4">
          <PropertySearchWrapper />
        </div>

        {/* Main Content */}
        <div className="relative z-10 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <CategoryPanel cards={categoryCards} />
            <PropertyGrid />
            <CityShortcuts />
            <AboutSection />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ContactSection />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
