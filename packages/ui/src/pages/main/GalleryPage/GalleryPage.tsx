import { useQuery } from "@apollo/client";
import { IMAGE_SIZE } from "@local/shared";
import { 
    Box, 
    Container, 
    Typography, 
    Grid, 
    Card, 
    CardMedia, 
    CardContent,
    Chip,
    Dialog,
    DialogContent,
    IconButton,
    useTheme,
    alpha,
    Fade,
    Tabs,
    Tab,
    Paper,
    Divider
} from "@mui/material";
// Using inline SVG icons since @mui/icons-material may not be installed
const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
);

const ZoomInIcon = () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"/>
    </svg>
);
import { imagesByLabelQuery } from "api/query";
import { SnackSeverity } from "components";
import { InformationalTabOption, InformationalTabs } from "components/breadcrumbs/InformationalTabs/InformationalTabs";
import { TopBar } from "components/navigation/TopBar/TopBar";
import { NoImageIcon } from "icons";
import { useEffect, useState, useCallback } from "react";
import { PubSub, getImageSrc, getServerUrl } from "utils";

type ImageData = {
    id: string;
    alt: string;
    src: string;
    thumbnail: string;
    category: string;
    title: string;
    description?: string;
    featured?: boolean;
}

// Real image data is fetched from the GraphQL API

const categories = ["All", "Gallery"];

