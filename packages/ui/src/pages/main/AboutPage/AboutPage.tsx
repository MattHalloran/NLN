import { Box, Card, CardContent, Container, Divider, Grid, IconButton, Paper, Stack, Tooltip, Typography, useTheme, alpha } from "@mui/material";
import GianarisSignature from "assets/img/gianaris-signature.png";
import { InformationalTabOption, InformationalTabs } from "components/breadcrumbs/InformationalTabs/InformationalTabs";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { BusinessContext } from "contexts/BusinessContext";
import { FacebookIcon, InstagramIcon } from "icons";
import { useContext } from "react";

export const AboutPage = () => {
    const business = useContext(BusinessContext);
    const theme = useTheme();

    const SocialLink = ({ platform, Icon, url }: { platform: string; Icon: any; url: string }) => (
        <Tooltip title={`Follow us on ${platform}`} placement="top">
            <IconButton 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{
                    border: `1px solid ${theme.palette.grey[300]}`,
                    borderRadius: 1,
                    p: 1.5,
                    backgroundColor: 'white',
                    '&:hover': {
                        backgroundColor: theme.palette.grey[50],
                        borderColor: theme.palette.primary.main
                    },
                    transition: 'all 0.2s ease'
                }}
            >
                <Icon width="28px" height="28px" fill={theme.palette.grey[600]} />
            </IconButton>
        </Tooltip>
    );

    return (
        <>
            <TopBar
                display="page"
                hideTitleOnDesktop
                title="Our Story"
                below={<InformationalTabs defaultTab={InformationalTabOption.About} />}
            />
            <Box sx={{ minHeight: '100vh', width: '100%' }}>
                {/* Hero Section */}
                <Box
                    sx={{
                        backgroundColor: theme.palette.mode === 'light' ? '#f8f6f3' : '#1a1816',
                        py: 8,
                        position: 'relative',
                        width: '100%',
                        borderBottom: `1px solid ${theme.palette.mode === 'light' ? '#e2ddd6' : '#2a2622'}`
                    }}
                >
                    <Container maxWidth="lg">
                        <Stack direction="column" spacing={4} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                            <Box sx={{ textAlign: 'center', mb: 6 }}>
                                <Typography 
                                    variant="h1" 
                                    component="h1" 
                                    sx={{ 
                                        color: theme.palette.mode === 'light' ? '#2c4a2c' : '#e8e2d8',
                                        fontWeight: 400,
                                        mb: 3,
                                        fontSize: { xs: '2.5rem', md: '3.2rem', lg: '3.8rem' },
                                        fontFamily: 'serif',
                                        letterSpacing: '0.02em'
                                    }}
                                >
                                    Our Heritage
                                </Typography>
                                <Box 
                                    sx={{ 
                                        width: 80, 
                                        height: 3, 
                                        backgroundColor: theme.palette.mode === 'light' ? '#6b8e6b' : '#9bb89b', 
                                        mx: 'auto', 
                                        mb: 4 
                                    }} 
                                />
                                <Typography 
                                    variant="h4" 
                                    component="h2" 
                                    sx={{ 
                                        color: theme.palette.mode === 'light' ? '#5a6b5a' : '#c4bdb2',
                                        fontWeight: 300,
                                        fontSize: { xs: '1.3rem', md: '1.6rem' },
                                        maxWidth: '700px',
                                        mx: 'auto',
                                        lineHeight: 1.6,
                                        fontStyle: 'italic'
                                    }}
                                >
                                    Four Decades of Horticultural Excellence in Southern New Jersey
                                </Typography>
                            </Box>

                            {/* Statistics Section */}
                            <Grid container spacing={6} sx={{ mt: 2 }}>
                                <Grid item xs={12} sm={4}>
                                    <Box sx={{ textAlign: 'center', p: 4 }}>
                                        <Typography 
                                            variant="h2" 
                                            component="div" 
                                            sx={{ 
                                                fontWeight: 300, 
                                                color: theme.palette.mode === 'light' ? '#4a6b4a' : '#b8c7b8',
                                                mb: 2,
                                                fontFamily: 'serif',
                                                fontSize: { xs: '3rem', md: '3.5rem' }
                                            }}
                                        >
                                            40
                                        </Typography>
                                        <Typography 
                                            variant="subtitle1" 
                                            sx={{ 
                                                color: theme.palette.mode === 'light' ? '#6b7b6b' : '#a8a098',
                                                fontWeight: 400,
                                                letterSpacing: '0.1em',
                                                fontSize: '1.1rem'
                                            }}
                                        >
                                            Years of Experience
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Box sx={{ textAlign: 'center', p: 4 }}>
                                        <Typography 
                                            variant="h2" 
                                            component="div" 
                                            sx={{ 
                                                fontWeight: 300, 
                                                color: theme.palette.mode === 'light' ? '#4a6b4a' : '#b8c7b8',
                                                mb: 2,
                                                fontFamily: 'serif',
                                                fontSize: { xs: '3rem', md: '3.5rem' }
                                            }}
                                        >
                                            70+
                                        </Typography>
                                        <Typography 
                                            variant="subtitle1" 
                                            sx={{ 
                                                color: theme.palette.mode === 'light' ? '#6b7b6b' : '#a8a098',
                                                fontWeight: 400,
                                                letterSpacing: '0.1em',
                                                fontSize: '1.1rem'
                                            }}
                                        >
                                            Acres in Production
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Box sx={{ textAlign: 'center', p: 4 }}>
                                        <Typography 
                                            variant="h2" 
                                            component="div" 
                                            sx={{ 
                                                fontWeight: 300, 
                                                color: theme.palette.mode === 'light' ? '#4a6b4a' : '#b8c7b8',
                                                mb: 2,
                                                fontFamily: 'serif',
                                                fontSize: { xs: '3rem', md: '3.5rem' }
                                            }}
                                        >
                                            3-25
                                        </Typography>
                                        <Typography 
                                            variant="subtitle1" 
                                            sx={{ 
                                                color: theme.palette.mode === 'light' ? '#6b7b6b' : '#a8a098',
                                                fontWeight: 400,
                                                letterSpacing: '0.1em',
                                                fontSize: '1.1rem'
                                            }}
                                        >
                                            Gallon Sizes
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Stack>
                    </Container>
                </Box>

                {/* Main Content Area */}
                <Box sx={{ py: 10, backgroundColor: theme.palette.mode === 'light' ? '#ffffff' : '#0f0e0c', width: '100%' }}>
                <Container maxWidth="lg">
                    <Stack direction="column" spacing={6}>

                        {/* Featured Company Motto */}
                        <Box sx={{ mb: 8, textAlign: 'center' }}>
                            <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
                                <Typography 
                                    variant="h3" 
                                    component="blockquote" 
                                    sx={{ 
                                        fontStyle: 'italic', 
                                        textAlign: 'center',
                                        color: theme.palette.grey[800],
                                        fontWeight: 400,
                                        fontSize: { xs: '1.6rem', md: '2.2rem' },
                                        lineHeight: 1.5,
                                        mb: 3,
                                        fontFamily: 'serif',
                                        position: 'relative',
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            left: '-40px',
                                            top: '-20px',
                                            fontSize: '4rem',
                                            color: theme.palette.grey[300],
                                            fontFamily: 'serif'
                                        },
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            right: '-40px',
                                            bottom: '-20px',
                                            fontSize: '4rem',
                                            color: theme.palette.grey[300],
                                            fontFamily: 'serif'
                                        }
                                    }}
                                >
                                    Growing top quality material for buyers who are interested in the best.
                                </Typography>
                                <Divider sx={{ width: 200, mx: 'auto', mb: 2 }} />
                                <Typography 
                                    variant="subtitle1" 
                                    sx={{ 
                                        color: theme.palette.text.secondary,
                                        fontStyle: 'italic',
                                        letterSpacing: '0.05em'
                                    }}
                                >
                                    Our Founding Motto Since 1980
                                </Typography>
                            </Box>
                        </Box>

                        {/* Main Content Sections */}
                        <Grid container spacing={6}>
                            <Grid item xs={12} md={8}>
                                <Stack spacing={6}>
                                    {/* Family Legacy Section */}
                                    <Box 
                                        sx={{ 
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            '&:hover': {
                                                borderColor: theme.palette.grey[300]
                                            },
                                            transition: 'border-color 0.2s ease'
                                        }}
                                    >
                                        <Box sx={{ p: 6 }}>
                                            <Typography 
                                                variant="h4" 
                                                component="h3" 
                                                sx={{ 
                                                    color: theme.palette.grey[800],
                                                    fontWeight: 500,
                                                    fontSize: { xs: '1.6rem', md: '1.8rem' },
                                                    mb: 4,
                                                    fontFamily: 'serif',
                                                    borderBottom: `2px solid ${theme.palette.primary.main}`,
                                                    pb: 2,
                                                    display: 'inline-block'
                                                }}
                                            >
                                                Family Legacy
                                            </Typography>
                                            <Typography 
                                                variant="body1" 
                                                paragraph 
                                                sx={{ 
                                                    fontSize: '1.1rem', 
                                                    lineHeight: 1.8, 
                                                    color: theme.palette.text.primary
                                                }}
                                            >
                                                For <strong>four decades</strong>, New Life Nursery, Inc has been striving to grow the most beautiful, healthy, and consistent plant material at competitive prices. Family-owned and operated by the <strong>Gianaris Family</strong>, we continue to uphold the traditional values and horticultural expertise that built our reputation in the industry.
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Innovation Section */}
                                    <Box 
                                        sx={{ 
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            '&:hover': {
                                                borderColor: theme.palette.grey[300]
                                            },
                                            transition: 'border-color 0.2s ease'
                                        }}
                                    >
                                        <Box sx={{ p: 6 }}>
                                            <Typography 
                                                variant="h4" 
                                                component="h3" 
                                                sx={{ 
                                                    color: theme.palette.grey[800],
                                                    fontWeight: 500,
                                                    fontSize: { xs: '1.6rem', md: '1.8rem' },
                                                    mb: 4,
                                                    fontFamily: 'serif',
                                                    borderBottom: `2px solid ${theme.palette.primary.main}`,
                                                    pb: 2,
                                                    display: 'inline-block'
                                                }}
                                            >
                                                Innovation & Growth
                                            </Typography>
                                            <Typography 
                                                variant="body1" 
                                                paragraph 
                                                sx={{ 
                                                    fontSize: '1.1rem', 
                                                    lineHeight: 1.8, 
                                                    color: theme.palette.text.primary
                                                }}
                                            >
                                                As wholesale growers, we are always looking ahead to the next season with anticipation for new developments in horticulture. In addition to the established trees and shrubs you have come to expect from New Life Nursery, Inc, we continually evaluate and introduce new varieties to meet evolving market demands and provide our customers with the finest selection available.
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Facility Section */}
                                    <Box 
                                        sx={{ 
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            '&:hover': {
                                                borderColor: theme.palette.grey[300]
                                            },
                                            transition: 'border-color 0.2s ease'
                                        }}
                                    >
                                        <Box sx={{ p: 6 }}>
                                            <Typography 
                                                variant="h4" 
                                                component="h3" 
                                                sx={{ 
                                                    color: theme.palette.grey[800],
                                                    fontWeight: 500,
                                                    fontSize: { xs: '1.6rem', md: '1.8rem' },
                                                    mb: 4,
                                                    fontFamily: 'serif',
                                                    borderBottom: `2px solid ${theme.palette.primary.main}`,
                                                    pb: 2,
                                                    display: 'inline-block'
                                                }}
                                            >
                                                Our Facility
                                            </Typography>
                                            <Typography 
                                                variant="body1" 
                                                paragraph 
                                                sx={{ 
                                                    fontSize: '1.1rem', 
                                                    lineHeight: 1.8, 
                                                    color: theme.palette.text.primary,
                                                    mb: 5
                                                }}
                                            >
                                                With over <strong>seventy acres in production</strong>, New Life Nursery, Inc has the inventory capacity to meet your landscaping needs reliably and efficiently. All sizes, from 3-gallon shrubs to 25-gallon specimen trees, are cultivated here on our farm in <strong>Southern New Jersey</strong>, ensuring consistent quality and availability.
                                            </Typography>

                                            <Box 
                                                sx={{ 
                                                    p: 4, 
                                                    backgroundColor: theme.palette.grey[50],
                                                    border: `1px solid ${theme.palette.grey[200]}`
                                                }}
                                            >
                                                <Typography 
                                                    variant="h6" 
                                                    sx={{ 
                                                        textAlign: 'center',
                                                        color: theme.palette.grey[800],
                                                        mb: 3,
                                                        fontWeight: 500,
                                                        fontFamily: 'serif'
                                                    }}
                                                >
                                                    Ready to Get Started?
                                                </Typography>
                                                <Typography 
                                                    variant="body1" 
                                                    sx={{ 
                                                        fontSize: '1.05rem', 
                                                        textAlign: 'center',
                                                        color: theme.palette.text.primary,
                                                        lineHeight: 1.6
                                                    }}
                                                >
                                                    Browse our Availability List and contact us for more information, or to speak with one of our horticultural specialists at{' '}
                                                    <Box 
                                                        component="span" 
                                                        sx={{ 
                                                            fontWeight: 600, 
                                                            color: theme.palette.primary.main
                                                        }}
                                                    >
                                                        <a 
                                                            href={business?.PHONE?.Link} 
                                                            style={{ 
                                                                textDecoration: 'none', 
                                                                color: 'inherit',
                                                                borderBottom: `1px solid ${theme.palette.primary.main}`
                                                            }}
                                                        >
                                                            {business?.PHONE?.Label}
                                                        </a>
                                                    </Box>
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Stack>
                            </Grid>
                        
                            <Grid item xs={12} md={4}>
                                <Stack spacing={6}>
                                    {/* Quality Promise Card */}
                                    <Box 
                                        sx={{ 
                                            backgroundColor: theme.palette.grey[50],
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            '&:hover': {
                                                backgroundColor: theme.palette.grey[100]
                                            },
                                            transition: 'background-color 0.2s ease'
                                        }}
                                    >
                                        <Box sx={{ p: 5, textAlign: 'center' }}>
                                            <Typography 
                                                variant="h5" 
                                                component="h3" 
                                                gutterBottom 
                                                sx={{ 
                                                    color: theme.palette.grey[800], 
                                                    mb: 4,
                                                    fontWeight: 500,
                                                    fontFamily: 'serif',
                                                    fontSize: { xs: '1.4rem', md: '1.6rem' }
                                                }}
                                            >
                                                Quality Assurance
                                            </Typography>
                                            <Divider sx={{ width: 60, mx: 'auto', mb: 4, borderColor: theme.palette.primary.main }} />
                                            <Typography 
                                                variant="body1" 
                                                sx={{ 
                                                    mb: 4, 
                                                    color: theme.palette.text.primary,
                                                    fontSize: '1.05rem',
                                                    lineHeight: 1.7
                                                }}
                                            >
                                                We stand behind every plant we grow. Our commitment to horticultural excellence means you can trust in the health, vigor, and quality of our nursery stock.
                                            </Typography>
                                            <Box
                                                sx={{
                                                    display: 'inline-block',
                                                    px: 3,
                                                    py: 1,
                                                    border: `1px solid ${theme.palette.primary.main}`,
                                                    color: theme.palette.primary.main,
                                                    fontSize: '0.9rem',
                                                    fontWeight: 500,
                                                    letterSpacing: '0.05em'
                                                }}
                                            >
                                                Family Owned & Operated
                                            </Box>
                                        </Box>
                                    </Box>

                                    {/* Signature Card */}
                                    <Box 
                                        sx={{ 
                                            backgroundColor: 'white',
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            '&:hover': {
                                                borderColor: theme.palette.grey[300]
                                            },
                                            transition: 'border-color 0.2s ease'
                                        }}
                                    >
                                        <Box sx={{ p: 5, textAlign: 'center' }}>
                                            <Typography 
                                                variant="h5" 
                                                component="h3" 
                                                gutterBottom 
                                                sx={{ 
                                                    color: theme.palette.grey[800], 
                                                    mb: 4,
                                                    fontWeight: 500,
                                                    fontFamily: 'serif',
                                                    fontSize: { xs: '1.4rem', md: '1.6rem' }
                                                }}
                                            >
                                                With Warm Regards
                                            </Typography>
                                            <Box 
                                                sx={{ 
                                                    p: 3,
                                                    backgroundColor: theme.palette.grey[50],
                                                    border: `1px solid ${theme.palette.grey[200]}`,
                                                    mb: 3
                                                }}
                                            >
                                                <img 
                                                    src={GianarisSignature} 
                                                    alt="Gianaris Family Signature" 
                                                    style={{ 
                                                        maxWidth: '100%', 
                                                        height: 'auto',
                                                        filter: 'sepia(10%) contrast(1.1)'
                                                    }}
                                                />
                                            </Box>
                                            <Typography 
                                                variant="subtitle1" 
                                                sx={{ 
                                                    color: theme.palette.text.secondary, 
                                                    fontStyle: 'italic',
                                                    fontSize: '1.05rem',
                                                    letterSpacing: '0.02em'
                                                }}
                                            >
                                                The Gianaris Family
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Social Media Card */}
                                    <Box 
                                        sx={{ 
                                            backgroundColor: theme.palette.grey[50],
                                            border: `1px solid ${theme.palette.grey[200]}`,
                                            '&:hover': {
                                                backgroundColor: theme.palette.grey[100]
                                            },
                                            transition: 'background-color 0.2s ease'
                                        }}
                                    >
                                        <Box sx={{ p: 5, textAlign: 'center' }}>
                                            <Typography 
                                                variant="h5" 
                                                component="h3" 
                                                gutterBottom 
                                                sx={{ 
                                                    color: theme.palette.grey[800], 
                                                    mb: 4,
                                                    fontWeight: 500,
                                                    fontFamily: 'serif',
                                                    fontSize: { xs: '1.4rem', md: '1.6rem' }
                                                }}
                                            >
                                                Stay Connected
                                            </Typography>
                                            <Divider sx={{ width: 60, mx: 'auto', mb: 4, borderColor: theme.palette.primary.main }} />
                                            <Typography 
                                                variant="body1" 
                                                paragraph 
                                                sx={{ 
                                                    mb: 4, 
                                                    color: theme.palette.text.primary,
                                                    fontSize: '1.05rem',
                                                    lineHeight: 1.7
                                                }}
                                            >
                                                Follow our seasonal updates, horticultural insights, and latest arrivals from the nursery.
                                            </Typography>
                                            <Stack direction="row" spacing={2} justifyContent="center">
                                                <SocialLink platform="Facebook" Icon={FacebookIcon} url={business?.SOCIAL?.Facebook || ''} />
                                                <SocialLink platform="Instagram" Icon={InstagramIcon} url={business?.SOCIAL?.Instagram || ''} />
                                            </Stack>
                                        </Box>
                                    </Box>
                                </Stack>
                            </Grid>
                        </Grid>
                    </Stack>
                </Container>
                </Box>
            </Box>
        </>
    );
};
