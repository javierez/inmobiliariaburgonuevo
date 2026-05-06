import type { Metadata } from "next";
import Link from "next/link";
import { ContactSection } from "~/components/contact-section";
import Footer from "~/components/footer";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Póngase en contacto con nuestro equipo de expertos inmobiliarios. Le ayudamos con la compra, venta y alquiler de propiedades.",
  alternates: {
    canonical: `${baseUrl}/contacto`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8 py-4" aria-label="Breadcrumb">
          <ol className="flex items-center text-sm">
            <li>
              <Link
                href="/"
                className="text-muted-foreground hover:text-primary"
              >
                Inicio
              </Link>
            </li>
            <li className="mx-2">/</li>
            <li className="font-medium" aria-current="page">
              Contacto
            </li>
          </ol>
        </nav>
      </div>

      {/* Centered ContactSection */}
      <div className="flex justify-center">
        <div className="w-full max-w-7xl">
          <ContactSection />
        </div>
      </div>
      <Footer />
    </main>
  );
}
