import React, { useEffect, useState } from "react";
import "../styles/LandingPage.css";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, Home, Menu, X } from "lucide-react";

function LandingPage() {
  const [houses, setHouses] = useState([]);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <div className="landing-container-Layout">
      {/* Navbar */}
      <nav className="navbar-Layout">
        {/* Mobile Hamburger Menu */}
        <div 
          className="mobile-menu-toggle-Layout" 
          onClick={toggleMobileMenu}
          title="Toggle menu"
        >
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
            title="RenTahanan - Your Home Rental Partner"
          />
          <div className="nav-brand-text-Layout">RenTahanan</div>
        </div>
        
        {/* Desktop Navigation */}
        <div className="nav-links-Layout desktop-nav-Layout">
          <Link 
            to="/login" 
            className="nav-btn-Layout login-btn-Layout"
            title="Access your account"
          >
            Login
          </Link>
          <Link 
            to="/register" 
            className="nav-btn-Layout register-btn-Layout"
            title="Create a new account"
          >
            Register
          </Link>
        </div>

        {/* Mobile Sidebar Navigation */}
        <div className={`mobile-nav-sidebar-Layout ${isMobileMenuOpen ? 'mobile-nav-open-Layout' : ''}`}>
          <div className="mobile-nav-header-Layout">
            <div className="mobile-nav-brand-container-Layout">
              <img
                src="/logo.png"
                alt="RenTahanan Logo"
                className="logo-Layout"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/50x50/4A5568/FFFFFF?text=R";
                }}
                title="RenTahanan Logo"
              />
              <div className="nav-brand-text-Layout">RenTahanan</div>
            </div>
            <button 
              className="mobile-close-btn-Layout" 
              onClick={closeMobileMenu}
              title="Close menu"
            >
              <X size={24} />
            </button>
          </div>
          <div className="mobile-nav-links-Layout">
            <Link 
              to="/login" 
              className="mobile-nav-btn-Layout mobile-login-btn-Layout" 
              onClick={closeMobileMenu}
              title="Sign in to your account"
            >
              Login
            </Link>
            <Link 
              to="/register" 
              className="mobile-nav-btn-Layout mobile-register-btn-Layout" 
              onClick={closeMobileMenu}
              title="Create new account"
            >
              Register
            </Link>
          </div>
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="mobile-nav-overlay-Layout" 
            onClick={closeMobileMenu}
            title="Click to close menu"
          ></div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="hero-section-Layout">
        <div className="hero-overlay-Layout"></div>
        <div className="hero-content-Layout">
          <h1 className="hero-title-Layout">Discover Your New Home</h1>
          <p 
            className="hero-subtitle-Layout"
            title="We help you find the perfect rental property"
          >
            Helping renters find their perfect fit.
          </p>
        </div>
      </section>

      {/* Houses Section */}
      <section className="houses-section-Layout">
        <h2 className="section-title-Layout">Properties</h2>
        
        {loading && (
          <div 
            className="loading-message-Layout"
            title="Fetching available properties..."
          >
            <p>Loading properties...</p>
          </div>
        )}
        
        {error && (
          <div 
            className="error-message-Layout"
            title="Error loading properties"
          >
            <p>{error}</p>
          </div>
        )}
        
        <div className="houses-container-Layout">
          {houses.map((house) => (
            <div
              key={house.unitid || house.id}
              className="house-card-Layout"
              onClick={() => setSelectedHouse(house)}
              title={`Click to view details of ${house.name}`}
            >
              <img
                src={getImageUrl(house.imagepath)}
                alt={house.name}
                className="house-image-Layout"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/400x300/4A5568/FFFFFF?text=No+Image+Available";
                }}
                title={`Image of ${house.name}`}
              />
              <div className="house-info-Layout">
                <h3 className="house-name-Layout">{house.name}</h3>
                <p 
                  className="house-price-Layout"
                  title={`Monthly rental price: ₱${parseFloat(house.price).toLocaleString()}`}
                >
                  ₱{parseFloat(house.price).toLocaleString()}
                </p>
                <p 
                  className={`house-status-Layout status-${house.status?.toLowerCase()}-Layout`}
                  title={`Property is ${house.status}`}
                >
                  {house.status}
                </p>
              </div>
            </div>
          ))}
        </div>

        {houses.length === 0 && !loading && !error && (
          <div 
            className="no-properties-Layout"
            title="No properties currently available"
          >
            <p>No properties available at the moment.</p>
          </div>
        )}

        {/* Popup Modal */}
        {selectedHouse && (
          <div 
            className="modal-overlay-Layout" 
            onClick={() => setSelectedHouse(null)}
            title="Click outside to close"
          >
            <div className="modal-content-Layout" onClick={(e) => e.stopPropagation()}>
              <img
                src={getImageUrl(selectedHouse.imagepath)}
                alt={selectedHouse.name}
                className="modal-image-Layout"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/500x300/4A5568/FFFFFF?text=No+Image+Available";
                }}
                title={`${selectedHouse.name} - Full size image`}
              />
              <h2 className="modal-title-Layout">{selectedHouse.name}</h2>
              <p className="modal-description-Layout">{selectedHouse.description}</p>
              <p 
                className="modal-price-Layout"
                title="Monthly rental rate"
              >
                <strong>₱{parseFloat(selectedHouse.price).toLocaleString()}</strong> / month
              </p>
              <p 
                className="modal-status-Layout"
                title="Current availability status"
              >
                Status: <strong>{selectedHouse.status}</strong>
              </p>
              <button
                className="close-btn-Layout"
                onClick={() => setSelectedHouse(null)}
                title="Close this property details"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="features-section-Layout">
        <h2 className="section-title-Layout">Why Choose RENTAHANAN?</h2>
        <div className="features-container-Layout">
          <div 
            className="feature-card-Layout"
            title="Streamlined property and tenant management"
          >
            <h3 className="feature-title-Layout">Easy Management</h3>
            <p className="feature-description-Layout">Track payments, tenants, and properties in one dashboard.</p>
          </div>
          <div 
            className="feature-card-Layout"
            title="Safe and reliable payment processing"
          >
            <h3 className="feature-title-Layout">Secure Payments</h3>
            <p className="feature-description-Layout">Integrated payment system ensures your money is safe.</p>
          </div>
          <div 
            className="feature-card-Layout"
            title="Access your account from any device"
          >
            <h3 className="feature-title-Layout">Accessible Anywhere</h3>
            <p className="feature-description-Layout">View your rental properties and tenants from any device.</p>
          </div>
        </div>
      </section>

      {/* Location & Contact Section */}
      <section className="contact-section-Layout">
        <div className="contact-container-Layout">
          <div className="contact-info-Layout">
            <h2 className="section-title-Layout">Visit Us Today</h2>
            <div className="contact-details-Layout">
              <div 
                className="contact-item-Layout"
                title="Our physical location"
              >
                <MapPin className="contact-icon-Layout" />
                <div>
                  <h3>Location</h3>
                  <p>Abangan Sur Marilao</p>
                  <p>Bulacan Philippines</p>
                </div>
              </div>
              <div 
                className="contact-item-Layout"
                title="Contact numbers"
              >
                <Phone className="contact-icon-Layout" />
                <div>
                  <h3>Phone Number</h3>
                  <p>+63 (2) 8123-4567</p>
                  <p>+63 912 345 6789 (Globe)</p>
                  <p>+63 918 765 4321 (Smart)</p>
                </div>
              </div>
              <div 
                className="contact-item-Layout"
                title="Email addresses for inquiries"
              >
                <Mail className="contact-icon-Layout" />
                <div>
                  <h3>Email Address</h3>
                  <p>info@rentahanan.com</p>
                  <p>support@rentahanan.com</p>
                </div>
              </div>
              <div 
                className="contact-item-Layout"
                title="Our business hours"
              >
                <Clock className="contact-icon-Layout" />
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
            <div className="map-image-container-Layout">
              <img 
                src="/images/map-location.jpg" 
                alt="RenTahanan Location - Abangan Sur Marilao, Bulacan"
                className="map-image-Layout"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/600x400/2D3748/FFFFFF?text=Location+Map";
                }}
                title="Our location in Abangan Sur Marilao, Bulacan"
              />
            </div>
            <div 
              className="location-details-Layout"
              title="Area amenities and features"
            >
              <h4>Prime Location Features:</h4>
              <ul>
                <li title="Near popular local restaurant">✓ Near Kaps Tapsi</li>
                <li title="Convenient access to shopping">✓ Walking distance to malls and markets</li>
                <li title="Secure residential area">✓ Safe and accessible neighborhood</li>
                <li title="Proximity to educational institutions">✓ Close to schools and universities</li>
                <li title="Round-the-clock security">✓ 24/7 security in the area</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section-Layout">
        <h2 className="section-title-Layout">About RENTAHANAN</h2>
        <p 
          className="about-description-Layout"
          title="Our mission to help tenants find perfect homes"
        >
          RENTAHANAN is made for us — the tenants looking for a place to call home.
          It helps us easily find available rooms or houses that fit our budget and needs.
          No more endless searching or unreliable listings — just verified, comfortable spaces
          where we can start new chapters with peace of mind.
        </p>
      </section>

      {/* Footer */}
      <footer className="footer-Layout">
        <div className="footer-content-Layout">
          <div 
            className="footer-section-Layout"
            title="About RenTahanan"
          >
            <h3>RenTahanan</h3>
            <p>Your trusted partner in finding the perfect home. We connect tenants with quality rental properties across Metro Manila.</p>
          </div>
          
          <div 
            className="footer-section-Layout"
            title="Our contact information"
          >
            <h4>Contact Info</h4>
            <div className="footer-contact-Layout">
              <p title="Our address"><MapPin size={16} /> Abangan Sur Marilao</p>
              <p title="Phone number"><Phone size={16} /> +63 (2) 8123-4567</p>
              <p title="Email address"><Mail size={16} /> info@rentahanan.com</p>
            </div>
          </div>
          
          <div 
            className="footer-section-Layout"
            title="Follow us on social media"
          >
            <h4>Follow Us</h4>
            <div className="social-links-Layout">
              <a href="#" aria-label="Facebook" title="Visit our Facebook page">Facebook</a>
              <a href="#" aria-label="Instagram" title="Follow us on Instagram">Instagram</a>
              <a href="#" aria-label="Twitter" title="Follow us on Twitter">Twitter</a>
            </div>
          </div>
        </div>
        
        <div 
          className="footer-bottom-Layout"
          title="Copyright information"
        >
          <p>&copy; 2025 RENTAHANAN. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;