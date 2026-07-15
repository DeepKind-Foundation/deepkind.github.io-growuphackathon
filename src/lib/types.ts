import type { HomeContent } from "./content";

export type { HomeContent };

export type NavItem = HomeContent["nav"][number];
export type PathItem = HomeContent["paths"]["items"][number];
export type StageItem = HomeContent["stages"]["items"][number];
export type BenefitItem = HomeContent["benefits"]["items"][number];
export type AwardItem = HomeContent["benefits"]["awards"][number];
export type FaqItem = HomeContent["faq"]["items"][number];
export type OrganizerBlock = HomeContent["organizers"]["blocks"][number];
export type PartnerLogo = HomeContent["partners"]["logos"][number];
export type PartnerStat = HomeContent["partners"]["stats"][number];
export type PartnerBenefit = HomeContent["partners"]["benefits"][number];
