import Image from "next/image";

interface PromotionGalleryProps {
  images: { id: string; url: string; alt: string | null }[];
  promotionName: string;
}

export function PromotionGallery({ images, promotionName }: PromotionGalleryProps) {
  if (images.length === 0) return null;

  return (
    <section
      aria-labelledby="promotion-gallery-heading"
      className="mb-16"
    >
      <div className="mb-6">
        <h2
          id="promotion-gallery-heading"
          className="text-xl font-medium tracking-tight text-foreground sm:text-2xl"
        >
          Galería
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Imágenes de {promotionName}
        </p>
      </div>

      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {images.map((img, index) => (
          <div
            key={img.id}
            className="mb-3 break-inside-avoid overflow-hidden rounded-xl bg-muted/40 sm:mb-4"
          >
            <Image
              src={img.url}
              alt={img.alt ?? `${promotionName} — imagen ${index + 1}`}
              width={800}
              height={1000}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="h-auto w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
