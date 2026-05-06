import type { HeroProps } from "../../lib/data";
import { getContactProps } from "./contact";

export type HeroPropsWithCities = HeroProps & { cities: string[] };

/**
 * Cities used for the homepage rotation and the navbar "Zonas" dropdown.
 * Sourced from the offices configured in `website_config.contact_props`,
 * not from the listings table — this is the authoritative list of cities
 * the agency has a physical presence in.
 */
export const getHeroCities = (): string[] => {
  return ["León"];
}

// Using React cache to memoize the query
export const getHeroProps = (): HeroProps | null => {
  return {
  "title": "Venta y alquiler de pisos en León",
  "subtitle": "Ayudando a personas a encontrar su hogar desde hace más de 35 años",
  "backgroundImage": "",
  "findPropertyButton": "Encuentra tu casa",
  "contactButton": "Ponte en    contacto",
  "backgroundVideo": "https://inmobiliariaacropolis.s3.us-east-1.amazonaws.com/hero/background_1763138435723_kFUv4S.mp4",
  "backgroundType": "video"
};
}
