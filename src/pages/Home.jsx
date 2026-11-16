import { useEffect, useState } from 'react';
import { Link } from '../router';
import { useStore } from '../store';
import { api } from '../api';
import { contentFor, formatINR, slugify } from '../catalog';
import { ErrorBox, Icon, Loading, Stars } from '../components/ui';

export default function Home() {
  const { categories, catError, loading, city, packageCatalog } = useStore();
  const [pros, setPros] = useState([]);

  useEffect(() => {
    api.providers({ city }).then((p) => setPros([...p].sort((a, b) => b.rating - a.rating).slice(0, 4))).catch(() => setPros([]));
  }, [city]);

  return (
    <>
      <section className="home-hero">
        <div className="container">
          <h1>Home services you can trust, in <span className="hl">{city}</span></h1>
          <p className="lead">Deep cleaning, plumbing, electrical work and salon at home — by verified, top-rated professionals.</p>

          {loading && <Loading label="Loading services…" />}
          {catError && <ErrorBox message={catError} />}

          <div className="cat-grid">
            {categories.map((c) => {
              const ct = contentFor(c);
              const packages = packageCatalog[c.id]?.packages ?? [];
              const startsAt = packages.length ? Math.min(...packages.map((p) => p.unitPaise)) : null;
              return (
                <Link key={c.id} to={`/services/${slugify(c.name)}`} className="cat-tile" style={{ '--accent': ct.accent }}>
                  <span className="cat-icon"><Icon name={ct.icon} size={28} /></span>
                  <span className="cat-name">{c.name}</span>
                  {startsAt != null && <span className="cat-price">from {formatINR(startsAt / 100)}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container section">
        <h2>Why UrbanServe</h2>
        <div className="why-grid">
          {[
            ['shield', 'Verified professionals', 'Background-checked and trained partners.'],
            ['star', 'Top-rated, auto-assigned', 'We match you with the highest-rated pro available.'],
            ['clock', 'Slots that suit you', 'Pick a day and a 2-hour arrival window.'],
            ['check', 'Track every booking', 'See status anytime using your phone number.'],
          ].map(([icon, t, d]) => (
            <div key={t} className="why-card">
              <span className="why-icon"><Icon name={icon} /></span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {pros.length > 0 && (
        <section className="container section">
          <h2>Top professionals in {city}</h2>
          <div className="pro-grid">
            {pros.map((p) => (
              <div key={p.id} className="pro-card">
                <span className="avatar">{p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                <div>
                  <div className="pro-name">{p.name}</div>
                  <div className="pro-sub">{p.category?.name}</div>
                </div>
                <Stars value={p.rating} />
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
