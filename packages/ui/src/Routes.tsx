import { Suspense } from 'react';
import { lazily } from 'react-lazily';
import { Route, Switch } from '@shared/route';
import { APP_LINKS, ROLES } from '@shared/consts';
import {
    ForgotPasswordForm,
    LogInForm,
    ProfileForm,
    ResetPasswordForm,
    SignUpForm
} from 'forms';
import { ScrollToTop } from 'components';
import { Page } from './pages';
import { Box, CircularProgress } from '@mui/material';

// Lazy loading in the Routes component is a recommended way to improve performance. See https://reactjs.org/docs/code-splitting.html#route-based-code-splitting
const {
    AboutPage,
    CartPage,
    FormPage,
    GalleryPage,
    HomePage,
    NotFoundPage,
    ShoppingPage
} = lazily(() => import('./pages/main'));
const {
    AdminContactPage,
    AdminCustomerPage,
    AdminGalleryPage,
    AdminHeroPage,
    AdminMainPage,
    AdminInventoryPage,
    AdminOrderPage,
} = lazily(() => import('./pages/admin'));
const {
    PrivacyPolicyPage,
    TermsPage,
} = lazily(() => import('./pages/legal'));

const Fallback = <Box sx={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 100000,
}}>
    <CircularProgress size={100} />
</Box>

export const Routes = ({
    session,
    onSessionUpdate,
    business,
    userRoles,
    cart,
    onRedirect
}) => {

    const common = {
        sessionChecked: session !== null && session !== undefined,
        onSessionUpdate: onSessionUpdate,
        onRedirect: onRedirect,
        userRoles: userRoles,
        business: business
    }

    const title = (page) => `${page} | ${business?.BUSINESS_NAME?.Short}`;

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
                        <Page title={title('Home')} {...common}>
                            <HomePage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.About}
                    sitemapIndex
                    priority={0.7}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('About')} {...common}>
                            <AboutPage {...common} />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.PrivacyPolicy}
                    sitemapIndex
                    priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Privacy Policy')} {...common}>
                            <PrivacyPolicyPage business={business} />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.Terms}
                    sitemapIndex
                    priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Terms & Conditions')} {...common}>
                            <TermsPage business={business} />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.Gallery}/:params*`}
                    sitemapIndex
                    priority={0.3}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Gallery')} {...common}>
                            <GalleryPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.Register}
                    sitemapIndex
                    priority={0.9}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Sign Up')} {...common}>
                            <FormPage title="Sign Up">
                                <SignUpForm {...common} />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.LogIn}/:params*`}
                    sitemapIndex
                    priority={0.8}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Log In')} {...common}>
                            <FormPage title="Log In">
                                <LogInForm {...common} />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.ForgotPassword}/:params*`}
                    sitemapIndex
                    priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Forgot Password')} {...common}>
                            <FormPage title="Forgot Password">
                                <ForgotPasswordForm {...common} />
                            </FormPage>
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={`${APP_LINKS.ResetPassword}/:params*`}
                    sitemapIndex
                    priority={0.1}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Reset Password')} {...common}>
                            <FormPage title="Reset Password">
                                <ResetPasswordForm {...common} />
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
                        <Page title={title('Profile')} {...common} restrictedToRoles={Object.values(ROLES)}>
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
                        <Page title={title('Shop')} {...common} restrictedToRoles={Object.values(ROLES)} redirect={APP_LINKS.LogIn}>
                            <ShoppingPage {...common} session={session} cart={cart} />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.Cart}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Cart')} {...common} restrictedToRoles={Object.values(ROLES)} redirect={APP_LINKS.LogIn}>
                            <CartPage {...common} cart={cart} />
                        </Page>
                    </Suspense>
                </Route>
                {/* END CUSTOMER PAGES */}
                {/* START ADMIN PAGES */}
                <Route
                    path={APP_LINKS.Admin}>
                    <Suspense fallback={Fallback}>
                        <Page title={title('Manage Site')} {...common} restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminMainPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route
                    path={APP_LINKS.AdminContactInfo}>
                    <Suspense fallback={Fallback}>
                        <Page title={"Edit Contact Info"} {...common} restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminContactPage business={business} />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminCustomers}>
                    <Suspense fallback={Fallback}>
                        <Page title={"Customer Page"} {...common} restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminCustomerPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminGallery}>
                    <Suspense fallback={Fallback}>
                        <Page title={"Edit Gallery"} {...common} restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminGalleryPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminHero}>
                    <Suspense fallback={Fallback}>
                        <Page title={"Edit Hero"} {...common} restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminHeroPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminInventory}>
                    <Suspense fallback={Fallback}>
                        <Page title={"Edit Inventory Info"} {...common} restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminInventoryPage />
                        </Page>
                    </Suspense>
                </Route>
                <Route path={APP_LINKS.AdminOrders}>
                    <Suspense fallback={Fallback}>
                        <Page title={"Order Page"} {...common} restrictedToRoles={[ROLES.Owner, ROLES.Admin]}>
                            <AdminOrderPage userRoles={userRoles} />
                        </Page>
                    </Suspense>
                </Route>
                {/* END ADMIN PAGES */}
                {/* 404 page */}
                <Route>
                    <Suspense fallback={Fallback}>
                        <Page title={title('404')} {...common}>
                            <NotFoundPage />
                        </Page>
                    </Suspense>
                </Route>
            </Switch>
        </Suspense>
    );
}