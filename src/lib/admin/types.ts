/** The raw shape stored in src/content/partners/{slug}.json (as read/written via the GitHub API). */
export interface PartnerData {
  name: string;
  category: string;
  order: number;
  logo: string;
}

/** The raw shape stored in src/content/people/{slug}.json (as read/written via the GitHub API). */
export interface PersonData {
  name: string;
  group: string;
  order: number;
  role: string;
  bio: string;
  linkedin: string;
  photo: string;
}

/** Public URL prefix for partner logo files — matches keystatic.config.ts's `partnerLogos.logo` field publicPath. */
export const PARTNER_IMAGES_PATH = "/images/partners/";

/** Public URL prefix for people photo files — matches keystatic.config.ts's `people.photo` field publicPath. */
export const PEOPLE_IMAGES_PATH = "/images/people/";

/** Repo file path (no leading slash) for partner logo files — matches keystatic.config.ts's `partnerLogos.logo` field directory. */
export const PARTNER_IMAGES_DIR = "public/images/partners";

/** Repo file path (no leading slash) for people photo files — matches keystatic.config.ts's `people.photo` field directory. */
export const PEOPLE_IMAGES_DIR = "public/images/people";
