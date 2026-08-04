import React, { useState } from 'react';

const fallbackEmojis = {
  dog: '🐕',
  cat: '🐱',
  bird: '🐦',
  fish: '🐟',
  rabbit: '🐰',
  reptile: '🦎',
};

export default function RecommendationCard({ item, onAddToCart }) {
  const [added, setAdded] = useState(false);
  const isPet = item.item_type === 'pet' || ('breed' in item && !('brand' in item));

  const handleAdd = () => {
    if (isPet) {
      onAddToCart(item);
    } else {
      // Food items need the same shape the store grid uses:
      // category: 'food' lets checkout and the rec engine tell food from pets.
      onAddToCart({
        ...item,
        age: '',
        breed: item.brand || '',
        gender: '',
        vaccinated: false,
        category: 'food',
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="rec-card">
      <div className="rec-card-image">
        {item.image ? (
          <img src={item.image} alt={item.name} loading="lazy" />
        ) : (
          <div className="pet-card-fallback">
            <span>{fallbackEmojis[item.category] || (isPet ? '🐾' : '🍖')}</span>
          </div>
        )}
        {item.reason && <span className="rec-card-reason">{item.reason}</span>}
      </div>
      <div className="rec-card-body">
        <h4 className="rec-card-name">{item.name}</h4>
        <p className="rec-card-sub">{isPet ? item.breed : item.brand}</p>
        <div className="rec-card-footer">
          <span className="rec-card-price">${Number(item.price || 0).toLocaleString()}</span>
          <button className={`rec-add-btn ${added ? 'added' : ''}`} onClick={handleAdd}>
            {added ? '✓ Added' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
