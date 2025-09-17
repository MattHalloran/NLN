import { gql } from "@apollo/client";

export const landingPageContentQuery = gql`
    query LandingPageContent($onlyActive: Boolean) {
        landingPageContent(onlyActive: $onlyActive) {
            heroBanners {
                id
                src
                alt
                description
                width
                height
                displayOrder
                isActive
            }
            heroSettings {
                autoPlay
                autoPlayDelay
                showDots
                showArrows
                fadeTransition
            }
            seasonalPlants {
                id
                name
                description
                season
                careLevel
                icon
                displayOrder
                isActive
            }
            plantTips {
                id
                title
                description
                category
                season
                displayOrder
                isActive
            }
            settings {
                hero {
                    title
                    subtitle
                    description
                    businessHours
                    trustBadges {
                        icon
                        text
                    }
                    buttons {
                        text
                        link
                        type
                    }
                }
                newsletter {
                    title
                    description
                    disclaimer
                    isActive
                }
                companyInfo {
                    foundedYear
                    description
                }
                colors {
                    primary
                    secondary
                    accent
                }
                features {
                    showSeasonalContent
                    showNewsletter
                    showSocialProof
                    enableAnimations
                }
            }
            lastUpdated
        }
    }
`;

export const invalidateLandingPageCacheMutation = gql`
    mutation InvalidateLandingPageCache {
        invalidateLandingPageCache
    }
`;