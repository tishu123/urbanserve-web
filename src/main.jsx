import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Router, useRouter, matchPath } from './router';
import { StoreProvider } from './store';
import { Header, Footer } from './components/ui';
import Home from './pages/Home';
import ServicePage from './pages/ServicePage';
import Checkout from './pages/Checkout';
import { MyBookings, BookingSuccess } from './pages/Bookings';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import Profile from './pages/Profile';
import './styles.css';

function Routes() {
  const { pathname } = useRouter();
  let m;
  if (pathname === '/') return <Home />;
  if ((m = matchPath('/services/:slug', pathname))) return <ServicePage key={m.slug} slug={m.slug} />;
  if (pathname === '/checkout') return <Checkout />;
  if (pathname === '/bookings') return <MyBookings />;
  if (pathname === '/booking-success') return <BookingSuccess />;
  if (pathname === '/login') return <Login />;
  if (pathname === '/profile') return <Profile />;
  return <NotFound />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <StoreProvider>
        <Header />
        <div className="page"><Routes /></div>
        <Footer />
      </StoreProvider>
    </Router>
  </StrictMode>
);
