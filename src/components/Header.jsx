import React, { useState, useEffect } from 'react';
import '../styles/Header.css';

export default function Header({ cartCount, onCartClick, activeTab, onNavClick, user, onLoginClick, onLogout, onOrdersClick }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
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
    // Scroll to the section after a brief delay to let the content render
    setTimeout(() => {
      const sectionId = tab === 'food' ? 'pet-food' : tab;
      scrollToSection(sectionId);
    }, 50);
  };

  const handleContact = () => {
    setMenuOpen(false);
    scrollToSection('contact');
  };

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
          {user ? (
            <div className="user-menu">
              <div className="user-avatar">{user.avatar}</div>
              <span className="user-name">{user.name}</span>
              <button className="orders-btn" onClick={onOrdersClick} title="My Orders">📦</button>
              <button className="logout-btn" onClick={onLogout} title="Sign out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={onLoginClick}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Sign In</span>
            </button>
          )}
          <button className="cart-btn" onClick={onCartClick}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
