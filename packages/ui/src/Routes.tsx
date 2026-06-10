import { APP_LINKS, ROLES } from "@local/shared";
import { Box, CircularProgress } from "@mui/material";
import { ScrollToTop } from "components/ScrollToTop/ScrollToTop";
import { lazy, Suspense, type ComponentType } from "react";
import { Route, Switch } from "route";
import { Page } from "./pages/Page/Page";

type LazyNamedComponent<TModule, TExport extends keyof TModule> =
    TModule[TExport] extends ComponentType<infer TProps> ? ComponentType<TProps> : never;

const lazyNamed = <TModule, TExport extends keyof TModule>(
    importer: () => Promise<TModule>,
    exportName: TExport,
) =>
    lazy(async () => {
        const module = await importer();
        return { default: module[exportName] as LazyNamedComponent<TModule, TExport> };
    });

// Lazy loading in the Routes component is a recommended way to improve performance. See https://reactjs.org/docs/code-splitting.html#route-based-code-splitting
const AboutPage = lazyNamed(() => import("./pages/main/AboutPage/AboutPage"), "AboutPage");
const FormPage = lazyNamed(() => import("./pages/main/FormPage/FormPage"), "FormPage");
const GalleryPage = lazyNamed(() => import("./pages/main/GalleryPage/GalleryPage"), "GalleryPage");
const HomePage = lazyNamed(() => import("./pages/main/HomePage/HomePage"), "HomePage");
const NotFoundPage = lazyNamed(
    () => import("./pages/main/NotFoundPage/NotFoundPage"),
    "NotFoundPage",
);
const ForgotPasswordForm = lazyNamed(
    () => import("./forms/ForgotPasswordForm/ForgotPasswordForm"),
    "ForgotPasswordForm",
);
const LogInForm = lazyNamed(() => import("./forms/LogInForm/LogInForm"), "LogInForm");
const ResetPasswordForm = lazyNamed(
    () => import("./forms/ResetPasswordForm/ResetPasswordForm"),
    "ResetPasswordForm",
);
const SignUpForm = lazyNamed(() => import("./forms/SignUpForm/SignUpForm"), "SignUpForm");
const AdminContactPage = lazyNamed(
    () => import("./pages/admin/AdminContactPage/AdminContactPage"),
    "AdminContactPage",
);
const AdminGalleryPage = lazyNamed(
    () => import("./pages/admin/AdminGalleryPage/AdminGalleryPage"),
    "AdminGalleryPage",
);
const AdminHomepageABTesting = lazyNamed(
    () => import("./pages/admin/AdminHomepageABTesting/AdminHomepageABTestingNew"),
    "AdminHomepageABTestingNew",
);
const AdminHomepageAbout = lazyNamed(
    () => import("./pages/admin/AdminHomepageAbout/AdminHomepageAbout"),
    "AdminHomepageAbout",
);
const AdminHomepageBranding = lazyNamed(
    () => import("./pages/admin/AdminHomepageBranding/AdminHomepageBranding"),
    "AdminHomepageBranding",
);
const AdminHomepageHeroBanner = lazyNamed(
    () => import("./pages/admin/AdminHomepageHeroBanner/AdminHomepageHeroBanner"),
    "AdminHomepageHeroBanner",
);
const AdminHomepageHub = lazyNamed(
    () => import("./pages/admin/AdminHomepageHub/AdminHomepageHub"),
    "AdminHomepageHub",
);
const AdminHomepageLocation = lazyNamed(
    () => import("./pages/admin/AdminHomepageLocation/AdminHomepageLocation"),
    "AdminHomepageLocation",
);
const AdminHomepageNewsletter = lazyNamed(
    () => import("./pages/admin/AdminHomepageNewsletter/AdminHomepageNewsletter"),
    "AdminHomepageNewsletter",
);
const AdminHomepageSeasonal = lazyNamed(
    () => import("./pages/admin/AdminHomepageSeasonal/AdminHomepageSeasonal"),
    "AdminHomepageSeasonal",
);
const AdminHomepageSections = lazyNamed(
    () => import("./pages/admin/AdminHomepageSections/AdminHomepageSections"),
    "AdminHomepageSections",
);
const AdminHomepageServices = lazyNamed(
    () => import("./pages/admin/AdminHomepageServices/AdminHomepageServices"),
    "AdminHomepageServices",
);
const AdminHomepageSocialProof = lazyNamed(
    () => import("./pages/admin/AdminHomepageSocialProof/AdminHomepageSocialProof"),
    "AdminHomepageSocialProof",
);
const AdminMainPage = lazyNamed(
    () => import("./pages/admin/AdminMainPage/AdminMainPage"),
    "AdminMainPage",
);
const AdminNewsletterSubscribers = lazyNamed(
    () => import("./pages/admin/AdminNewsletterSubscribers/AdminNewsletterSubscribers"),
    "AdminNewsletterSubscribers",
);
const AdminStoragePage = lazyNamed(
    () => import("./pages/admin/AdminStoragePage/AdminStoragePage"),
    "AdminStoragePage",
);
const AdminSystemLogs = lazyNamed(
    () => import("./pages/admin/AdminSystemLogs/AdminSystemLogs"),
    "AdminSystemLogs",
);
const PrivacyPolicyPage = lazyNamed(
    () => import("./pages/legal/PrivacyPolicyPage/PrivacyPolicyPage"),
    "PrivacyPolicyPage",
);
const TermsPage = lazyNamed(() => import("./pages/legal/TermsPage/TermsPage"), "TermsPage");

