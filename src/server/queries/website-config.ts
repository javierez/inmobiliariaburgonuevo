

export type LinkItem = {
  title: string;
  url: string;
};

export type LinkCategory = {
  name: string;
  links: LinkItem[];
};

export const getLinksProps = (): LinkCategory[] => {
  return [];
}

export type PropertiesConfig = {
  title: string;
  subtitle: string;
  buttonText: string;
  itemsPerPage?: number;
  defaultSort?: string;
};

export const getPropertiesConfig = (): PropertiesConfig => {
  return {
  "title": "Nuestras propiedades",
  "subtitle": "Encuentra tu opción ideal",
  "buttonText": "Ver Todas"
};
}

export type SEOConfig = {
  title: string;
  description: string;
  name?: string;
  image?: string;
  url?: string;
  telephone?: string;
  email?: string;
  keywords?: string[] | string; // Support both array and string formats
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogSiteName?: string;
  ogLocale?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
};

export type ModulesConfig = {
  promotionsEnabled: boolean;
};

export const getModulesConfig = (): ModulesConfig => {
  return {
  "promotionsEnabled": false
};
}

export const getSEOConfig = (): SEOConfig => {
  return {
  "title": "Inmobiliaria Burgo Nuevo - Alquiler y venta de pisos en León",
  "description": "Encuentra las mejores oportunidades del mercado en León",
  "keywords": "león, casas, inmobiliaria, pisos, alquiler, venta"
};
}
