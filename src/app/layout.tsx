import "~/styles/globals.css";

import { type Metadata } from "next";
import { headers } from "next/headers";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ThemeProvider } from "~/components/theme-provider";
import { WhatsAppButton } from "~/components/ui/whatsapp-button";
import Navbar from "~/components/navbar";
import { getLogo } from "~/server/queries/logo";
import { getSEOConfig, getModulesConfig } from "~/server/queries/website-config";
import { getSocialLinks } from "~/server/queries/social";
import { getContactProps } from "~/server/queries/contact";
import { getAccountInfo } from "~/server/queries/account";
import { getColorProps } from "~/server/queries/color";
import { getFontProps } from "~/server/queries/font";
import { fontCatalog, allFontVariables } from "~/app/fonts";
import { hexToHsl, readableForegroundHsl } from "~/lib/utils";
import { env } from "~/env";

export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await getSEOConfig();
  const accountInfo = await getAccountInfo(env.NEXT_PUBLIC_ACCOUNT_ID);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const brandName = accountInfo?.shortName || accountInfo?.name || seoConfig.name;

  return {
    metadataBase: new URL(siteUrl),
    title: brandName
      ? { default: seoConfig.title, template: `%s | ${brandName}` }
      : seoConfig.title,
    description: seoConfig.description,
    keywords: seoConfig.keywords,
    openGraph: {
      title: seoConfig.ogTitle || seoConfig.title,
      description: seoConfig.ogDescription || seoConfig.description,
      url: seoConfig.ogUrl,
      siteName: seoConfig.ogSiteName,
      images: [
        {
          url: seoConfig.ogImage || "/images/og-image.jpg",
          width: 1200,
          height: 630,
          alt: seoConfig.ogSiteName || seoConfig.name || "Real Estate",
        },
      ],
      locale: seoConfig.ogLocale || "es_ES",
      type: (seoConfig.ogType || "website") as "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPreview = pathname.startsWith("/preview");

  const [logoUrl, socialLinks, contactProps, accountInfo, colorProps, fontProps, modulesConfig] = await Promise.all([
    getLogo(),
    getSocialLinks(),
    getContactProps(),
    getAccountInfo(env.NEXT_PUBLIC_ACCOUNT_ID),
    getColorProps(),
    getFontProps(),
    getModulesConfig(),
  ]);
  const defaultOffice = contactProps?.offices?.find(office => office.isDefault) || contactProps?.offices?.[0];
  const whatsappPhone = defaultOffice?.phoneNumbers?.sales?.replace(/[\s\-\(\)]/g, '') || null;

  const sansKey = fontProps?.sansFamily ?? "geist";
  const headingKey = fontProps?.headingFamily ?? sansKey;
  const GEIST_VAR = "var(--font-geist-sans)";
  const sansVar = fontCatalog[sansKey]?.cssVar ?? fontCatalog.geist?.cssVar ?? GEIST_VAR;
  const headingVar = fontCatalog[headingKey]?.cssVar ?? sansVar;
  const brandHsl = colorProps?.secondaryColor ? hexToHsl(colorProps.secondaryColor) : null;
  const brandForegroundHsl = colorProps?.secondaryColor ? readableForegroundHsl(colorProps.secondaryColor) : null;
  const rootStyle = {
    ["--font-geist-sans" as string]: sansVar,
    ["--font-cinzel" as string]: headingVar,
    ...(brandHsl ? { ["--brand" as string]: brandHsl } : {}),
    ...(brandForegroundHsl ? { ["--brand-foreground" as string]: brandForegroundHsl } : {}),
  } as React.CSSProperties;

  return (
    <html lang="es" suppressHydrationWarning>
      {env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
        <GoogleAnalytics gaId={env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
      <body
        className={`${allFontVariables} font-sans antialiased`}
        style={rootStyle}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {isPreview ? (
            <main>{children}</main>
          ) : (
            <div className="relative flex min-h-screen flex-col overflow-x-hidden">
              <Navbar
                shortName={accountInfo?.shortName || accountInfo?.name || "Inmobiliaria"}
                logoUrl={logoUrl}
                socialLinks={socialLinks}
                primaryColor={colorProps?.primaryColor ?? null}
                promotionsEnabled={modulesConfig.promotionsEnabled}
              />
              <main className="flex-1">{children}</main>
              <WhatsAppButton phoneNumber={whatsappPhone} />
            </div>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
