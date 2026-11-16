import { useEffect, useState } from 'react';
import { Link, useRouter } from '../router';
import { useStore } from '../store';
import { api } from '../api';
import { contentFor, formatINR } from '../catalog';
import { Accordion, CartSummary, ErrorBox, Icon, Loading, QtyControl, Stars } from '../components/ui';
import NotFound from './NotFound';

export default function ServicePage({ slug }) {
  const { bySlug, loading, catError, city, qtyOf, setQty, itemCount, subtotalPaise, packageCatalog, reloadPackagePrices } = useStore();
  const { navigate } = useRouter();
  const [pros, setPros] = useState(null);
  const category = bySlug[slug];

  useEffect(() => {
    if (!category) return;
    setPros(null);
    api.providers({ categoryId: category.id, city }).then(setPros).catch(() => setPros([]));
  }, [category?.id, city]);

  if (loading) return <div className="container section"><Loading /></div>;
  if (catError) return <div className="container section"><ErrorBox message={catError} /></div>;
  if (!category) return <NotFound />;

  const ct = contentFor(category);
  const entry = packageCatalog[category.id];
  const packages = entry?.packages ?? [];
  const byCode = new Map(packages.map((pkg) => [pkg.code, pkg]));
  const displayCodes = new Set(ct.groups.flatMap((group) => group.packages.map((pkg) => pkg.id)));
  const groups = ct.groups.map((group) => ({
    ...group,
    packages: group.packages.filter((pkg) => byCode.has(pkg.id)),
  })).filter((group) => group.packages.length > 0);
  const extra = packages.filter((pkg) => !displayCodes.has(pkg.code));
  if (extra.length) {
    groups.push({ title: 'Other packages', packages: extra.map((pkg) => ({ id: pkg.code, points: [] })) });
  }
  const startsAt = packages.length ? Math.min(...packages.map((pkg) => pkg.unitPaise)) : null;
  const avgRating = pros?.length ? pros.reduce((s, p) => s + p.rating, 0) / pros.length : null;

  return (
    <div style={{ '--accent': ct.accent }}>
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link> / <span>Services</span> / <b>{ct.headline}</b>
        </nav>
      </div>

      {/* ---------- Hero ---------- */}
      <section className="container svc-hero">
        <div className="svc-hero-text">
          <h1>{ct.headline} in {city}</h1>
          <p className="lead">{ct.tagline}</p>
          <div className="hero-meta">
            {avgRating != null && <span className="chip"><Stars value={avgRating} /> avg. pro rating</span>}
            {pros && <span className="chip"><Icon name="users" size={14} /> {pros.length} verified pro{pros.length === 1 ? '' : 's'} in {city}</span>}
            <span className="chip"><Icon name="shield" size={14} /> 30-day service warranty</span>
          </div>
          {startsAt != null && <div className="starts-at">Starts at <b>{formatINR(startsAt / 100)}</b></div>}
          <a href="#packages" className="btn btn-primary">View packages</a>
        </div>
        <div className="svc-hero-art" aria-hidden="true">
          <div className="art-circle"><Icon name={ct.icon} size={96} /></div>
          <div className="art-badge art-badge-1"><Icon name="shield" size={14} /> Verified pros</div>
          <div className="art-badge art-badge-2"><Icon name="clock" size={14} /> Same-week slots</div>
        </div>
      </section>

      {pros && pros.length === 0 && (
        <div className="container">
          <div className="notice">
            No professionals for {category.name} in {city} yet. You can still book — the top-rated pro for this service will be assigned.
          </div>
        </div>
      )}

      {/* ---------- Body ---------- */}
      <div className="container svc-layout">
        <main>
          <section id="packages" className="section-tight">
            {!entry && <Loading label="Loading package prices…" />}
            {entry?.status === 'error' && (
              <>
                <ErrorBox message="We couldn’t load package prices." />
                <button type="button" className="btn btn-outline" onClick={reloadPackagePrices}>Try again</button>
              </>
            )}
            {entry?.status === 'ready' && packages.length === 0 && (
              <p className="muted">No packages are available for this service right now.</p>
            )}
            {groups.map((g) => (
              <div key={g.title} className="pkg-group">
                <h2>{g.title}</h2>
                <div className="pkg-list">
                  {g.packages.map((p) => {
                    const pkg = byCode.get(p.id);
                    return (
                      <article key={p.id} className="pkg-card">
                        <div className="pkg-main">
                          <div className="pkg-title">
                            <h3>{pkg.name}</h3>
                            {p.popular && <span className="tag">Most booked</span>}
                          </div>
                          <div className="pkg-meta">
                            {p.duration && <span><Icon name="clock" size={14} /> {p.duration}</span>}
                            {p.crew && <span><Icon name="users" size={14} /> {p.crew}</span>}
                          </div>
                          <ul className="pkg-points">
                            {p.points.map((pt) => <li key={pt}>{pt}</li>)}
                          </ul>
                        </div>
                        <div className="pkg-side">
                          <div className="pkg-price">{formatINR(pkg.unitPaise / 100)}</div>
                          <QtyControl qty={qtyOf(category.id, p.id)} onChange={(q) => setQty(category.id, p.id, q)} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>

          <section className="section-tight two-col">
            <div className="card">
              <h3>What’s included</h3>
              <ul className="ticks">{ct.included.map((x) => <li key={x}><Icon name="check" size={16} />{x}</li>)}</ul>
            </div>
            <div className="card">
              <h3>Not included</h3>
              <ul className="ticks crosses">{ct.excluded.map((x) => <li key={x}><Icon name="cross" size={16} />{x}</li>)}</ul>
            </div>
          </section>

          <section className="section-tight">
            <h2>How it works</h2>
            <ol className="steps">
              {ct.howItWorks.map((s, i) => (
                <li key={s.title}><span className="step-n">{i + 1}</span><div><b>{s.title}</b><p>{s.text}</p></div></li>
              ))}
            </ol>
          </section>

          {pros && pros.length > 0 && (
            <section className="section-tight">
              <h2>Professionals in {city}</h2>
              <div className="pro-grid">
                {pros.map((p) => (
                  <div key={p.id} className="pro-card">
                    <span className="avatar">{p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                    <div><div className="pro-name">{p.name}</div><div className="pro-sub">{category.name}</div></div>
                    <Stars value={p.rating} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {ct.faqs.length > 0 && (
            <section className="section-tight">
              <h2>Frequently asked questions</h2>
              <Accordion items={ct.faqs} />
            </section>
          )}
        </main>

        <aside className="svc-aside">
          <div className="sticky">
            <CartSummary onCta={() => navigate('/checkout')} />
            <div className="card promise">
              <h4>UrbanServe promise</h4>
              <ul className="ticks">
                <li><Icon name="shield" size={16} />Verified professionals</li>
                <li><Icon name="check" size={16} />Re-work if you’re not satisfied</li>
                <li><Icon name="clock" size={16} />On-time arrival window</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {itemCount > 0 && (
        <div className="mobile-bar">
          <div><b>{subtotalPaise == null ? 'Check cart' : formatINR(subtotalPaise / 100)}</b><span>{itemCount} item{itemCount > 1 ? 's' : ''}</span></div>
          <button className="btn btn-primary" onClick={() => navigate('/checkout')}>View cart</button>
        </div>
      )}
    </div>
  );
}
