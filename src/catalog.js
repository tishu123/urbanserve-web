// Front-end content for each backend ServiceCategory, matched by category name.
//
// The backend only stores name / description / basePrice per category. Package
// prices here are derived from basePrice (price = basePrice * factor), so changing
// basePrice in the backend moves every package price with it. When you add a
// Package entity to the backend, replace `factor` with the real price.

export const CITIES = ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune'];

export const TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

export const slugify = (s) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const packagePrice = (category, pkg) => {
  const raw = category.basePrice * pkg.factor;
  return Math.max(99, Math.round(raw / 10) * 10 - 1); // 1599-style pricing
};

export const formatINR = (n) =>
  '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const COMMON_HOW = [
  { title: 'Pick your package', text: 'Choose what you need and add it to your cart.' },
  { title: 'Choose a slot', text: 'Select a date and a 2-hour arrival window that suits you.' },
  { title: 'Expert arrives', text: 'A verified, top-rated professional is assigned to you.' },
  { title: 'Relax', text: 'Track your booking status anytime with your phone number.' },
];

const CONTENT = {
  'Home Cleaning': {
    icon: 'clean',
    accent: '#0f766e',
    headline: 'Occupied Home Deep Cleaning',
    tagline: 'Furniture-in deep cleaning by trained crews with machines and safe chemicals.',
    groups: [
      {
        title: 'Full home deep cleaning',
        packages: [
          { id: '1bhk', name: '1 BHK', factor: 4.4, duration: '4–5 hrs', crew: '2 cleaners',
            points: ['All rooms, kitchen & 1 bathroom', 'Floor scrubbing with machine', 'Cobweb & dust removal'] },
          { id: '2bhk', name: '2 BHK', factor: 5.6, duration: '5–6 hrs', crew: '3 cleaners', popular: true,
            points: ['All rooms, kitchen & 2 bathrooms', 'Windows, grills & balcony', 'Cabinet exteriors wiped'] },
          { id: '3bhk', name: '3 BHK', factor: 7.0, duration: '6–7 hrs', crew: '3–4 cleaners',
            points: ['All rooms, kitchen & 3 bathrooms', 'Windows, grills & balconies', 'Fans, lights & switchboards'] },
          { id: '4bhk', name: '4 BHK', factor: 8.6, duration: '7–8 hrs', crew: '4 cleaners',
            points: ['All rooms, kitchen & 4 bathrooms', 'Windows, grills & balconies', 'Fans, lights & switchboards'] },
          { id: 'villa', name: 'Independent house / Villa', factor: 11.5, duration: '8–10 hrs', crew: '5 cleaners',
            points: ['Up to 2,500 sq ft', 'Staircase & terrace sweep', 'Exterior entrance & parking'] },
        ],
      },
      {
        title: 'Add-ons',
        packages: [
          { id: 'kitchen', name: 'Kitchen deep cleaning', factor: 2.0, duration: '2–3 hrs', crew: '1 cleaner',
            points: ['Degreasing tiles & chimney exterior', 'Inside cabinets (emptied)'] },
          { id: 'bathroom', name: 'Bathroom deep cleaning', factor: 0.75, duration: '1 hr', crew: '1 cleaner',
            points: ['Hard-water stain removal', 'Fittings & tiles scrubbed'] },
          { id: 'sofa', name: 'Sofa shampooing (5 seats)', factor: 1.25, duration: '1–2 hrs', crew: '1 cleaner',
            points: ['Fabric shampoo & vacuum extraction', 'Dries in 4–6 hrs'] },
        ],
      },
    ],
    included: ['Dusting of all reachable surfaces', 'Floor scrubbing & mopping', 'Kitchen countertop & sink',
      'Bathroom tiles, fittings & mirrors', 'Doors, windows & grills', 'Fans & light fittings (reachable)'],
    excluded: ['Wall washing or painting', 'Inside of appliances', 'Carpet shampooing (book as add-on)',
      'Heavy furniture moving'],
    faqs: [
      { q: 'Do I need to empty the house?', a: 'No. Occupied home cleaning is done with your furniture in place. Please keep valuables and fragile items secured.' },
      { q: 'Do the cleaners bring their own equipment?', a: 'Yes. Crews carry scrubbing machines, vacuums, ladders and cleaning chemicals.' },
      { q: 'Are the chemicals safe for kids and pets?', a: 'We use diluted, non-toxic agents for most surfaces. Keep pets in a separate room during cleaning.' },
      { q: 'Can I reschedule?', a: 'Yes, cancel from My Bookings and book a new slot. Rescheduling in-app is coming soon.' },
    ],
  },
  Plumbing: {
    icon: 'plumb',
    accent: '#1d4ed8',
    headline: 'Plumbing Services',
    tagline: 'Leaks, taps, fittings and installations fixed by verified plumbers.',
    groups: [
      {
        title: 'Repairs & installation',
        packages: [
          { id: 'tap', name: 'Tap / mixer repair', factor: 1, duration: '30–45 min', points: ['Washer & cartridge replacement', 'Spare parts billed at MRP'] },
          { id: 'leak', name: 'Pipe leakage fix', factor: 1.25, duration: '45–60 min', popular: true, points: ['Concealed leak diagnosis', 'Joint sealing & small pipe replacement'] },
          { id: 'basin', name: 'Wash basin installation', factor: 1.75, duration: '1–2 hrs', points: ['Mounting, waste pipe & connections'] },
          { id: 'toilet', name: 'Toilet / flush repair', factor: 1.5, duration: '45–60 min', points: ['Flush tank, seat & blockage fixes'] },
          { id: 'tank', name: 'Water tank cleaning', factor: 3, duration: '2–3 hrs', points: ['Up to 1,000 L tank', 'Sludge removal & disinfection'] },
        ],
      },
    ],
    included: ['Inspection & diagnosis', 'Labour for the selected job', '30-day service warranty'],
    excluded: ['Spare parts & materials (billed separately)', 'Civil / masonry work'],
    faqs: [
      { q: 'Are spare parts included?', a: 'No. Parts are billed separately at MRP after your approval.' },
      { q: 'What if the job needs more time?', a: 'The plumber will share a revised estimate before starting any extra work.' },
    ],
  },
  Electrician: {
    icon: 'elec',
    accent: '#b45309',
    headline: 'Electrician Services',
    tagline: 'Wiring, fans, switches and fittings handled safely by certified electricians.',
    groups: [
      {
        title: 'Electrical jobs',
        packages: [
          { id: 'switch', name: 'Switch / socket repair', factor: 1, duration: '30 min', points: ['Up to 2 points', 'Faulty switch or socket replacement'] },
          { id: 'fan', name: 'Ceiling fan installation', factor: 1.25, duration: '45 min', popular: true, points: ['Fan mounting & regulator wiring'] },
          { id: 'light', name: 'Light fitting installation', factor: 1.1, duration: '30–45 min', points: ['Tube light, panel or decorative light'] },
          { id: 'mcb', name: 'MCB / fuse repair', factor: 1.5, duration: '45 min', points: ['Tripping diagnosis & replacement'] },
          { id: 'wiring', name: 'Home wiring inspection', factor: 2.5, duration: '1–2 hrs', points: ['Earthing & load check', 'Written report of issues'] },
        ],
      },
    ],
    included: ['Diagnosis', 'Labour for the selected job', '30-day service warranty'],
    excluded: ['Spare parts & materials', 'Concealed rewiring (quoted on inspection)'],
    faqs: [
      { q: 'Is the electrician certified?', a: 'All partners are verified and trained on safety procedures.' },
      { q: 'Do I need to buy the fan or light?', a: 'Yes, please keep the item ready. Installation charges cover labour only.' },
    ],
  },
  'Salon at Home': {
    icon: 'salon',
    accent: '#be185d',
    headline: 'Salon at Home',
    tagline: 'Salon-quality grooming at home with single-use, hygienic kits.',
    groups: [
      {
        title: 'Popular services',
        packages: [
          { id: 'haircut', name: 'Haircut & styling', factor: 1, duration: '45 min', points: ['Wash, cut & blow-dry'] },
          { id: 'facial', name: 'Signature facial', factor: 1.75, duration: '60 min', popular: true, points: ['Cleanse, scrub, massage & mask'] },
          { id: 'manipedi', name: 'Manicure + pedicure', factor: 1.5, duration: '75 min', points: ['Soak, scrub, nail shaping & polish'] },
          { id: 'wax', name: 'Full arms & legs waxing', factor: 1.3, duration: '45 min', points: ['Rica / honey wax options'] },
        ],
      },
    ],
    included: ['Single-use disposable kit', 'Professional products', 'Clean-up after service'],
    excluded: ['Hair colouring (coming soon)'],
    faqs: [
      { q: 'What do I need to arrange?', a: 'A well-lit space near a plug point and a chair. The professional brings everything else.' },
    ],
  },
};

const FALLBACK = (cat) => ({
  icon: 'generic',
  accent: '#0f766e',
  headline: cat.name,
  tagline: cat.description,
  groups: [
    {
      title: 'Packages',
      packages: [{ id: 'standard', name: `${cat.name} — standard visit`, factor: 1, duration: '1 hr', points: [cat.description] }],
    },
  ],
  included: ['Inspection', 'Labour for the selected job'],
  excluded: ['Materials (billed separately)'],
  faqs: [],
});

export function contentFor(category) {
  const c = CONTENT[category.name] || FALLBACK(category);
  return { howItWorks: COMMON_HOW, ...c };
}

export function findPackage(category, pkgId) {
  for (const g of contentFor(category).groups) {
    const p = g.packages.find((x) => x.id === pkgId);
    if (p) return p;
  }
  return null;
}
