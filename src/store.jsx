// App-wide state: catalog (from API), selected city, and cart (persisted locally).
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, session } from './api';
import { CITIES, findPackage, packagePrice, slugify } from './catalog';

const StoreCtx = createContext(null);

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
};

export function StoreProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [catError, setCatError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(() => load('us.city', CITIES[0]));
  // cart: [{ categoryId, packageId, qty }]
  const [cart, setCart] = useState(() => load('us.cart', []));
  const [user, setUser] = useState(() => session.get()); // { token, phone, roles, expiresAt }

  useEffect(() => session.subscribe(setUser), []);

  useEffect(() => {
    api.categories()
      .then(setCategories)
      .catch((e) => setCatError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => save('us.cart', cart), [cart]);
  useEffect(() => save('us.city', city), [city]);

  const value = useMemo(() => {
    const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
    const bySlug = Object.fromEntries(categories.map((c) => [slugify(c.name), c]));

    // Resolve cart lines against the live catalog (drops lines whose category/package vanished).
    const lines = cart
      .map((l) => {
        const category = byId[l.categoryId];
        const pkg = category && findPackage(category, l.packageId);
        if (!pkg) return null;
        const unit = packagePrice(category, pkg);
        return { ...l, category, pkg, unit, total: unit * l.qty };
      })
      .filter(Boolean);

    const qtyOf = (categoryId, packageId) =>
      cart.find((l) => l.categoryId === categoryId && l.packageId === packageId)?.qty || 0;

    const setQty = (categoryId, packageId, qty) =>
      setCart((prev) => {
        const rest = prev.filter((l) => !(l.categoryId === categoryId && l.packageId === packageId));
        return qty > 0 ? [...rest, { categoryId, packageId, qty }] : rest;
      });

    return {
      categories, catError, loading, byId, bySlug,
      city, setCity,
      lines,
      itemCount: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + l.total, 0),
      qtyOf, setQty,
      clearCart: () => setCart([]),
      user,
      login: (tokenResponse) => session.set(tokenResponse),
      logout: () => session.set(null),
    };
  }, [categories, catError, loading, city, cart, user]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export const useStore = () => useContext(StoreCtx);
