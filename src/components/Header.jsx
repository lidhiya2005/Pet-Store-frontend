import React, { useState, useEffect, useRef } from 'react';
import '../styles/Header.css';

export default function Header({ cartCount, onCartClick, activeTab, onNavClick, user, onLoginClick, onLogout, onOrdersClick, onConsultationsClick, isAdmin }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Close the settings dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const headerHeight = document.querySelector('.header')?.offsetHeight || 60;
      window.scrollTo({ top: el.offsetTop - headerHeight - 20, behavior: 'smooth' });
    }
  };

  const handleNav = (tab) => {
    onNavClick(tab);
    setMenuOpen(false);
    setSettingsOpen(false);
    // Scroll to the section after a brief delay to let the content render
    setTimeout(() => {
      const sectionId = tab === 'food' ? 'pet-food' : tab;
      scrollToSection(sectionId);
    }, 50);
  };

  const handleContact = () => {
    setMenuOpen(false);
    setSettingsOpen(false);
    scrollToSection('contact');
  };

  const closeSettings = () => setSettingsOpen(false);

  const handleCart = () => {
    closeSettings();
    if (onCartClick) onCartClick();
  };

  const handleOrders = () => {
    closeSettings();
    if (onOrdersClick) onOrdersClick();
  };

  const handleConsultations = () => {
    closeSettings();
    if (onConsultationsClick) onConsultationsClick();
  };

  const handleLogin = () => {
    closeSettings();
    if (onLoginClick) onLoginClick();
  };

  const handleLogout = () => {
    closeSettings();
    if (onLogout) onLogout();
  };

  const userInitials = user?.avatar || (user?.name ? user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() : '');

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      {/* Mobile overlay */}
      {menuOpen && <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />}

      <div className="header-container">
        <a href="#" className="logo" onClick={(e) => { e.preventDefault(); handleNav('pets'); }}>
          <span className="logo-icon">🐾</span>
          <span className="logo-text">PetStore</span>
        </a>

        <button className={`hamburger ${menuOpen ? 'hamburger-open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
          <button onClick={() => handleNav('pets')} className={`nav-link ${activeTab === 'pets' ? 'active' : ''}`}>
            🐾 Pets
          </button>
          <button onClick={() => handleNav('food')} className={`nav-link ${activeTab === 'food' ? 'active' : ''}`}>
            🍖 Food
          </button>
          <button onClick={() => handleNav('consultation')} className={`nav-link ${activeTab === 'consultation' ? 'active' : ''}`}>
            🩺 Consult
          </button>
          <button onClick={handleContact} className="nav-link">
            📞 Contact
          </button>
        </nav>

        <div className="header-actions">
          {/* User icon — opens account settings */}
          <div className="user-settings" ref={settingsRef}>
            <button
              className={`user-icon-btn ${settingsOpen ? 'user-icon-open' : ''}`}
              onClick={() => setSettingsOpen(!settingsOpen)}
              aria-expanded={settingsOpen}
              aria-haspopup="true"
              title={user ? `${user.name}'s settings` : 'Account settings'}
            >
              {user ? (
                <span className="user-icon-avatar">{userInitials}</span>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>

            {settingsOpen && (
              <div className="settings-dropdown">
                <div className="settings-header">
                  {user ? (
                    <>
                      <span className="settings-avatar">{userInitials}</span>
                      <div className="settings-user-info">
                        <h4>{user.name}</h4>
                        <p>{user.email}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="settings-avatar">👤</span>
                      <div className="settings-user-info">
                        <h4>Guest</h4>
                        <p>Sign in to manage your account</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="settings-menu">
                  <button className="settings-menu-item" onClick={handleCart}>
                    <span className="settings-menu-icon">🛒</span>
                    <span className="settings-menu-label">Cart</span>
                    {cartCount > 0 && <span className="settings-menu-badge">{cartCount}</span>}
                    <svg className="settings-menu-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>

                  {user && (
                    <button className="settings-menu-item" onClick={handleOrders}>
                      <span className="settings-menu-icon">📦</span>
                      <span className="settings-menu-label">My Orders</span>
                      <svg className="settings-menu-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )}

                  {user && (
                    <button className="settings-menu-item" onClick={handleConsultations}>
                      <span className="settings-menu-icon">🩺</span>
                      <span className="settings-menu-label">My Consults</span>
                      <svg className="settings-menu-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="settings-footer">
                  {user ? (
                    <button className="settings-logout-btn" onClick={handleLogout}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  ) : (
                    <button className="settings-login-btn" onClick={handleLogin}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      Sign In
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
