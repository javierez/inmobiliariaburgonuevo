"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import {
  Menu,
  X,
  ChevronDown,
  Home,
  Building2,
  Store,
  LandPlot,
  Car,
  PlusCircle,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useCallback, memo, useEffect } from "react";
import { cn, hexToRgba } from "~/lib/utils";
import { SocialLinks } from "~/components/ui/social-links";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

// Types
type SocialPlatform =
  | "facebook"
  | "twitter"
  | "instagram"
  | "linkedin"
  | "youtube";

interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

interface NavbarProps {
  socialLinks?: SocialLink[];
  shortName?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  promotionsEnabled?: boolean;
}

// Memoized Social Links Section
const MobileSocialLinks = memo(({ links }: { links: SocialLink[] }) => (
  <div className="border-t bg-muted/50 backdrop-blur-sm">
    <div className="px-4 py-4">
      <div className="mb-3 text-xs font-medium text-muted-foreground">
        Síguenos en redes sociales
      </div>
      <SocialLinks links={links} />
    </div>
  </div>
));

MobileSocialLinks.displayName = "MobileSocialLinks";

// Main Component
export default function Navbar({
  socialLinks,
  shortName,
  logoUrl,
  primaryColor,
  promotionsEnabled = false,
}: NavbarProps): React.ReactElement {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchRef, setSearchRef] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoized handlers
  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleMenuClose();
      }
    },
    [handleMenuClose],
  );

  const handleRefSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = searchRef.trim();
      if (trimmed) {
        router.push(`/propiedades/${trimmed}`);
        setSearchRef("");
      }
    },
    [searchRef, router],
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full",
        !isMenuOpen && "border-b backdrop-blur",
        !isMenuOpen && !primaryColor && "bg-background/95 supports-[backdrop-filter]:bg-background/60"
      )}
      style={
        !isMenuOpen && primaryColor
          ? { backgroundColor: hexToRgba(primaryColor, 0.2) ?? undefined }
          : undefined
      }
      onKeyDown={handleKeyPress}
    >
      <div
        className={cn(
          "container mx-auto h-16 items-center justify-between px-4 sm:h-18 sm:px-6",
          isMenuOpen ? "hidden lg:flex" : "flex",
        )}
      >
        {/* Left section - Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center gap-2" aria-label="Home">
            <div className="relative h-16 w-40">
              <Image
                src={logoUrl ?? "/vestazoomin.jpeg"}
                alt={shortName || "Vesta CRM Logo"}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Center section - Navigation */}
        <nav
          className="hidden gap-4 lg:flex xl:gap-6"
          aria-label="Main navigation"
        >
          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary"
                aria-label="Comprar opciones"
              >
                Comprar <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem>
                  <Link href="/venta-pisos/todas-ubicaciones" className="w-full">
                    Pisos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/venta-casas/todas-ubicaciones" className="w-full">
                    Casas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/venta-locales/todas-ubicaciones"
                    className="w-full"
                  >
                    Locales
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/venta-solares/todas-ubicaciones"
                    className="w-full"
                  >
                    Solares
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/venta-garajes/todas-ubicaciones"
                    className="w-full"
                  >
                    Garajes
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="flex items-center gap-1 text-sm font-medium">
              Comprar <ChevronDown className="h-4 w-4" />
            </span>
          )}

          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary"
                aria-label="Alquilar opciones"
              >
                Alquilar <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem>
                  <Link
                    href="/alquiler-pisos/todas-ubicaciones"
                    className="w-full"
                  >
                    Pisos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/alquiler-casas/todas-ubicaciones"
                    className="w-full"
                  >
                    Casas
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/alquiler-locales/todas-ubicaciones"
                    className="w-full"
                  >
                    Locales
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    href="/alquiler-solares/todas-ubicaciones"
                    className="w-full"
                  >
                    Solares
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                  href="/alquiler-garajes/todas-ubicaciones"
                  className="w-full"
                >
                  Garajes
                </Link>
              </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="flex items-center gap-1 text-sm font-medium">
              Alquilar <ChevronDown className="h-4 w-4" />
            </span>
          )}

          {promotionsEnabled && (
            <Link
              href="/promociones"
              className="text-sm font-medium transition-colors hover:text-primary"
              aria-label="Promociones"
            >
              Promociones
            </Link>
          )}
          <Link
            href="/vender"
            className="text-sm font-medium transition-colors hover:text-primary"
            aria-label="Vender propiedad"
          >
            Vender
          </Link>
          <Link
            href="/#about"
            className="text-sm font-medium transition-colors hover:text-primary"
            aria-label="Sobre nosotros"
          >
            Nosotros
          </Link>
          <Link
            href="/#contact"
            className="text-sm font-medium transition-colors hover:text-primary"
            aria-label="Contacto"
          >
            Contacto
          </Link>
          <Link
            href="/enlaces-de-interes"
            className="text-sm font-medium transition-colors hover:text-primary"
            aria-label="Enlaces de interés"
          >
            Enlaces
          </Link>
        </nav>

        {/* Right section - Search, Social Links and Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Reference Search */}
          <form onSubmit={handleRefSearch} className="hidden sm:flex">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                placeholder="Busca por referencia"
                className="h-8 w-40 rounded-md border border-input bg-white pl-7 pr-2 text-xs transition-all placeholder:text-muted-foreground focus:w-44 focus:outline-none focus:ring-1 focus:ring-ring"
                aria-label="Buscar por referencia"
              />
            </div>
          </form>
          <div className="hidden lg:flex">
            {socialLinks && socialLinks.length > 0 && (
              <SocialLinks links={socialLinks} />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={handleMenuToggle}
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-0 z-50 w-full bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          isMenuOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex h-full flex-col">
          {/* Close button */}
          <div className="flex h-16 items-center justify-end px-4 sm:h-18 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMenuClose}
              aria-label="Cerrar menú"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 px-4 py-6">
              {/* Mobile Reference Search */}
              <form onSubmit={handleRefSearch} className="sm:hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchRef}
                    onChange={(e) => setSearchRef(e.target.value)}
                    placeholder="Buscar por referencia..."
                    className="h-10 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    aria-label="Buscar por referencia"
                  />
                </div>
              </form>

              {/* Comprar Section */}
              <div className="space-y-3">
                <h3 className="px-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Comprar
                </h3>
                <div className="space-y-1">
                  <Link
                    href="/venta-pisos/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <Home className="h-4 w-4" />
                    Pisos
                  </Link>
                  <Link
                    href="/venta-casas/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <Building2 className="h-4 w-4" />
                    Casas
                  </Link>
                  <Link
                    href="/venta-locales/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <Store className="h-4 w-4" />
                    Locales
                  </Link>
                  <Link
                    href="/venta-solares/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <LandPlot className="h-4 w-4" />
                    Solares
                  </Link>
                  <Link
                    href="/venta-garajes/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <Car className="h-4 w-4" />
                    Garajes
                  </Link>
                </div>
              </div>

              {/* Alquilar Section */}
              <div className="space-y-3">
                <h3 className="px-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Alquilar
                </h3>
                <div className="space-y-1">
                  <Link
                    href="/alquiler-pisos/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <Home className="h-4 w-4" />
                    Pisos
                  </Link>
                  <Link
                    href="/alquiler-casas/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <Building2 className="h-4 w-4" />
                    Casas
                  </Link>
                  <Link
                    href="/alquiler-locales/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <Store className="h-4 w-4" />
                    Locales
                  </Link>
                  <Link
                    href="/alquiler-solares/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <LandPlot className="h-4 w-4" />
                    Solares
                  </Link>
                  <Link
                    href="/alquiler-garajes/todas-ubicaciones"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <Car className="h-4 w-4" />
                    Garajes
                  </Link>
                </div>
              </div>

              {/* Other Links */}
              <div className="space-y-3">
                <h3 className="px-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Más
                </h3>
                <div className="space-y-1">
                  {promotionsEnabled && (
                    <Link
                      href="/promociones"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={handleMenuClose}
                    >
                      <Building2 className="h-4 w-4" />
                      Promociones
                    </Link>
                  )}
                  <Link
                    href="/vender"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Vender
                  </Link>
                  <Link
                    href="/#about"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    Nosotros
                  </Link>
                  <Link
                    href="/#contact"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    Contacto
                  </Link>
                  <Link
                    href="/enlaces-de-interes"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={handleMenuClose}
                  >
                    Enlaces
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links Footer */}
          {socialLinks && socialLinks.length > 0 && (
            <MobileSocialLinks links={socialLinks} />
          )}
        </div>
      </div>
    </header>
  );
}
