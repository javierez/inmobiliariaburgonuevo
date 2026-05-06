import { sql } from "drizzle-orm";
import type { AnyColumn, SQL } from "drizzle-orm";

// Excludes properties with zero photos from every public-facing query.
// Photo = active image whose tag isn't a tour/youtube/video.
export function hasAtLeastOnePhoto(propertyIdColumn: AnyColumn): SQL {
  return sql`EXISTS (
    SELECT 1 FROM property_images
    WHERE property_images.property_id = ${propertyIdColumn}
      AND property_images.is_active = true
      AND (property_images.image_tag IS NULL OR property_images.image_tag NOT IN ('tour', 'youtube', 'video'))
  )`;
}
