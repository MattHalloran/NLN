import {
    AnchorHTMLAttributes,
    cloneElement,
    createContext,
    createElement,
    Fragment,
    FunctionComponent,
    isValidElement,
    MouseEvent,
    ReactElement,
    ReactNode,
    Suspense,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
} from "react";
import makeMatcher, { DefaultParams, Match, MatcherFn } from "./matcher";
import { parseSearchParams } from "./searchParams";
import locationHook, {
    HookNavigationOptions,
    LocationHook,
    Path,
    SetLocation,
} from "./useLocation";

export type ExtractRouteOptionalParam<PathType extends Path> = PathType extends `${infer Param}?`
    ? { [k in Param]: string | undefined }
    : PathType extends `${infer Param}*`
      ? { [k in Param]: string | undefined }
      : PathType extends `${infer Param}+`
        ? { [k in Param]: string }
        : { [k in PathType]: string };

export type ExtractRouteParams<PathType extends string> = string extends PathType
    ? { [k in string]: string }
    : PathType extends `${infer _Start}:${infer ParamWithOptionalRegExp}/${infer Rest}`
      ? ParamWithOptionalRegExp extends `${infer Param}(${infer _RegExp})`
          ? ExtractRouteOptionalParam<Param> & ExtractRouteParams<Rest>
          : ExtractRouteOptionalParam<ParamWithOptionalRegExp> & ExtractRouteParams<Rest>
      : PathType extends `${infer _Start}:${infer ParamWithOptionalRegExp}`
        ? ParamWithOptionalRegExp extends `${infer Param}(${infer _RegExp})`
            ? ExtractRouteOptionalParam<Param>
            : ExtractRouteOptionalParam<ParamWithOptionalRegExp>
        : Record<string, never>;

export interface RouterProps {
    hook: LocationHook;
    base: Path;
    matcher: MatcherFn;
}

export type NavigationalProps = ({ to: Path; href?: never } | { href: Path; to?: never }) &
    HookNavigationOptions;

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & NavigationalProps;

/*
 * Part 1, Hooks API: useRouter, useRoute and useLocation
 */

// one of the coolest features of `createContext`:
// when no value is provided — default object is used.
// allows us to use the router context as a global ref to store
// the implicitly created router (see `useRouter` below)
const buildRouter = ({
    hook = locationHook,
    base = "",
    matcher = makeMatcher(),
} = {}): RouterProps => ({ hook, base, matcher });

const defaultRouter = buildRouter();
const RouterCtx = createContext<{ v: RouterProps }>({ v: defaultRouter });

export const useRouter = () => {
    return useContext(RouterCtx).v;
};

export const useLocation = (): [Path, SetLocation] => {
    const router = useRouter();
    return router.hook(router);
};

export const useRoute = <
    T extends DefaultParams | undefined = undefined,
    RoutePath extends Path = Path,
>(
    pattern: RoutePath,
): Match<T extends DefaultParams ? T : ExtractRouteParams<RoutePath>> => {
    const [path] = useLocation();
    return useRouter().matcher(pattern, path) as Match<
        T extends DefaultParams ? T : ExtractRouteParams<RoutePath>
    >;
};

// internal hook used by Link and Redirect in order to perform navigation
const useNavigate = (options: NavigationalProps) => {
    const [, navigate] = useLocation();

    return useCallback(() => {
        const to = "to" in options && options.to !== undefined ? options.to : options.href;
        const navOptions = { replace: options.replace };
        navigate(to, navOptions);
    }, [navigate, options]);
};

/*
 * Part 2, Low Carb Router API: Router, Route, Link, Switch
 */

export const Router: FunctionComponent<RouterProps & { children: ReactNode }> = (props) => {
    const { base, children, hook, matcher } = props;
    const value = useMemo(
        () => ({ v: buildRouter({ base, hook, matcher }) }),
        [base, hook, matcher],
    );

    return createElement(RouterCtx.Provider, {
        value,
        children,
    });
};

export type RouteProps = {
    /**
     * If sitemapIndex is true, this specifies the change frequency of the page
     */
    changeFreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
    children: ReactNode;
    component?: FunctionComponent<{ params: DefaultParams }>;
    match?: Match;
    path?: string;
    /**
     * If sitemapIndex is true, this specifies the priority of the page.
     */
    priority?: number;
    /**
     * Specifies if this route should be included in the sitemap
     */
    sitemapIndex?: boolean;
};