export const GalleryPage = () => {
    const theme = useTheme();
    const [images, setImages] = useState<ImageData[]>([]); // Start with empty array, will be populated from API
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
    
    // Query for gallery images from the API
    const { data: imageData, error } = useQuery(imagesByLabelQuery, { 
        variables: { input: { label: "gallery" } }
    });

    if (error) {
        PubSub.get().publishSnack({ 
            message: "Failed to load gallery images. Please try again later.", 
            severity: SnackSeverity.Error, 
            data: error 
        });
    }

    // Process image data from API
    useEffect(() => {
        if (!Array.isArray(imageData?.imagesByLabel)) {
            setImages([]);
            return;
        }
        setImages(imageData.imagesByLabel.map((data: any, index: number) => ({
            id: data.hash,
            alt: data.alt || `Gallery Image ${index + 1}`,
            src: `${getServerUrl()}/${getImageSrc(data)}`,
            thumbnail: `${getServerUrl()}/${getImageSrc(data, IMAGE_SIZE.M)}`,
            category: "Gallery", // Default category since the seeded data doesn't have categories
            title: data.alt || `Gallery Image ${index + 1}`,
            description: data.description || undefined,
            featured: index < 3 // Mark first 3 images as featured
        })));
    }, [imageData]);

    const filteredImages = selectedCategory === "All" 
        ? images 
        : images.filter(img => img.category === selectedCategory);

    const handleImageClick = (image: ImageData) => {
        setSelectedImage(image);
        setLightboxOpen(true);
    };

    const handleCloseLightbox = () => {
        setLightboxOpen(false);
    };

    const handleCategoryChange = (event: React.SyntheticEvent, newValue: string) => {
        setSelectedCategory(newValue);
    };

    const handleImageError = useCallback((imageId: string) => {
        setImageErrors(prev => new Set(prev).add(imageId));
    }, []);

    return (
        <>
            <TopBar
                display="page"
                hideTitleOnDesktop
                title="Gallery"
                below={<InformationalTabs defaultTab={InformationalTabOption.Gallery} />}
            />
            
            {/* Hero Section */}
            <Box
                sx={{
                    backgroundColor: theme.palette.grey[800],
                    py: 8,
                    width: '100%',
                    borderBottom: `4px solid ${theme.palette.primary.main}`,
                    mb: 6
                }}
            >
                <Container maxWidth="lg">
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography 
                            variant="h1" 
                            component="h1" 
                            sx={{ 
                                color: 'white',
                                fontWeight: 400,
                                mb: 3,
                                fontSize: { xs: '2.5rem', md: '3.2rem', lg: '3.8rem' },
                                fontFamily: 'serif',
                                letterSpacing: '0.02em'
                            }}
                        >
                            Our Collection
                        </Typography>
                        <Box 
                            sx={{ 
                                width: 80, 
                                height: 3, 
                                backgroundColor: theme.palette.primary.main, 
                                mx: 'auto', 
                                mb: 4 
                            }} 
                        />
                        <Typography 
                            variant="h4" 
                            component="h2" 
                            sx={{ 
                                color: theme.palette.grey[200],
                                fontWeight: 300,
                                fontSize: { xs: '1.3rem', md: '1.6rem' },
                                maxWidth: '700px',
                                mx: 'auto',
                                lineHeight: 1.6,
                                fontStyle: 'italic'
                            }}
                        >
                            Explore our extensive selection of trees, shrubs, and perennials cultivated with four decades of expertise
                        </Typography>
                    </Box>
                </Container>
            </Box>

            {/* Main Content */}
            <Container maxWidth="lg" sx={{ pb: 8 }}>
                {/* Category Filters */}
                <Box sx={{ mb: 6 }}>
                    <Paper 
                        elevation={0}
                        sx={{ 
                            borderBottom: `1px solid ${theme.palette.grey[300]}`,
                            backgroundColor: 'transparent'
                        }}
                    >
                        <Tabs 
                            value={selectedCategory} 
                            onChange={handleCategoryChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                '& .MuiTab-root': {
                                    fontWeight: 500,
                                    fontSize: '1.05rem',
                                    letterSpacing: '0.02em',
                                    color: theme.palette.grey[600],
                                    transition: 'all 0.2s ease',
                                    '&.Mui-selected': {
                                        color: theme.palette.primary.main
                                    },
                                    '&:hover': {
                                        color: theme.palette.grey[800]
                                    }
                                },
                                '& .MuiTabs-indicator': {
                                    height: 3,
                                    backgroundColor: theme.palette.primary.main
                                }
                            }}
                        >
                            {categories.map(category => (
                                <Tab key={category} label={category} value={category} />
                            ))}
                        </Tabs>
                    </Paper>
                </Box>

                {/* Gallery Stats */}
                <Box sx={{ mb: 5, textAlign: 'center' }}>
                    <Typography 
                        variant="body1" 
                        sx={{ 
                            color: theme.palette.text.secondary,
                            fontStyle: 'italic',
                            letterSpacing: '0.02em'
                        }}
                    >
                        Showing {filteredImages.length} of {images.length} items
                    </Typography>
                </Box>

                {/* Image Grid */}
                <Grid container spacing={4}>
                    {filteredImages.map((image) => (
                        <Grid item xs={12} sm={6} md={4} key={image.id}>
                            <Fade in timeout={500}>
                                <Card 
                                    sx={{ 
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        border: `1px solid ${theme.palette.grey[200]}`,
                                        overflow: 'hidden',
                                        position: 'relative',
                                        '&:hover': {
                                            borderColor: theme.palette.grey[400],
                                            '& .image-overlay': {
                                                opacity: 1
                                            },
                                            '& .MuiCardMedia-root': {
                                                transform: 'scale(1.05)'
                                            }
                                        }
                                    }}
                                    onClick={() => handleImageClick(image)}
                                    elevation={0}
                                >
                                    {image.featured && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 10,
                                                left: 10,
                                                zIndex: 2,
                                                backgroundColor: theme.palette.primary.main,
                                                color: 'white',
                                                px: 2,
                                                py: 0.5,
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                letterSpacing: '0.05em',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            Featured
                                        </Box>
                                    )}
                                    <Box sx={{ position: 'relative', paddingTop: '75%' }}>
                                        {imageErrors.has(image.id) ? (
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: theme.palette.grey[100]
                                                }}
                                            >
                                                <NoImageIcon 
                                                    style={{ 
                                                        width: '60%', 
                                                        height: '60%',
                                                        opacity: 0.3,
                                                        fill: theme.palette.grey[400]
                                                    }} 
                                                />
                                            </Box>
                                        ) : (
                                            <CardMedia
                                                component="img"
                                                image={image.thumbnail}
                                                alt={image.alt}
                                                onError={() => handleImageError(image.id)}
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    transition: 'transform 0.3s ease'
                                                }}
                                            />
                                        )}
                                        <Box
                                            className="image-overlay"
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                backgroundColor: alpha(theme.palette.common.black, 0.5),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0,
                                                transition: 'opacity 0.3s ease'
                                            }}
                                        >
                                            <ZoomInIcon />
                                        </Box>
                                    </Box>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography 
                                            variant="h6" 
                                            component="h3" 
                                            sx={{ 
                                                fontWeight: 500,
                                                mb: 1,
                                                fontFamily: 'serif',
                                                color: theme.palette.grey[800]
                                            }}
                                        >
                                            {image.title}
                                        </Typography>
                                        {image.description && (
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    color: theme.palette.text.secondary,
                                                    fontStyle: 'italic',
                                                    mb: 2
                                                }}
                                            >
                                                {image.description}
                                            </Typography>
                                        )}
                                        <Box
                                            sx={{
                                                display: 'inline-block',
                                                px: 2,
                                                py: 0.5,
                                                border: `1px solid ${theme.palette.grey[300]}`,
                                                color: theme.palette.grey[600],
                                                fontSize: '0.85rem',
                                                fontWeight: 500,
                                                letterSpacing: '0.02em'
                                            }}
                                        >
                                            {image.category}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Fade>
                        </Grid>
                    ))}
                </Grid>

                {/* Lightbox Dialog */}
                <Dialog
                    open={lightboxOpen}
                    onClose={handleCloseLightbox}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        sx: {
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            overflow: 'hidden'
                        }
                    }}
                >
                    <DialogContent sx={{ p: 0, position: 'relative' }}>
                        <IconButton
                            onClick={handleCloseLightbox}
                            sx={{
                                position: 'absolute',
                                right: 10,
                                top: 10,
                                backgroundColor: alpha(theme.palette.common.black, 0.5),
                                color: 'white',
                                zIndex: 2,
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.common.black, 0.7)
                                }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                        {selectedImage && (
                            <Box>
                                {imageErrors.has(selectedImage.id) ? (
                                    <Box
                                        sx={{
                                            width: '100%',
                                            height: '400px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: theme.palette.grey[100]
                                        }}
                                    >
                                        <NoImageIcon 
                                            style={{ 
                                                width: '200px', 
                                                height: '200px',
                                                opacity: 0.3,
                                                fill: theme.palette.grey[400]
                                            }} 
                                        />
                                    </Box>
                                ) : (
                                    <img
                                        src={selectedImage.src}
                                        alt={selectedImage.alt}
                                        onError={() => handleImageError(selectedImage.id)}
                                        style={{
                                            width: '100%',
                                            height: 'auto',
                                            display: 'block'
                                        }}
                                    />
                                )}
                                <Box
                                    sx={{
                                        backgroundColor: 'white',
                                        p: 3,
                                        borderTop: `3px solid ${theme.palette.primary.main}`
                                    }}
                                >
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            fontWeight: 500,
                                            mb: 1,
                                            fontFamily: 'serif'
                                        }}
                                    >
                                        {selectedImage.title}
                                    </Typography>
                                    {selectedImage.description && (
                                        <Typography 
                                            variant="body1" 
                                            sx={{ 
                                                color: theme.palette.text.secondary,
                                                fontStyle: 'italic'
                                            }}
                                        >
                                            {selectedImage.description}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>
            </Container>
        </>
    );
};