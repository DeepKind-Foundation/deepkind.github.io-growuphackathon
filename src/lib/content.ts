import { createReader } from "@keystatic/core/reader";
import keystaticConfig from "../../keystatic.config";
import { PARTNER_IMAGES_PATH, PEOPLE_IMAGES_PATH } from "./admin/types";

const reader = createReader(process.cwd(), keystaticConfig);

/** All editorial copy for the single home page, read from the Keystatic singleton. */
export async function getHomeContent() {
  const home = await reader.singletons.home.read();
  if (!home) {
    throw new Error(
      "Home content singleton is missing at src/content/pages/home",
    );
  }
  return home;
}

/** Resolved shape of the home singleton (inferred from the Keystatic schema). */
export type HomeContent = NonNullable<
  Awaited<ReturnType<typeof reader.singletons.home.read>>
>;

/** A partner logo entry, with the logo resolved to a public image path. */
export interface PartnerLogo {
  slug: string;
  name: string;
  category: string;
  order: number;
  logo: string;
}

/** All partner logos, read from the `partnerLogos` collection. */
export async function getPartnerLogos(): Promise<PartnerLogo[]> {
  const all = await reader.collections.partnerLogos.all();
  return all.map(({ slug, entry }) => ({
    slug,
    name: entry.name,
    category: entry.category,
    order: entry.order ?? 0,
    logo: entry.logo ? `${PARTNER_IMAGES_PATH}${entry.logo}` : "",
  }));
}

/** A mentor/expert/trainer entry, with the photo resolved to a public image path. */
export interface PersonEntry {
  slug: string;
  name: string;
  group: string;
  order: number;
  role: string;
  bio: string;
  linkedin: string;
  photo: string;
}

/** All mentors/experts/trainers, read from the `people` collection. */
export async function getPeople(): Promise<PersonEntry[]> {
  const all = await reader.collections.people.all();
  return all.map(({ slug, entry }) => ({
    slug,
    name: entry.name,
    group: entry.group,
    order: entry.order ?? 0,
    role: entry.role,
    bio: entry.bio,
    linkedin: entry.linkedin,
    photo: entry.photo ? `${PEOPLE_IMAGES_PATH}${entry.photo}` : "",
  }));
}
