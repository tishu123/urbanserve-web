// Tiny history-API router (keeps the app dependency-free beyond React).
// Swap for react-router-dom later if you need nested routes/loaders.
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const RouterCtx = createContext(null);

export function Router({ children }) {
  const [loc, setLoc] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));

  useEffect(() => {
    const onPop = () =>
      setLoc({ pathname: window.location.pathname, search: window.location.search });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (replace) window.history.replaceState({}, '', to);
    else window.history.pushState({}, '', to);
    const url = new URL(to, window.location.origin);
    setLoc({ pathname: url.pathname, search: url.search });
    window.scrollTo(0, 0);
  }, []);

  return <RouterCtx.Provider value={{ ...loc, navigate }}>{children}</RouterCtx.Provider>;
}

export const useRouter = () => useContext(RouterCtx);

export function useQuery() {
  const { search } = useRouter();
  return new URLSearchParams(search);
}

export function Link({ to, onClick, children, ...rest }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** matchPath('/services/:slug', '/services/home-cleaning') -> { slug: 'home-cleaning' } | null */
export function matchPath(pattern, pathname) {
  const p = pattern.split('/').filter(Boolean);
  const s = pathname.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}
