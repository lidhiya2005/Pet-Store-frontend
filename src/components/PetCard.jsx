import React, { useState } from 'react';

const fallbackEmojis = {
  dog: '🐕',
  cat: '🐱',
  bird: '🐦',
  fish: '🐟',
  rabbit: '🐰',
  reptile: '🦎',
};

export default function PetCard({ pet, onAddToCart }) {
  const [imgError, setImgError] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    onAddToCart(pet);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="pet-card">
      <div className="pet-card-image">
        {imgError ? (
          <div className="pet-card-fallback">
            <span>{fallbackEmojis[pet.category] || '🐾'}</span>
          </div>
        ) : (
          <img
            src={pet.image}
            alt={pet.name}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
        <div className="pet-card-overlay">
          <button
            className={`add-to-cart-btn ${added ? 'added' : ''}`}
            onClick={handleAddToCart}
          >
            {added ? '✓ Added!' : 'Add to Cart'}
          </button>
        </div>
        {pet.vaccinated && (
          <span className="pet-badge">💉 Vaccinated</span>
        )}
      </div>
      <div className="pet-card-body">
        <div className="pet-card-header">
          <h3 className="pet-name">{pet.name}</h3>
          <span className="pet-gender">
            {pet.gender === 'male' ? '♂' : '♀'}
          </span>
        </div>
        <p className="pet-breed">{pet.breed}</p>
        <div className="pet-meta">
          <span className="pet-age">📅 {pet.age}</span>
          <span className="pet-category-tag">{pet.category}</span>
        </div>
        <p className="pet-description">{pet.description}</p>
        <div className="pet-card-footer">
          <span className="pet-price">${pet.price.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
