import type { MetadataProps } from "../../lib/data";

// Using React cache to memoize the query
export const getMetadataProps = (): MetadataProps | null => {
  return {
  "mainpage": {
  "title": "Inmobiliaria Burgo Nuevo ",
  "description": "Pisos y Casas en León",
  "keywords": ["inmobiliaria", "León"],
  "robots": {
  "index": 1,
  "follow": 1,
  "googleBot": {
  "index": 1,
  "follow": 1,
  "max-snippet": -1,
  "max-image-preview": "large"
}
},
  "openGraph": {
  "title": "",
  "description": "",
  "type": "website",
  "locale": "es_ES",
  "siteName": "",
  "images": [{
  "url": "",
  "width": 1200,
  "height": 630,
  "alt": ""
}]
},
  "twitter": {
  "card": "summary_large_image",
  "title": "",
  "description": "",
  "images": [""]
},
  "alternates": {
  "canonical": "/"
}
}
};
}