import { APP_LINKS, ROLES } from "@local/shared";
import { Box, CircularProgress } from "@mui/material";
import { ScrollToTop } from "components";
import { ForgotPasswordForm, LogInForm, ProfileForm, ResetPasswordForm, SignUpForm } from "forms";
import { Suspense } from "react";
import { lazily } from "react-lazily";
import { Route, Switch } from "route";
import { Page } from "./pages";

// Lazy loading in the Routes component is a recommended way to improve performance. See https://reactjs.org/docs/code-splitting.html#route-based-code-splitting
const {
    AboutPage,
    CartPage,
    FormPage,
    GalleryPage,
    HomePage,
    NotFoundPage,
    ShoppingPage,
} = lazily(() => import("./pages/main"));
const {
    AdminContactPage,
    AdminCustomerPage,
    AdminGalleryPage,
    AdminHeroPage,
    AdminHomePage,
    AdminMainPage,
    AdminInventoryPage,
    AdminOrderPage,
} = lazily(() => import("./pages/admin"));
const {
    PrivacyPolicyPage,
    TermsPage,
} = lazily(() => import("./pages/legal"));

const Fallback = <Box sx={{
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 100000,
}}>
    <CircularProgress size={100} />
</Box>;

export const Routes = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ScrollToTop />
            <Switch>
                {/* START PUBLIC PAGES */}
                <Route
                    path={APP_LINKS.Home}
                    sitemapIndex
                    priority={1.0}
                    changeFreq="monthly">
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <HomePage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.About}
                    sitemapIndex
                    priority={0.7}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <AboutPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.PrivacyPolicy}
                    sitemapIndex
                    priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <PrivacyPolicyPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.Terms}
                    sitemapIndex
                    priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <TermsPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.Gallery}/:params*`}
                    sitemapIndex
                    priority={0.3}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer>
                            <GalleryPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.Register}
                    sitemapIndex
                    priority={0.9}>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <FormPage title="Sign Up">
                                <SignUpForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.LogIn}/:params*`}
                    sitemapIndex
                    priority={0.8}>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <FormPage title="Log In">
                                <LogInForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.ForgotPassword}/:params*`}
                    sitemapIndex
                    priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <FormPage title="Forgot Password">
                                <ForgotPasswordForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.ResetPassword}/:params*`}
                    sitemapIndex
                    priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page>
                            <FormPage title="Reset Password">
                                <ResetPasswordForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                {/* END PUBLIC PAGES */}
                {/* START CUSTOMER PAGES */}
                <Route
                    path={APP_LINKS.Profile}
                    sitemapIndex
                    priority={0.4}>
                    <Suspense fallback={Fallback}>
                        <Page restrictedToRoles={Object.values(ROLES)}>
                            <FormPage title="Profile">
                                <ProfileForm />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.Shopping}/:params*`}
                    sitemapIndex
                    priority={0.9}>
                    <Suspense fallback={Fallback}>
                        <Page restrictedToRoles={Object.values(ROLES)} redirect={APP_LINKS.LogIn}>
                            <ShoppingPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.Cart}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={Object.values(ROLES)} redirect={APP_LINKS.LogIn}>
                            <CartPage />
                        </Page>
                    </Suspense>
                </Route>
                {/* END CUSTOMER PAGES */}
                {/* START ADMIN PAGES */}
                <Route
                    path={APP_LINKS.Admin}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminMainPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.AdminContactInfo}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminContactPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminCustomers}>
                    <Suspense fallback={Fallback}>
                        <Page restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminCustomerPage />
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
                <Route path={APP_LINKS.AdminHero}>
                    <Suspense fallback={Fallback}>
                        <Page excludePageContainer restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHomePage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminInventory}>
                    <Suspense fallback={Fallback}>
                        <Page restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminInventoryPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminOrders}>
                    <Suspense fallback={Fallback}>
                        <Page restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminOrderPage />
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
