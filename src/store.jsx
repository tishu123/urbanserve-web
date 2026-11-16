// Categories and prices come from the API. Only cart selections are persisted.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, session } from './api';
import { CITIES, findPackage, slugify } from './catalog';

const StoreCtx = createContext(null);

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

function withPaise(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid package list');

  return rows.map((row) => {
    const unitPaise = Math.round(row?.price * 100);
    if (typeof row?.code !== 'string' || typeof row.name !== 'string'
        || typeof row.price !== 'number' || !Number.isSafeInteger(unitPaise) || unitPaise <= 0) {
      throw new Error('Invalid package price');
    }
    return { ...row, unitPaise };
  });
}

export function StoreProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [catError, setCatError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(() => load('us.city', CITIES[0]));
  const [cart, setCart] = useState(() => load('us.cart', []));
  const [user, setUser] = useState(() => session.get());
  const [packageCatalog, setPackageCatalog] = useState({});
  const [priceLoad, setPriceLoad] = useState(0);

  useEffect(() => session.subscribe(setUser), []);

  useEffect(() => {
    api.categories()
      .then(setCategories)
      .catch((error) => setCatError(error.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    setPackageCatalog({});

    for (const category of categories) {
      api.packages(category.id)
        .then(withPaise)
        .then((packages) => {
          if (active) setPackageCatalog((current) => ({
            ...current, [category.id]: { status: 'ready', packages },
          }));
        })
        .catch(() => {
          if (active) setPackageCatalog((current) => ({
            ...current, [category.id]: { status: 'error', packages: [] },
          }));
        });
    }

    return () => { active = false; };
  }, [categories, priceLoad]);

  useEffect(() => save('us.cart', cart), [cart]);
  useEffect(() => save('us.city', city), [city]);

  const value = useMemo(() => {
    const byId = Object.fromEntries(categories.map((category) => [category.id, category]));
    const bySlug = Object.fromEntries(categories.map((category) => [slugify(category.name), category]));
    const lines = cart.map((line) => {
      const category = byId[line.categoryId];
      const entry = packageCatalog[line.categoryId];
      const pkg = entry?.packages.find((item) => item.code === line.packageId);
      const priceStatus = loading ? 'loading'
        : catError ? 'error'
        : !category ? 'unavailable'
        : (entry?.status ?? 'loading') !== 'ready' ? (entry?.status ?? 'loading')
        : pkg ? 'ready' : 'unavailable';

      return {
        ...line,
        category,
        name: pkg?.name || (category && findPackage(category, line.packageId)?.name) || line.packageId,
        priceStatus,
        totalPaise: priceStatus === 'ready' ? pkg.unitPaise * line.qty : null,
      };
    });

    const cartReady = lines.length > 0 && lines.every((line) => line.priceStatus === 'ready');
    const subtotalPaise = cartReady ? lines.reduce((sum, line) => sum + line.totalPaise, 0) : null;

    const qtyOf = (categoryId, packageId) =>
      cart.find((line) => line.categoryId === categoryId && line.packageId === packageId)?.qty || 0;

    const setQty = (categoryId, packageId, qty) =>
      setCart((previous) => {
        const rest = previous.filter((line) =>
          !(line.categoryId === categoryId && line.packageId === packageId));
        return qty > 0 ? [...rest, { categoryId, packageId, qty }] : rest;
      });

    return {
      categories, catError, loading, bySlug,
      city, setCity,
      packageCatalog,
      reloadPackagePrices: () => {
        setPackageCatalog({});
        setPriceLoad((current) => current + 1);
      },
      lines,
      cartReady,
      subtotalPaise,
      itemCount: lines.reduce((sum, line) => sum + line.qty, 0),
      qtyOf, setQty,
      clearCart: () => setCart([]),
      user,
      login: (tokenResponse) => session.set(tokenResponse),
      logout: () => session.set(null),
    };
  }, [categories, catError, loading, city, cart, user, packageCatalog]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
