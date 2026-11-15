# UrbanServe Web (React + Vite)

Customer-facing UI for the UrbanServe Spring Boot API: service catalog, service detail
page with packages and cart, checkout with date/slot picker, and booking tracking.

## Run

    # 1. backend (from the urbanserve folder)
    mvn clean package && java -jar target/urbanserve-0.0.1.jar     # :8080

    # 2. frontend
    npm install
    npm run dev                                                     # http://localhost:5173

Vite proxies `/api/*` to `localhost:8080`, so no CORS setup is needed in dev.

## Pages

| Route                      | What it does                                                        |
|----------------------------|---------------------------------------------------------------------|
| `/`                        | City picker + categories (`GET /api/categories`), top pros in city  |
| `/services/:slug`          | Service page: packages, add-ons, included/excluded, how it works, pros (`GET /api/providers`), FAQ, sticky cart |
| `/checkout`                | Contact details, date + 2-hr slot, optional pro choice → `POST /api/bookings` |
| `/booking-success?ids=…`   | Confirmation (`GET /api/bookings/{id}`)                             |
| `/login?next=…`            | Phone OTP login (`POST /api/auth/otp/request` → `/verify`), stores the JWT |
| `/bookings`                | Your bookings (`GET /api/bookings`, token required), cancel (`PATCH …/status`) |

Checkout and My bookings require login; the cart survives the login detour. The JWT is kept in
`localStorage` and sent as `Authorization: Bearer …`; a 401 logs the user out. In local dev the OTP
is printed in the Spring Boot log (`[DEV OTP] … code=123456`).

Slugs come from category names (`Home Cleaning` → `/services/home-cleaning`).

## Where things live

    src/api.js          API client (set VITE_API_BASE for a non-proxied backend)
    src/catalog.js      Per-category content: packages, inclusions, FAQs, accent colour
    src/store.jsx       Categories, selected city, cart (persisted in localStorage)
    src/router.jsx      Tiny history router (no extra dependency)
    src/components/ui.jsx  Header, footer, cart summary, accordion, etc.
    src/pages/*         Home, ServicePage, Checkout, Bookings, NotFound

## How it maps to the current backend (and gaps to close)

- **Package prices are front-end only.** The API has one `basePrice` per category, so
  `catalog.js` derives package prices as `basePrice × factor`. Add a `ServicePackage`
  entity + endpoint and replace `factor` with the real price.
- **One booking per category.** `BookingRequest` takes a single `categoryId`, so a cart with
  Cleaning + Plumbing creates two bookings. Selected packages/quantities aren't stored
  server-side yet — add `items` and `totalAmount` to `Booking` when ready.
- **Address** is sent as `"<address>, <city>"` since `Booking` has no city field.
- **Error messages:** add `server.error.include-message=always` to `application.properties`
  so the UI shows messages like "Provider does not offer this service" instead of a status code.
- **Production on a separate origin:** copy `backend-additions/CorsConfig.java` into the
  backend and set `VITE_API_BASE` at build time.
- Not built yet (needs backend support): login/OTP, payments, reviews, real availability slots.
