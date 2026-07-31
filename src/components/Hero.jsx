import React from 'react';
import '../styles/Hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-shape hero-shape-1" />
        <div className="hero-shape hero-shape-2" />
        <div className="hero-shape hero-shape-3" />
      </div>
      <div className="hero-content">
        <div className="hero-badge">
          <span>🐾</span> Premium Pet Store
        </div>
        <h1 className="hero-title">
          Find Your <span className="highlight">Perfect</span> Companion
        </h1>
        <p className="hero-subtitle">
          Discover loving pets waiting for their forever homes. From playful
          puppies to cuddly kittens, we connect you with your next best friend.
        </p>
        <div className="hero-actions">
          <a href="#pets" className="btn btn-primary">
            Browse Pets ↓
          </a>
          <a href="#contact" className="btn btn-secondary">
            Learn More
          </a>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-number">200+</span>
            <span className="stat-label">Happy Pets</span>
          </div>
          <div className="stat">
            <span className="stat-number">1K+</span>
            <span className="stat-label">Happy Owners</span>
          </div>
          <div className="stat">
            <span className="stat-number">5★</span>
            <span className="stat-label">Rating</span>
          </div>
        </div>
      </div>
    </section>
  );
}