export const Route = ({ path, match, component, children }: RouteProps): JSX.Element | null => {
    const useRouteMatch = useRoute(path ?? "");

    // Store last and current url data in session storage, if not already stored
    useEffect(() => {
        // Get last stored data in sessionStorage
        const lastCurrentPath = sessionStorage.getItem("currentPath");
        const lastCurrentSearchParams = sessionStorage.getItem("currentSearchParams");
        // Store current data in sessionStorage if last data didn't exist
        if (!lastCurrentPath) sessionStorage.setItem("currentPath", window.location.pathname);
        if (!lastCurrentSearchParams)
            sessionStorage.setItem("currentSearchParams", JSON.stringify(parseSearchParams()));
    }, [path]);

    // `props.match` is present - Route is controlled by the Switch
    const [matches, params] = match || useRouteMatch;

    if (!matches) return null;

    // React-Router style `component` prop
    if (component) return createElement(component, { params });

    // support render prop or plain children
    const renderedChildren =
        typeof children === "function"
            ? (children as (params: DefaultParams) => ReactNode)(params)
            : children;

    return createElement(Fragment, null, renderedChildren);
};

export const Link = (props: LinkProps) => {
    const navigate = useNavigate(props);
    const { base } = useRouter();

    const { to, href = to, children, onClick } = props;

    const handleClick = useCallback(
        (event: MouseEvent<HTMLAnchorElement>) => {
            // ignores the navigation when clicked using right mouse button or
            // by holding a special modifier key: ctrl, command, win, alt, shift
            if (
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                event.shiftKey ||
                event.button !== 0
            )
                return;

            if (onClick) {
                onClick(event);
            }
            if (!event.defaultPrevented) {
                event.preventDefault();
                navigate();
            }
        },
        [navigate, onClick],
    );

    // wraps children in `a` if needed
    const extraProps = {
        // handle nested routers and absolute paths
        href: href && href[0] === "~" ? href.slice(1) : base + href,
        onClick: handleClick,
        to: null,
    };
    const jsx = isValidElement(children)
        ? children
        : createElement("a", props as AnchorHTMLAttributes<HTMLAnchorElement>);

    return cloneElement(jsx, extraProps);
};

/**
 * Recursively flattens an array
 * @param children
 * @returns
 */
const flattenChildren = (children: ReactNode | ReactNode[]): ReactNode[] => {
    if (!Array.isArray(children)) {
        return [children];
    }

    return children.flatMap((c) =>
        isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment
            ? flattenChildren(c.props.children)
            : flattenChildren(c),
    );
};

type SwitchProps = {
    children: JSX.Element | JSX.Element[];
    location?: string;
    /**
     * Suspense fallback to use when a route is being resolved, so we don't
     * have to specify it on every Route
     */
    fallback?: JSX.Element;
};

export const Switch = ({ children, location, fallback }: SwitchProps) => {
    const { matcher } = useRouter();
    const [originalLocation] = useLocation();

    for (const element of flattenChildren(children)) {
        let match: Match;

        if (
            isValidElement(element) &&
            // we don't require an element to be of type Route,
            // but we do require it to contain a truthy `path` prop.
            // this allows to use different components that wrap Route
            // inside of a switch, for example <AnimatedRoute />.
            (match = (element as ReactElement<RouteProps>).props.path
                ? matcher(
                      (element as ReactElement<RouteProps>).props.path ?? "",
                      location || originalLocation,
                  )
                : ([true, {}] as Match)) &&
            match[0]
        ) {
            // If there is a fallback, wrap the route in it
            if (fallback) {
                return createElement(
                    Suspense,
                    { fallback },
                    cloneElement(element as ReactElement<RouteProps>, { match }),
                );
            }
            // Otherwise, just return the route
            return cloneElement(element as ReactElement<RouteProps>, { match });
        }
    }

    return null;
};

export const Redirect = (props: NavigationalProps): JSX.Element | null => {
    const navigate = useNavigate(props);

    useLayoutEffect(() => {
        navigate();
    }, [navigate]);

    return null;
};

export default useRoute;
