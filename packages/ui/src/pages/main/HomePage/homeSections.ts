import { DEFAULT_SECTION_CONFIGURATION } from "@local/shared";

export type HomeSectionConfig = typeof DEFAULT_SECTION_CONFIGURATION;

export const getEnabledHomeSections = (
    sectionConfig: HomeSectionConfig,
    sectionComponents: Record<string, unknown>,
) =>
    sectionConfig.order
        .filter((sectionId) => sectionConfig.enabled[sectionId])
        .filter((sectionId) => sectionComponents[sectionId]);