const Fallback = (
    <Box
        sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 100000,
        }}
    >
        <CircularProgress size={100} />
    </Box>
);

export const Routes = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ScrollToTop />
            <Switch>
                {/* START PUBLIC PAGES */}
                <Route path={APP_LINKS.Home} sitemapIndex priority={1.0} changeFreq="monthly">
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <HomePage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.About} sitemapIndex priority={0.7}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <AboutPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.PrivacyPolicy} sitemapIndex priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <PrivacyPolicyPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.Terms} sitemapIndex priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <TermsPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={`${APP_LINKS.Gallery}/:params*`} sitemapIndex priority={0.3}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <GalleryPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.Register} sitemapIndex priority={0.9}>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <FormPage title="Sign Up">
                                <SignUpForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route path={`${APP_LINKS.LogIn}/:params*`} sitemapIndex priority={0.8}>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <FormPage title="Log In">
                                <LogInForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route path={`${APP_LINKS.ForgotPassword}/:params*`} sitemapIndex priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <FormPage title="Forgot Password">
                                <ForgotPasswordForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route path={`${APP_LINKS.ResetPassword}/:params*`} sitemapIndex priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <FormPage title="Reset Password">
                                <ResetPasswordForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                {/* END PUBLIC PAGES */}
                {/* START ADMIN PAGES */}
                <Route path={APP_LINKS.Admin}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminMainPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminContactInfo}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminContactPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminGallery}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminGalleryPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepage}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageHub />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageSections}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageSections />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageABTesting}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageABTesting />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageAbout}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageAbout />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageHeroBanner}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageHeroBanner />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageSeasonal}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageSeasonal />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageNewsletter}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageNewsletter />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageServices}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageServices />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageSocialProof}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageSocialProof />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageLocation}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageLocation />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHomepageBranding}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomepageBranding />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminStorage}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminStoragePage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminNewsletterSubscribers}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminNewsletterSubscribers />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminLogs}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminSystemLogs />
                        </Page>
                    </Suspense>
                </Route>
                {/* END ADMIN PAGES */}
                {/* 404 page */}
                <Route>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <NotFoundPage />
                        </Page>
                    </Suspense>
                </Route>
            </Switch>
        </Suspense>
    );
};
