import { Routes, Route, Link, useLocation } from 'react-router-dom';
import MapPage from './pages/MapPage';
import DetailPage from './pages/DetailPage';

function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="navbar-logo">P</div>
        <div className="navbar-title">
          Park<span>Sense</span>
        </div>
      </Link>
      <div className="navbar-status">
        <div className="status-dot"></div>
        <span>Live Monitoring</span>
      </div>
    </nav>
  );
}

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="page-content">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/lot/:lotName" element={<DetailPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
