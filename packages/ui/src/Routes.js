import PropTypes from 'prop-types';
import { Switch, Route } from 'react-router-dom';
import { USER_ROLES } from '@local/shared';
import { LINKS } from 'utils';
import { Sitemap } from 'Sitemap';
import {
    AboutPage,
    AdminContactPage,
    AdminCustomerPage,
    AdminGalleryPage,
    AdminHeroPage,
    AdminMainPage,
    AdminInventoryPage,
    AdminOrderPage,
    CartPage,
    FormPage,
    GalleryPage,
    HomePage,
    NotFoundPage,
    Page,
    PrivacyPolicyPage,
    ShoppingPage,
    TermsPage,
} from 'pages';
import {
    ForgotPasswordForm,
    LogInForm,
    ProfileForm,
    SignUpForm
} from 'forms';

function Routes({
    session,
    onSessionUpdate,
    business,
    roles,
    cart,
    onRedirect
}) {

    console.log('RENDERING ROUTES', business)

    const common = {
        onSessionUpdate: onSessionUpdate,
        onRedirect: onRedirect,
        roles: roles,
        business: business
    }

    const title = (page) => `${page} | ${business?.BUSINESS_NAME?.Short}`;

    return (
        <Switch>
            {/* START PUBLIC PAGES */}
            <Route
                path="/sitemap"
                component={Sitemap}
            />
            <Route
                exact
                path={LINKS.Home}
                sitemapIndex={true}
                priority={1.0}
                changefreq="monthly"
                render={() => (
                    <Page title={title('Home')} {...common}>
                        <HomePage />
                    </Page>
                )}
            />
            <Route
                exact
                path={LINKS.About}
                sitemapIndex={true}
                priority={0.7}
                render={() => (
                    <Page title={title('About')} {...common}>
                        <AboutPage {...common} />
                    </Page>
                )}
            />
            <Route
                exact
                path={LINKS.PrivacyPolicy}
                sitemapIndex={true}
                priority={0.1}
                render={() => (
                    <Page title={title('Privacy Policy')} {...common}>
                        <PrivacyPolicyPage />
                    </Page>
                )}
            />
            <Route
                exact
                path={LINKS.Terms}
                sitemapIndex={true}
                priority={0.1}
                render={() => (
                    <Page title={title('Terms & Conditions')} {...common}>
                        <TermsPage />
                    </Page>
                )}
            />
            <Route
                exact
                path={`${LINKS.Gallery}/:img?`}
                sitemapIndex={true}
                priority={0.3}
                render={() => (
                    <Page title={title('Gallery')} {...common}>
                        <GalleryPage />
                    </Page>
                )}
            />
            <Route
                exact
                path={LINKS.Register}
                sitemapIndex={true}
                priority={0.9}
                render={() => (
                    <Page title={title('Sign Up')} {...common}>
                        <FormPage title="Sign Up" maxWidth="700px">
                            <SignUpForm {...common} />
                        </FormPage>
                    </Page>
                )}
            />
            <Route
                exact
                path={`${LINKS.LogIn}/:code?`}
                sitemapIndex={true}
                priority={0.8}
                render={() => (
                    <Page title={title('Log In')} {...common}>
                        <FormPage title="Log In" maxWidth="700px">
                            <LogInForm {...common} />
                        </FormPage>
                    </Page>
                )}
            />
            <Route
                exact
                path={`${LINKS.ForgotPassword}/:code?`}
                sitemapIndex={true}
                priority={0.1}
                render={() => (
                    <Page title={title('Forgot Password')} {...common}>
                        <FormPage title="Forgot Password" maxWidth="700px">
                            <ForgotPasswordForm {...common} />
                        </FormPage>
                    </Page>
                )}
            />
            {/* END PUBLIC PAGES */}
            {/* START CUSTOMER PAGES */}
            <Route
                exact
                path={LINKS.Profile}
                sitemapIndex={true}
                priority={0.4}
                render={() => (
                    <Page title={title('Profile')} {...common} authRole={USER_ROLES.Customer}>
                        <FormPage title="Profile">
                            <ProfileForm {...common} />
                        </FormPage>
                    </Page>
                )}
            />
            <Route
                exact
                path={`${LINKS.Shopping}/:sku?`}
                sitemapIndex={true}
                priority={0.9}
                render={() => (
                    <Page title={title('Shop')} {...common} authRole={USER_ROLES.Customer} redirect={LINKS.LogIn}>
                        <ShoppingPage {...common} session={session} cart={cart} />
                    </Page>
                )}
            />
            <Route
                exact
                path={LINKS.Cart}
                render={() => (
                    <Page title={title('Cart')} {...common}>
                        <CartPage {...common} user_tag={session?.tag} cart={cart} />
                    </Page>
                )}
            />
            {/* END CUSTOMER PAGES */}
            {/* START ADMIN PAGES */}
            <Route
                exact
                path={LINKS.Admin}
                render={() => (
                    <Page title={title('Admin Portal')} {...common} authRole={USER_ROLES.Admin}>
                        <AdminMainPage />
                    </Page>
                )}
            />
            <Route
                exact
                path={LINKS.AdminContactInfo}
                render={() => (
                    <Page title={"Edit Contact Info"} {...common} authRole={USER_ROLES.Admin}>
                        <AdminContactPage business={business}/>
                    </Page>
                )}
            />
            <Route exact path={LINKS.AdminCustomers} render={() => (
                <Page title={"Customer Page"} {...common} authRole={USER_ROLES.Admin}>
                    <AdminCustomerPage />
                </Page>
            )} />
            <Route exact path={LINKS.AdminGallery} render={() => (
                <Page title={"Edit Gallery"} {...common} authRole={USER_ROLES.Admin}>
                    <AdminGalleryPage />
                </Page>
            )} />
            <Route exact path={LINKS.AdminHero} render={() => (
                <Page title={"Edit Hero"} {...common} authRole={USER_ROLES.Admin}>
                    <AdminHeroPage />
                </Page>
            )} />
            <Route exact path={LINKS.AdminInventory} render={() => (
                <Page title={"Edit Inventory Info"} {...common} authRole={USER_ROLES.Admin}>
                    <AdminInventoryPage />
                </Page>
            )} />
            <Route exact path={LINKS.AdminOrders} render={() => (
                <Page title={"Order Page"} {...common} authRole={USER_ROLES.Admin}>
                    <AdminOrderPage />
                </Page>
            )} />
            {/* END ADMIN PAGES */}
            {/* 404 page */}
            <Route
                render={() => (
                    <Page title={title('404')} {...common}>
                        <NotFoundPage />
                    </Page>
                )}
            />
        </Switch>
    );
}

Routes.propTypes = {
    session: PropTypes.object,
    onSessionUpdate: PropTypes.func.isRequired,
    roles: PropTypes.array,
    cart: PropTypes.object,
    onRedirect: PropTypes.func.isRequired,
}

export { Routes };