import React, { useEffect, useState, useRef } from "react";
import "../styles/LandingPage.css";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Home, Menu, X, Info } from "lucide-react";

function LandingPage() {
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const sidebarRef = useRef(null);

  // Use environment variable or fallback to Render URL
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://rentahanan.onrender.com";

  useEffect(() => {
    // Fetch houses from Render API
    fetch(`${API_BASE}/api/houses`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // Filter only available properties
        const availableHouses = data.filter(house => 
          house.status && house.status.toLowerCase() === 'available'
        );
        setHouses(availableHouses);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching houses:", err);
        setError("Failed to load properties. Please try again later.");
        setLoading(false);
      });
  }, [API_BASE]);

  // Swipe detection for mobile sidebar
  useEffect(() => {
    const handleTouchStart = (e) => {
      setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
      setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50; // Minimum swipe distance
      
      if (isLeftSwipe && touchStart < 50) { // Swipe from left edge
        setIsMobileMenuOpen(true);
      }
      
      if (distance < -50 && isMobileMenuOpen) { // Swipe right to close
        setIsMobileMenuOpen(false);
      }
      
      setTouchStart(null);
      setTouchEnd(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, touchEnd, isMobileMenuOpen]);

  // Function to get image URL - handles both local and Cloudinary URLs
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/400x300/4A5568/FFFFFF?text=No+Image+Available";
    
    // If it's already a full URL (Cloudinary), use it directly
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it's a local path, use the Render backend
    return `${API_BASE}/uploads/houseimages/${imagePath}`;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Tooltip component
  const Tooltip = ({ text, children }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <div 
        className="tooltip-container-Layout"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onTouchStart={() => setShowTooltip(!showTooltip)}
      >
        {children}
        {showTooltip && (
          <div className="tooltip-Layout">
            {text}
            <div className="tooltip-arrow-Layout"></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="landing-container-Layout">
      {/* Navbar */}
      <nav className="navbar-Layout">
        {/* Mobile Hamburger Menu */}
        <div className="mobile-menu-toggle-Layout" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </div>
        
        {/* Brand */}
        <div className="nav-brand-container-Layout">
          <img
            src="/logo.png"
            alt="RenTahanan Logo"
            className="logo-Layout"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/50x50/4A5568/FFFFFF?text=R";
            }}
          />
          <div className="nav-brand-text-Layout">RenTahanan</div>
        </div>
        
        {/* Desktop Navigation */}
        <div className="nav-links-Layout desktop-nav-Layout">
          <Link to="/login" className="nav-btn-Layout login-btn-Layout">Login</Link>
          <Link to="/register" className="nav-btn-Layout register-btn-Layout">Register</Link>
        </div>

        {/* Mobile Sidebar Navigation */}
        <div 
          ref={sidebarRef}
          className={`mobile-nav-sidebar-Layout ${isMobileMenuOpen ? 'mobile-nav-open-Layout' : ''}`}
        >
          <div className="mobile-nav-header-Layout">
            <div className="mobile-nav-brand-container-Layout">
              <img
                src="/logo.png"
                alt="RenTahanan Logo"
                className="logo-Layout"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/50x50/4A5568/FFFFFF?text=R";
                }}
              />
              <div className="nav-brand-text-Layout">RenTahanan</div>
            </div>
          </div>
          <div className="mobile-nav-links-Layout">
            <Link to="/login" className="mobile-nav-btn-Layout mobile-login-btn-Layout" onClick={closeMobileMenu}>
              Login
            </Link>
            <Link to="/register" className="mobile-nav-btn-Layout mobile-register-btn-Layout" onClick={closeMobileMenu}>
              Register
            </Link>
          </div>
          <div className="mobile-nav-swipe-hint-Layout">
            <p>Swipe right to close</p>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-nav-overlay-Layout" onClick={closeMobileMenu}></div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="hero-section-Layout">
        <div className="hero-overlay-Layout"></div>
        <div className="hero-content-Layout">
          <h1 className="hero-title-Layout">Discover Your New Home</h1>
          <p className="hero-subtitle-Layout">Helping renters find their perfect fit.</p>
          <Tooltip text="Swipe from left edge to open menu">
            <div className="swipe-hint-Layout">
              <Info size={16} />
              <span>Mobile Tip: Swipe from left</span>
            </div>
          </Tooltip>
        </div>
      </section>

      {/* Houses Section */}
      <section className="houses-section-Layout">
        <h2 className="section-title-Layout">
          Available Properties
          <Tooltip text="Tap on any property to view details">
            <Info size={18} className="section-info-icon-Layout" />
          </Tooltip>
        </h2>
        
        {loading && (
          <div className="loading-message-Layout">
            <div className="loading-spinner-Layout"></div>
            <p>Loading properties...</p>
          </div>
        )}
        
        {error && (
          <div className="error-message-Layout">
            <p>{error}</p>
            <button className="retry-btn-Layout" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        )}
        
        <div className="houses-container-Layout">
          {houses.map((house) => (
            <div
              key={house.unitid || house.id}
              className="house-card-Layout"
              onClick={() => setSelectedHouse(house)}
            >
              <div className="house-image-container-Layout">
                <img
                  src={getImageUrl(house.imagepath)}
                  alt={house.name}
                  className="house-image-Layout"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/400x300/4A5568/FFFFFF?text=No+Image+Available";
                  }}
                />
                <div className="house-overlay-Layout">
                  <span>Tap to View Details</span>
                </div>
              </div>
              <div className="house-info-Layout">
                <h3 className="house-name-Layout">{house.name}</h3>
                <p className="house-price-Layout">₱{parseFloat(house.price).toLocaleString()}/month</p>
                <p className={`house-status-Layout status-${house.status?.toLowerCase()}-Layout`}>
                  {house.status}
                </p>
              </div>
            </div>
          ))}
        </div>

        {houses.length === 0 && !loading && !error && (
          <div className="no-properties-Layout">
            <p>No properties available at the moment.</p>
            <p className="no-properties-subtitle-Layout">Check back later for new listings</p>
          </div>
        )}

        {/* Popup Modal */}
        {selectedHouse && (
          <div className="modal-overlay-Layout" onClick={() => setSelectedHouse(null)}>
            <div className="modal-content-Layout" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close-btn-Layout"
                onClick={() => setSelectedHouse(null)}
              >
                <X size={24} />
              </button>
              <img
                src={getImageUrl(selectedHouse.imagepath)}
                alt={selectedHouse.name}
                className="modal-image-Layout"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/500x300/4A5568/FFFFFF?text=No+Image+Available";
                }}
              />
              <h2 className="modal-title-Layout">{selectedHouse.name}</h2>
              <p className="modal-description-Layout">{selectedHouse.description}</p>
              <div className="modal-details-Layout">
                <p className="modal-price-Layout">
                  <strong>₱{parseFloat(selectedHouse.price).toLocaleString()}</strong> / month
                </p>
                <p className="modal-status-Layout">
                  Status: <strong>{selectedHouse.status}</strong>
                </p>
              </div>
              <button
                className="close-btn-Layout"
                onClick={() => setSelectedHouse(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="features-section-Layout">
        <h2 className="section-title-Layout">
          Why Choose RENTAHANAN?
          <Tooltip text="All features designed for easy mobile use">
            <Info size={18} className="section-info-icon-Layout" />
          </Tooltip>
        </h2>
        <div className="features-container-Layout">
          <div className="feature-card-Layout">
            <div className="feature-icon-Layout">🏠</div>
            <h3 className="feature-title-Layout">Easy Management</h3>
            <p className="feature-description-Layout">Track payments, tenants, and properties in one dashboard.</p>
          </div>
          <div className="feature-card-Layout">
            <div className="feature-icon-Layout">🔒</div>
            <h3 className="feature-title-Layout">Secure Payments</h3>
            <p className="feature-description-Layout">Integrated payment system ensures your money is safe.</p>
          </div>
          <div className="feature-card-Layout">
            <div className="feature-icon-Layout">📱</div>
            <h3 className="feature-title-Layout">Mobile Friendly</h3>
            <p className="feature-description-Layout">Access your properties from any device, anywhere.</p>
          </div>
        </div>
      </section>

      {/* Location & Contact Section */}
      <section className="contact-section-Layout">
        <div className="contact-container-Layout">
          <div className="contact-info-Layout">
            <h2 className="section-title-Layout">Visit Us Today</h2>
            <div className="contact-details-Layout">
              <div className="contact-item-Layout">
                <Tooltip text="Our main office location">
                  <MapPin className="contact-icon-Layout" />
                </Tooltip>
                <div>
                  <h3>Location</h3>
                  <p>Abangan Sur Marilao</p>
                  <p>Bulacan Philippines</p>
                </div>
              </div>
              <div className="contact-item-Layout">
                <Tooltip text="Call us during business hours">
                  <Phone className="contact-icon-Layout" />
                </Tooltip>
                <div>
                  <h3>Phone Number</h3>
                  <p>+63 (2) 8123-4567</p>
                  <p>+63 912 345 6789 (Globe)</p>
                  <p>+63 918 765 4321 (Smart)</p>
                </div>
              </div>
              <div className="contact-item-Layout">
                <Tooltip text="Email us anytime">
                  <Mail className="contact-icon-Layout" />
                </Tooltip>
                <div>
                  <h3>Email Address</h3>
                  <p>info@rentahanan.com</p>
                  <p>support@rentahanan.com</p>
                </div>
              </div>
              <div className="contact-item-Layout">
                <Tooltip text="Our operating hours">
                  <Clock className="contact-icon-Layout" />
                </Tooltip>
                <div>
                  <h3>Business Hours</h3>
                  <p>Monday - Friday: 8:00 AM - 6:00 PM</p>
                  <p>Saturday: 9:00 AM - 3:00 PM</p>
                  <p>Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="map-section-Layout">
            <h3>Find Us Here</h3>
            <Tooltip text="Tap and hold to view larger map">
              <div className="map-image-container-Layout">
                <img 
                  src="/images/map-location.jpg" 
                  alt="RenTahanan Location - Abangan Sur Marilao, Bulacan"
                  className="map-image-Layout"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/600x400/2D3748/FFFFFF?text=Location+Map";
                  }}
                />
              </div>
            </Tooltip>
            <div className="location-details-Layout">
              <h4>Prime Location Features:</h4>
              <ul>
                <li>✓ Near Kaps Tapsi</li>
                <li>✓ Walking distance to malls and markets</li>
                <li>✓ Safe and accessible neighborhood</li>
                <li>✓ Close to schools and universities</li>
                <li>✓ 24/7 security in the area</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section-Layout">
        <h2 className="section-title-Layout">About RENTAHANAN</h2>
        <p className="about-description-Layout">
          RENTAHANAN is made for us — the tenants looking for a place to call home.
          It helps us easily find available rooms or houses that fit our budget and needs.
          No more endless searching or unreliable listings — just verified, comfortable spaces
          where we can start new chapters with peace of mind.
        </p>
      </section>

      {/* Footer */}
      <footer className="footer-Layout">
        <div className="footer-content-Layout">
          <div className="footer-section-Layout">
            <h3>RenTahanan</h3>
            <p>Your trusted partner in finding the perfect home. We connect tenants with quality rental properties across Metro Manila.</p>
          </div>
          
          <div className="footer-section-Layout">
            <h4>Contact Info</h4>
            <div className="footer-contact-Layout">
              <p><MapPin size={16} /> Abangan Sur Marilao</p>
              <p><Phone size={16} /> +63 (2) 8123-4567</p>
              <p><Mail size={16} /> info@rentahanan.com</p>
            </div>
          </div>
          
          <div className="footer-section-Layout">
            <h4>Quick Links</h4>
            <div className="quick-links-Layout">
              <Link to="/login" onClick={closeMobileMenu}>Login</Link>
              <Link to="/register" onClick={closeMobileMenu}>Register</Link>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom-Layout">
          <p>&copy; 2025 RENTAHANAN. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;