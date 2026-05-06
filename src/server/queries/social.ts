

export type SocialLink = {
  platform: "facebook" | "twitter" | "instagram" | "linkedin" | "youtube";
  url: string;
};

export const getSocialLinks = (): SocialLink[] => {
  return [];
}