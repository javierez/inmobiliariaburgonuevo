"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  CITY_PLACEHOLDER,
  extractCityTemplate,
} from "~/lib/city-template";

interface HeroClientProps {
  title: string;
  subtitle: string;
  findPropertyButton: string;
  contactButton: string;
  backgroundType?: "image" | "video";
  backgroundVideo?: string;
  backgroundImage?: string;
  cities?: string[];
}

const ROTATION_INTERVAL_MS = 4000;

function useRotatingCity(cities: string[] | undefined) {
  const rotatableCities = useMemo(
    () => (cities ?? []).filter((c) => c && c.trim().length > 0),
    [cities],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (rotatableCities.length < 2) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % rotatableCities.length);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [rotatableCities.length]);

  const safeIndex =
    rotatableCities.length > 0 ? index % rotatableCities.length : 0;
  return {
    currentCity: rotatableCities[safeIndex] ?? null,
    rotatableCities,
  };
}

function renderWithRotatingCity(
  text: string,
  knownCities: string[],
  currentCity: string | null,
) {
  const { template, foundCity } = extractCityTemplate(text, knownCities);
  if (!foundCity || !currentCity || knownCities.length < 2) {
    return <>{text}</>;
  }

  const segments = template.split(CITY_PLACEHOLDER);
  return (
    <>
      {segments.map((segment, i) => (
        <span key={`seg-${i}`}>
          {segment}
          {i < segments.length - 1 && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={currentCity}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="block sm:inline-block"
              >
                {currentCity}
              </motion.span>
            </AnimatePresence>
          )}
        </span>
      ))}
    </>
  );
}

export function HeroClient({
  title,
  subtitle,
  findPropertyButton,
  contactButton,
  backgroundType = "image",
  backgroundVideo,
  backgroundImage,
  cities = [],
}: HeroClientProps) {
  const { currentCity, rotatableCities } = useRotatingCity(cities);

  // Force-replay the background video if anything pauses it (e.g. mobile
  // backgrounding, autoplay policy hiccup). Keeping it always playing means
  // the system never overlays a play button on top of the video.
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const ensurePlaying = () => {
      void v.play().catch(() => {
        /* autoplay can be denied; ignore */
      });
    };
    ensurePlaying();
    v.addEventListener("pause", ensurePlaying);
    document.addEventListener("visibilitychange", ensurePlaying);
    return () => {
      v.removeEventListener("pause", ensurePlaying);
      document.removeEventListener("visibilitychange", ensurePlaying);
    };
  }, [backgroundType, backgroundVideo]);

  const animatedTitle = renderWithRotatingCity(
    title,
    rotatableCities,
    currentCity,
  );
  const animatedSubtitle = renderWithRotatingCity(
    subtitle,
    rotatableCities,
    currentCity,
  );

  return (
    <section className="relative mb-8 overflow-hidden sm:mb-12 md:mb-[60px] lg:mb-[70px]">
      {/* Video or Image Background */}
      {backgroundType === "video" && backgroundVideo ? (
        <>
          <div className="absolute inset-0 -z-20">
            <video
              ref={videoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
              className="hero-video h-full w-full object-cover"
            >
              <source src={backgroundVideo} type="video/mp4" />
            </video>
            {/* Hide the iOS/Safari play-button overlay that can flash on top of
                the video when autoplay is briefly blocked (e.g. low-power mode). */}
            <style jsx>{`
              .hero-video::-webkit-media-controls-start-playback-button {
                display: none !important;
                -webkit-appearance: none;
              }
              .hero-video::-webkit-media-controls {
                display: none !important;
              }
            `}</style>
          </div>
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 -z-10 bg-black/40" />
        </>
      ) : backgroundImage ? (
        <>
          <div className="absolute inset-0 -z-20">
            <Image
              src={backgroundImage}
              alt="Hero background"
              fill
              className="object-cover"
              priority
            />
          </div>
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 -z-10 bg-black/40" />
        </>
      ) : null}

      {/* Decorative animated orbs */}
      <motion.div
        className="pointer-events-none absolute left-10 top-20 h-64 w-64 rounded-full bg-gradient-to-r from-amber-400/10 to-rose-400/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="pointer-events-none absolute right-10 bottom-10 h-48 w-48 rounded-full bg-gradient-to-r from-blue-400/10 to-purple-400/10 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      <div className="container pb-20 pt-6 sm:pb-32 sm:pt-10 md:pb-40 md:pt-8 lg:pb-48 lg:pt-12">
        <div className="max-w-3xl space-y-4 px-4 sm:ml-8 sm:space-y-5 md:ml-12 lg:mx-auto lg:px-4">
          {/* Animated title */}
          <motion.h1
            className="text-5xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {animatedTitle}
          </motion.h1>

          {/* Animated subtitle */}
          <motion.p
            className="max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg md:text-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {animatedSubtitle}
          </motion.p>

          {/* Animated buttons */}
          <motion.div
            className="flex max-w-md flex-col gap-3 pt-2 sm:flex-row sm:gap-4 sm:pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Button
              size="lg"
              className="w-full min-w-0 bg-white text-black hover:bg-white/90 hover:scale-105 active:scale-95 transition-transform sm:w-auto"
              asChild
            >
              <Link href="/venta-propiedades/todas-ubicaciones">
                {findPropertyButton}
              </Link>
            </Button>

            <Button
              size="lg"
              className="w-full min-w-0 !bg-brand !text-brand-foreground hover:!bg-brand/90 hover:scale-105 active:scale-95 transition-transform sm:w-auto"
              asChild
            >
              <Link href="#contact">
                {contactButton}
              </Link>
            </Button>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
