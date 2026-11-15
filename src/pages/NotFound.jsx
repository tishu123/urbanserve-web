import { Link } from '../router';

export default function NotFound() {
  return (
    <div className="container section narrow center">
      <h1>Page not found</h1>
      <p className="muted">The service you’re looking for doesn’t exist.</p>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </div>
  );
}
