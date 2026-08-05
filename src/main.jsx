import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import Header from './components/Header';
import Hero from './components/Hero';
import CategoryFilter from './components/CategoryFilter';
import PetCard from './components/PetCard';
import RecommendationCard from './components/RecommendationCard';
import {
  categories, testimonials, petFoodCategories,
  petTypes
} from './data/pets';
import './styles/index.css';
import './styles/App.css';

// ===== API Service =====
// Point directly to the deployed Render backend so the app works
// both in dev (via Vite proxy) and in production (static build).
const API_BASE = 'https://pet-store-backend-1.onrender.com/api';

// Local YYYY-MM-DD for today (avoids UTC off-by-one on the date picker's min)
const todayLocal = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Pretty-print a YYYY-MM-DD preferred date (parsed as local time)
const formatConsultDate = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : null;

async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function App() {
  const [activeTab, setActiveTab] = useState('pets');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeFoodCategory, setActiveFoodCategory] = useState('all');
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [shippingInfo, setShippingInfo] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '', zip: '' });
  const [savedAddress, setSavedAddress] = useState(null);
  const [editAddress, setEditAddress] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [showOrders, setShowOrders] = useState(false);
  const [ordersTab, setOrdersTab] = useState('orders');
  const [userOrders, setUserOrders] = useState([]);
  const [userConsultations, setUserConsultations] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [consultForm, setConsultForm] = useState({
    serviceId: null,
    petName: '', petType: '', petBreed: '', petAge: '',
    preferredDate: '',
    description: '',
    phone: '',
  });
  const [consultStep, setConsultStep] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [lastBooking, setLastBooking] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState('dashboard');
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminFoods, setAdminFoods] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminConsultations, setAdminConsultations] = useState([]);
  const [adminInventory, setAdminInventory] = useState({items:[],low_stock:[],low_stock_count:0});
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminDashboard, setAdminDashboard] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminCategory, setAdminCategory] = useState('all');
  const [adminStatus, setAdminStatus] = useState('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [adminSort, setAdminSort] = useState('name');
  const [showAdminForm, setShowAdminForm] = useState(null);
  const [adminFormData, setAdminFormData] = useState({});
  const [adminFormType, setAdminFormType] = useState('pet');
  const [prodDetail, setProdDetail] = useState(null);
  const [adminCategories, setAdminCategories] = useState({defaults:{pets:[],foods:[]},custom:[]});
  const [showCatForm, setShowCatForm] = useState(false);
  const [catFormData, setCatFormData] = useState({name:'',type:'pet',icon:'📦'});
  const [editingCat, setEditingCat] = useState(null);
  const [showAdjust, setShowAdjust] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [invHistory, setInvHistory] = useState([]);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type) => { setToast({msg,type}); setTimeout(() => setToast(null), 3000); };

  // Fetch data from API on mount
  const [apiPets, setApiPets] = useState([]);
  const [apiFoods, setApiFoods] = useState([]);
  const [apiConsultTypes, setApiConsultTypes] = useState([]);

  // Content-based recommendations
  const [petRecs, setPetRecs] = useState([]);
  const [foodRecs, setFoodRecs] = useState([]);
  const [cartRecs, setCartRecs] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Check URL for /admin route and set activeTab accordingly
        if (window.location.pathname === '/admin') {
          setActiveTab('admin');
        }
        const [petsData, foodsData, consultTypes] = await Promise.all([
          apiFetch('/pets'),
          apiFetch('/foods'),
          apiFetch('/consultations/types'),
        ]);
        setApiPets(petsData);
        setApiFoods(foodsData);
        setApiConsultTypes(consultTypes);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Check admin status
  const checkAdmin = async () => {
    try {
      const result = await apiFetch('/admin/check');
      setIsAdmin(result.is_admin);
    } catch { setIsAdmin(false); }
  };

  // Restore user from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        checkAdmin();
      } catch {}
    }
  }, []);

  // When entering admin mode, always open the admin homepage (Dashboard)
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
      setAdminTab('dashboard');
      loadAdminDashboard();
      loadAdminProducts();
      loadAdminInventory();
      loadAdminCategories();
      loadAdminMessages();
      loadAdminConsultations();
      loadAdminUsers();
    }
  }, [activeTab, isAdmin]);

  // Sync activeTab with browser URL for /admin route
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  useEffect(() => {
    if (activeTab === 'admin' && window.location.pathname !== '/admin') {
      window.history.pushState(null, '', '/admin');
    } else if (activeTab !== 'admin' && window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
  }, [activeTab]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/admin') {
        setActiveTab('admin');
      } else if (activeTabRef.current === 'admin') {
        setActiveTab('pets');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const result = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: authForm.email, password: authForm.password }),
      });
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      checkAdmin();
      setShowAuth(false);
      setAuthForm({ email: '', password: '', name: '' });
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authForm.name.trim() || !authForm.email.trim() || !authForm.password.trim()) {
      setAuthError('Please fill in all fields.');
      return;
    }
    try {
      const result = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
        }),
      });
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      setShowAuth(false);
      setAuthForm({ email: '', password: '', name: '' });
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const loadOrders = async () => {
    try {
      const orders = await apiFetch('/orders/history');
      setUserOrders(orders);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const loadConsultations = async () => {
    try {
      const consults = await apiFetch('/consultations');
      setUserConsultations(consults);
    } catch (err) {
      console.error('Failed to load consultations:', err);
    }
  };

  // Admin API helpers
  const adminFetch = async (url, opts = {}) => apiFetch('/admin' + url, opts);

  const loadAdminDashboard = async () => {
    setAdminLoading(true);
    try {
      const data = await adminFetch('/dashboard');
      setAdminDashboard(data);
    } catch (err) { console.error(err); }
    setAdminLoading(false);
  };

  const loadAdminProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (adminCategory !== 'all') params.set('category', adminCategory);
      if (adminStatus !== 'all') params.set('status', adminStatus);
      if (adminSearch) params.set('search', adminSearch);
      params.set('sort', adminSort);
      const q = params.toString() ? '?' + params.toString() : '';
      const [pets, foods] = await Promise.all([
        adminFetch('/pets' + q),
        adminFetch('/foods' + q),
      ]);
      setAdminProducts(pets);
      setAdminFoods(foods);
    } catch (err) { console.error(err); }
  };

  const loadAdminOrders = async () => {
    try {
      const data = await adminFetch('/orders');
      setAdminOrders(data);
    } catch (err) { console.error(err); }
  };

  const loadAdminMessages = async () => {
    try {
      const data = await adminFetch('/messages');
      setAdminMessages(data);
    } catch (err) { console.error(err); }
  };

  const loadAdminConsultations = async () => {
    try {
      const data = await adminFetch('/consultations');
      setAdminConsultations(data);
    } catch (err) { console.error(err); }
  };

  const loadAdminInventory = async () => {
    try {
      const data = await adminFetch('/inventory');
      setAdminInventory(data || {items:[],low_stock:[],low_stock_count:0});
    } catch (err) { console.error(err); }
  };

  const loadAdminCategories = async () => {
    try {
      const data = await adminFetch('/categories');
      setAdminCategories(data);
    } catch (err) { console.error(err); }
  };

  const loadInvHistory = async () => {
    try {
      const data = await adminFetch('/inventory/history');
      setInvHistory(data);
    } catch (err) { console.error(err); }
  };

  const loadAdminUsers = async () => {
    try {
      const data = await adminFetch('/users');
      setAdminUsers(data);
    } catch (err) { console.error(err); }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoginError('');
    setAdminLoginLoading(true);
    const form = e.target;
    const email = form[0].value.trim();
    const password = form[1].value.trim();
    if (!email || !password) {
      setAdminLoginError('Please enter your email and password.');
      setAdminLoginLoading(false);
      return;
    }
    try {
      const result = await apiFetch('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      setUser(result.user);
      setIsAdmin(true);
      setAdminTab('dashboard');
      setAdminLoginError('');
      // Load admin data
      loadAdminDashboard();
      loadAdminProducts();
      loadAdminInventory();
      loadAdminCategories();
      loadAdminMessages();
      loadAdminUsers();
    } catch (err) {
      setAdminLoginError(err.message);
    } finally {
      setAdminLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthError('');
    setAuthForm({ email: '', password: '', name: '' });
    setShowAuth(true);
  };

  const filteredPets =
    activeCategory === 'all'
      ? apiPets
      : apiPets.filter((pet) => pet.category === activeCategory);

  const filteredFoods =
    activeFoodCategory === 'all'
      ? apiFoods
      : apiFoods.filter((food) => food.category === activeFoodCategory);

  const handleConsultSubmit = async (formData) => {
    if (!formData.serviceId) return;
    try {
      const service = apiConsultTypes.find((s) => s.id === formData.serviceId);
      setLastBooking({
        date: formData.preferredDate,
        serviceName: service ? `${service.icon} ${service.name}` : 'Consult',
        price: service ? service.price : null,
        petName: formData.petName,
        petType: formData.petType,
        petBreed: formData.petBreed,
        petAge: formData.petAge,
        phone: formData.phone,
      });
      await apiFetch('/consultations', {
        method: 'POST',
        body: JSON.stringify({
          service_id: formData.serviceId,
          pet_name: formData.petName,
          pet_type: formData.petType,
          pet_breed: formData.petBreed,
          pet_age: formData.petAge,
          preferred_date: formData.preferredDate,
          description: formData.description,
          phone: formData.phone,
        }),
      });
      setBookingSuccess(true);
      setConsultStep(0);
      setConsultForm({
        serviceId: null,
        petName: '', petType: '', petBreed: '', petAge: '',
        preferredDate: '',
        description: '',
        phone: '',
      });
    } catch (err) {
      alert('Booking failed: ' + err.message);
    }
  };

  const updateConsultField = (field, value) => {
    setConsultForm((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmitConsult =
    !!consultForm.serviceId &&
    !!(consultForm.petName || '').trim() &&
    !!consultForm.petType &&
    !!(consultForm.petAge || '').trim() &&
    !!(consultForm.preferredDate || '').trim() &&
    !!(consultForm.description || '').trim() &&
    !!(consultForm.phone || '').trim();

  const selectedService = apiConsultTypes.find((s) => s.id === consultForm.serviceId);

  const addToCart = (pet) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === pet.id);
      if (existing) {
        return prev.map((item) =>
          item.id === pet.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...pet, quantity: 1 }];
    });
  };

  // Load content-based recommendations for the pets tab.
  // On the "All Pets" view we cross-sell popular food; on a specific
  // category we recommend similar pets that aren't already on screen.
  const loadPetRecs = async () => {
    try {
      const isAll = activeCategory === 'all';
      const params = new URLSearchParams({
        item_type: isAll ? 'food' : 'pet',
        category: activeCategory,
        limit: '4',
      });
      if (!isAll) {
        params.set('exclude_ids', filteredPets.map((p) => p.id).join(','));
      }
      const data = await apiFetch('/recommendations?' + params.toString());
      setPetRecs(data);
    } catch {
      setPetRecs([]);
    }
  };

  // Load content-based recommendations for the food tab.
  // On the "All Food" view we cross-sell popular pets; on a specific
  // category we recommend similar food that isn't already on screen.
  const loadFoodRecs = async () => {
    try {
      const isAll = activeFoodCategory === 'all';
      const params = new URLSearchParams({
        item_type: isAll ? 'pet' : 'food',
        category: activeFoodCategory,
        limit: '4',
      });
      if (!isAll) {
        params.set('exclude_ids', filteredFoods.map((f) => f.id).join(','));
      }
      const data = await apiFetch('/recommendations?' + params.toString());
      setFoodRecs(data);
    } catch {
      setFoodRecs([]);
    }
  };

  // Add an item to the cart, normalising food items to the store shape.
  // Food cart items must carry category: 'food' so checkout and the
  // recommendation endpoint can tell food from pets.
  const addRecItem = (item) => {
    const isFood = item.item_type === 'food' || ('brand' in item && !('breed' in item));
    if (isFood) {
      addToCart({
        ...item,
        age: '',
        breed: item.brand || '',
        gender: '',
        vaccinated: false,
        category: 'food',
      });
    } else {
      addToCart(item);
    }
  };

  // Load cart-based recommendations whenever the cart is opened
  const loadCartRecs = async () => {
    try {
      const items = cartItems.map((item) => ({
        item_type: item.category === 'food' ? 'food' : 'pet',
        item_id: String(item.id),
        quantity: item.quantity,
      }));
      const data = await apiFetch('/recommendations/from-items', {
        method: 'POST',
        body: JSON.stringify({ items, limit: 4 }),
      });
      setCartRecs(data);
    } catch {
      setCartRecs([]);
    }
  };

  // Reload pet/food recommendations when the tab or category changes
  useEffect(() => {
    if (activeTab === 'pets') loadPetRecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeCategory, apiPets]);

  useEffect(() => {
    if (activeTab === 'food') loadFoodRecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeFoodCategory, apiFoods]);

  // Refresh cart recommendations when the cart is opened or changes
  useEffect(() => {
    if (showCart && cartItems.length > 0) loadCartRecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCart, cartItems]);

  const removeFromCart = (petId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== petId));
  };

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (loading) {
    // On /admin URL, show admin-themed loading screen
    if (window.location.pathname === '/admin') {
      return (
        <div className="admin-login-page">
          <div className="admin-login-container">
            <div className="admin-login-card" style={{textAlign:'center'}}>
              <div className="admin-login-header">
                <span className="admin-login-logo" style={{fontSize:'3.5rem'}}>🔐</span>
                <h2>Admin Panel</h2>
                <p>Loading, please wait...</p>
              </div>
              <div style={{display:'flex',justifyContent:'center',padding:'20px 0'}}>
                <div className="admin-login-spinner" style={{width:36,height:36,borderWidth:3}}></div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="app">
        <Header
          cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
          onCartClick={() => setShowCart(!showCart)}
          activeTab={activeTab}
          onNavClick={setActiveTab}
          user={user}
          onLoginClick={() => openAuth('login')}
          onLogout={handleLogout}
          onOrdersClick={() => { loadOrders(); loadConsultations(); setOrdersTab('orders'); setShowOrders(true); }}
          onConsultationsClick={() => { loadOrders(); loadConsultations(); setOrdersTab('consultations'); setShowOrders(true); }}
          isAdmin={isAdmin}
        />
        <main className="main-content">
          <Hero />
          <div className="loading-container">
            <div className="loading-spinner">🐾</div>
            <p className="loading-text">Loading pets and goodies...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setShowCart(!showCart)}
        activeTab={activeTab}
        onNavClick={setActiveTab}
        user={user}
        onLoginClick={() => openAuth('login')}
        onLogout={handleLogout}
        onOrdersClick={() => { loadOrders(); loadConsultations(); setOrdersTab('orders'); setShowOrders(true); }}
        onConsultationsClick={() => { loadOrders(); loadConsultations(); setOrdersTab('consultations'); setShowOrders(true); }}
        isAdmin={isAdmin}
      />

      <main className="main-content">
        <Hero />

        {showCart && (
          <>
            <div className="cart-overlay" onClick={() => setShowCart(false)} />
            <div className="cart-sidebar">
              <div className="cart-header">
                <h2>Shopping Cart</h2>
                <button className="cart-close" onClick={() => setShowCart(false)}>
                  ✕
                </button>
              </div>
              {cartItems.length > 0 && (
                <button
                  className="cart-recs-refresh"
                  onClick={loadCartRecs}
                  title="Refresh recommendations"
                >
                  🪄 Match suggestions
                </button>
              )}
              {cartItems.length === 0 ? (
                <div className="cart-empty">
                  <span className="cart-empty-icon">🛒</span>
                  <p>Your cart is empty</p>
                  <p className="cart-empty-sub">
                    Browse our pets and add some to your cart!
                  </p>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cartItems.map((item) => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-image">
                          <img src={item.image} alt={item.name} />
                        </div>
                        <div className="cart-item-info">
                          <h4>{item.name}</h4>
                          <p className="cart-item-breed">{item.breed}</p>
                          <p className="cart-item-price">${item.price.toLocaleString()}</p>
                          <div className="cart-item-qty">
                            <span>Qty: {item.quantity}</span>
                          </div>
                        </div>
                        <button
                          className="cart-item-remove"
                          onClick={() => removeFromCart(item.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                  {cartRecs.length > 0 && (
                    <div className="cart-recs">
                      <div className="cart-recs-header">
                        <h4>✨ Complete Your Cart</h4>
                        <span>Based on items you added</span>
                      </div>
                      {cartRecs.map((item) => (
                        <div key={item.id} className="cart-rec-item">
                          <div className="cart-rec-item-img">
                            <img src={item.image} alt={item.name} />
                          </div>
                          <div className="cart-rec-item-info">
                            <h5>{item.name}</h5>
                            <p className="cart-rec-item-reason">{item.reason}</p>
                            <span className="cart-rec-item-price">
                              ${Number(item.price || 0).toLocaleString()}
                            </span>
                          </div>
                          <button
                            className="cart-rec-item-add"
                            onClick={() => addRecItem(item)}
                            title="Add to cart"
                          >
                            +
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="cart-footer">
                    <div className="cart-total">
                      <span>Total</span>
                      <span>${cartTotal.toLocaleString()}</span>
                    </div>
                    <button
                      className="btn btn-primary cart-checkout"
                      onClick={() => {
                        if (!user) { setShowAuth(true); return; }
                        const addrKey = 'petstore_address' + (user?.id ? '_' + user.id : '');
                        let saved = null;
                        try { saved = JSON.parse(localStorage.getItem(addrKey) || 'null'); } catch { saved = null; }
                        setSavedAddress(saved);
                        setEditAddress(!saved);
                        setShippingInfo({
                          name: user.name || '',
                          email: user.email || '',
                          phone: saved?.phone || '',
                          address: saved?.address || '',
                          city: saved?.city || '',
                          state: saved?.state || '',
                          zip: saved?.zip || '',
                        });
                        setShowCart(false);
                        setShowCheckout(true);
                        setCheckoutStep(0);
                        setOrderResult(null);
                      }}
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* ===== Pets Section (Home) ===== */}
        {activeTab === 'pets' && (
          <>
            <section id="pets" className="section">
              <div className="section-header">
                <h2>Find Your New Friend</h2>
                <p>Browse through our selection of wonderful pets looking for a loving home.</p>
              </div>
              <CategoryFilter
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
              <div className="pets-grid">
                {filteredPets.map((pet) => (
                  <PetCard key={pet.id} pet={pet} onAddToCart={addToCart} />
                ))}
              </div>
              {filteredPets.length === 0 && (
                <div className="no-results">
                  <span>😕</span>
                  <p>No pets found in this category.</p>
                </div>
              )}

              {petRecs.length > 0 && (
                <div className="rec-section">
                  <div className="rec-section-header">
                    <h3>✨ You Might Also Like</h3>
                    <p>Hand-picked matches based on what you're browsing</p>
                  </div>
                  <div className="rec-grid">
                    {petRecs.map((item) => (
                      <RecommendationCard key={item.id} item={item} onAddToCart={addToCart} />
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section id="testimonials" className="section testimonials-section">
              <div className="section-header">
                <h2>What Our Customers Say</h2>
                <p>Hear from pet owners who found their perfect companions through us.</p>
              </div>
              <div className="testimonials-grid">
                {testimonials.map((t) => (
                  <div key={t.id} className="testimonial-card">
                    <div className="testimonial-stars">
                      {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                    </div>
                    <p className="testimonial-text">"{t.text}"</p>
                    <div className="testimonial-author">
                      <div className="testimonial-avatar">{t.avatar}</div>
                      <div>
                        <p className="testimonial-name">{t.name}</p>
                        <p className="testimonial-role">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ===== Pet Food Section ===== */}
        {activeTab === 'food' && (
          <section id="pet-food" className="section food-section">
            <div className="section-header">
              <h2>Premium Pet Food</h2>
              <p>High-quality nutrition from trusted brands to keep your pet healthy and happy.</p>
            </div>
            <CategoryFilter
              categories={petFoodCategories}
              activeCategory={activeFoodCategory}
              onCategoryChange={setActiveFoodCategory}
            />
            <div className="food-grid">
              {filteredFoods.map((food) => (
                <div key={food.id} className="food-card">
                  <div className="food-card-image">
                    <img src={food.image} alt={food.name} />
                    {!food.inStock && (
                      <span className="food-stock-badge out-of-stock">Out of Stock</span>
                    )}
                  </div>
                  <div className="food-card-body">
                    <div className="food-card-header">
                      <h3>{food.name}</h3>
                      <span className="food-rating">★ {food.rating}</span>
                    </div>
                    <p className="food-brand">{food.brand}</p>
                    <p className="food-weight">⚖️ {food.weight}</p>
                    <p className="food-description">{food.description}</p>
                    <div className="food-card-footer">
                      <span className="food-price">${food.price.toFixed(2)}</span>
                      <button
                        className={`add-to-cart-btn ${!food.inStock ? 'disabled' : ''}`}
                        onClick={() => food.inStock && addToCart({ ...food, age: '', breed: food.brand, gender: '', vaccinated: false, category: 'food' })}
                        disabled={!food.inStock}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredFoods.length === 0 && (
              <div className="no-results">
                <span>🍽️</span>
                <p>No food products found in this category.</p>
              </div>
            )}

            {foodRecs.length > 0 && (
              <div className="rec-section">
                <div className="rec-section-header">
                  <h3>✨ You Might Also Like</h3>
                  <p>Hand-picked matches based on what you're browsing</p>
                </div>
                <div className="rec-grid">
                  {foodRecs.map((item) => (
                    <RecommendationCard key={item.id} item={item} onAddToCart={addToCart} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

{/* ===== Consult Section (Stepper Booking) ===== */}
        {activeTab === 'consultation' && (
          <section id="consultation" className="section consultation-section">
            <div className="section-header">
              <h2>Book a Consult</h2>
              <p>Expert veterinary care and pet services tailored to your companion's needs.</p>
            </div>

            {bookingSuccess ? (
              <div className="booking-success">
                <span className="booking-success-icon">✅</span>
                <h3>Booking Confirmed!</h3>
                <p>We'll contact you at the number you provided to confirm your appointment. Thank you for choosing PetStore!</p>
                {lastBooking && (
                  <div className="booking-summary">
                    <div className="booking-summary-row booking-date-row">
                      <span className="booking-summary-label">📅 Booked Date</span>
                      <strong>{formatConsultDate(lastBooking.date) || 'Not set'}</strong>
                    </div>
                    <div className="booking-summary-row">
                      <span className="booking-summary-label">Service</span>
                      <span>{lastBooking.serviceName}{lastBooking.price != null && <small> · ${lastBooking.price}</small>}</span>
                    </div>
                    <div className="booking-summary-row">
                      <span className="booking-summary-label">Pet</span>
                      <span>{lastBooking.petName}{lastBooking.petType ? <small> · {lastBooking.petType}{lastBooking.petBreed ? ', ' + lastBooking.petBreed : ''}{lastBooking.petAge ? `, ${lastBooking.petAge} mo` : ''}</small> : ''}</span>
                    </div>
                    <div className="booking-summary-row">
                      <span className="booking-summary-label">Contact</span>
                      <span>{lastBooking.phone}</span>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className="booking-another-btn"
                  onClick={() => {
                    setBookingSuccess(false);
                    setLastBooking(null);
                  }}
                >
                  Book Another Consult
                </button>
              </div>
            ) : (
              <div className="consultation-layout">
                <div className="consultation-form-wrapper">
                {/* Stepper */}
                <div className="checkout-steps">
                  <div className={`cs-step ${consultStep === 0 ? 'cs-active' : ''} ${consultStep === 1 ? 'cs-done' : ''}`}>
                    <span className="cs-dot">{consultStep === 1 ? '✓' : '1'}</span>
                    <span className="cs-label">Select Service</span>
                  </div>
                  <div className={`cs-step ${consultStep === 1 ? 'cs-active' : ''}`}>
                    <span className="cs-dot">2</span>
                    <span className="cs-label">Pet & Contact</span>
                  </div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleConsultSubmit(consultForm); }}>
                  {/* Step 1: Select Service */}
                  {consultStep === 0 && (
                    <div className="cf-section consult-step-content">
                      <div className="cf-section-header">
                        <span className="cf-section-icon">🩺</span>
                        <div>
                          <h3 className="cf-section-title">Select a Service</h3>
                          <p className="cf-section-subtitle">Choose the type of consult your pet needs</p>
                        </div>
                      </div>
                      <div className="cf-service-grid">
                        {apiConsultTypes.map((s) => (
                          <div
                            key={s.id}
                            className={`cf-service-card ${consultForm.serviceId === s.id ? 'cf-service-selected' : ''}`}
                            onClick={() => updateConsultField('serviceId', s.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && updateConsultField('serviceId', s.id)}
                          >
                            <span className="cf-service-icon">{s.icon}</span>
                            <h4 className="cf-service-name">{s.name}</h4>
                            <p className="cf-service-desc">{s.description}</p>
                            <div className="cf-service-meta">
                              <span className="cf-service-duration">⏱️ {s.duration}</span>
                              <span className="cf-service-price">${s.price}</span>
                            </div>
                            {consultForm.serviceId === s.id && (
                              <span className="cf-service-check">✓</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {selectedService && (
                        <div className="cf-service-detail">
                          <div className="cf-service-detail-header">
                            <span className="cf-service-detail-icon">{selectedService.icon}</span>
                            <div className="cf-service-detail-title">
                              <h4>{selectedService.name}</h4>
                              <span className="cf-service-detail-selected">✓ Selected</span>
                            </div>
                          </div>
                          <p className="cf-service-detail-desc">{selectedService.description}</p>
                          <div className="cf-service-detail-meta">
                            <span className="cf-service-detail-meta-item">
                              <span className="cf-service-detail-meta-label">Duration</span>
                              <strong>⏱️ {selectedService.duration}</strong>
                            </span>
                            <span className="cf-service-detail-meta-item">
                              <span className="cf-service-detail-meta-label">Fee</span>
                              <strong className="cf-service-detail-price">${selectedService.price}</strong>
                            </span>
                            <span className="cf-service-detail-meta-item cf-service-detail-date-item">
                              <span className="cf-service-detail-meta-label">Booked Date</span>
                              <strong>📅 {formatConsultDate(consultForm.preferredDate || (lastBooking && lastBooking.date)) || 'Not booked yet'}</strong>
                            </span>
                          </div>
                          <div className="cf-service-detail-footer">
                            <span className="cf-service-detail-hint">
                              This service will be added to your booking
                            </span>
                            <button
                              type="button"
                              className="cf-service-detail-next"
                              onClick={() => setConsultStep(1)}
                            >
                              Continue
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Pet Details, Description & Contact */}
                  {consultStep === 1 && (
                    <div className="consult-step-content">
                      {/* Pet Details */}
                      <div className="cf-section">
                        <div className="cf-section-header">
                          <span className="cf-section-icon">🐾</span>
                          <div>
                            <h3 className="cf-section-title">Pet Details</h3>
                            <p className="cf-section-subtitle">Tell us about your pet</p>
                          </div>
                        </div>
                        <div className="cf-fields-grid">
                          <div className="cf-field">
                            <label className="cf-label">Pet Name <span className="cf-required">*</span></label>
                            <input type="text" className="cf-input" placeholder="e.g. Buddy" value={consultForm.petName} onChange={(e) => updateConsultField('petName', e.target.value)} required />
                          </div>
                          <div className="cf-field">
                            <label className="cf-label">Pet Type <span className="cf-required">*</span></label>
                            <select className="cf-input cf-select" value={consultForm.petType} onChange={(e) => updateConsultField('petType', e.target.value)} required>
                              <option value="">Select type...</option>
                              {petTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="cf-field">
                            <label className="cf-label">Breed</label>
                            <input type="text" className="cf-input" placeholder="e.g. Golden Retriever" value={consultForm.petBreed} onChange={(e) => updateConsultField('petBreed', e.target.value)} />
                          </div>
                          <div className="cf-field">
                            <label className="cf-label">Age (months) <span className="cf-required">*</span></label>
                            <input type="number" className="cf-input" placeholder="e.g. 12" min="0" step="1" value={consultForm.petAge} onChange={(e) => updateConsultField('petAge', e.target.value)} required />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="cf-section">
                        <div className="cf-section-header">
                          <span className="cf-section-icon">📝</span>
                          <div>
                            <h3 className="cf-section-title">Description</h3>
                            <p className="cf-section-subtitle">What is this consult about?</p>
                          </div>
                        </div>
                        <div className="cf-field cf-field-wide">
                          <label className="cf-label">Describe your pet's issue or request <span className="cf-required">*</span></label>
                          <textarea className="cf-input cf-textarea" rows="4" maxLength={500} placeholder="e.g. Buddy has been scratching his ear for a few days and seems uncomfortable..." value={consultForm.description} onChange={(e) => updateConsultField('description', e.target.value)} required />
                          <span className={`cf-char-count ${consultForm.description.length >= 500 ? 'cf-char-count-full' : ''}`}>
                            {consultForm.description.length} / 500
                          </span>
                        </div>
                      </div>

                      {/* Preferred Date */}
                      <div className="cf-section">
                        <div className="cf-section-header">
                          <span className="cf-section-icon">📅</span>
                          <div>
                            <h3 className="cf-section-title">Preferred Date</h3>
                            <p className="cf-section-subtitle">When would you like the consult?</p>
                          </div>
                        </div>
                        <div className="cf-field cf-field-wide">
                          <label className="cf-label">Choose a date <span className="cf-required">*</span></label>
                          <input type="date" className="cf-input" min={todayLocal()} value={consultForm.preferredDate} onChange={(e) => updateConsultField('preferredDate', e.target.value)} required />
                        </div>
                      </div>

                      {/* Guardian Contact */}
                      <div className="cf-section">
                        <div className="cf-section-header">
                          <span className="cf-section-icon">📞</span>
                          <div>
                            <h3 className="cf-section-title">Contact Number</h3>
                            <p className="cf-section-subtitle">Where should we reach you to confirm the booking?</p>
                          </div>
                        </div>
                        <div className="cf-field cf-field-wide">
                          <label className="cf-label">Guardian Contact Number <span className="cf-required">*</span></label>
                          <input type="tel" className="cf-input" placeholder="(555) 123-4567" value={consultForm.phone} onChange={(e) => updateConsultField('phone', e.target.value)} required />
                        </div>
                      </div>

                      {/* Submit */}
                      <div className="cf-submit-row">
                        <div className="cf-submit-info">
                          {consultForm.serviceId ? (
                            <>
                              <span className="cf-submit-service">{apiConsultTypes.find(s => s.id === consultForm.serviceId)?.icon} {apiConsultTypes.find(s => s.id === consultForm.serviceId)?.name}</span>
                              <span className="cf-submit-price">${apiConsultTypes.find(s => s.id === consultForm.serviceId)?.price}</span>
                            </>
                          ) : (
                            <span className="cf-submit-hint">Please select a service</span>
                          )}
                        </div>
                        <button type="submit" className="cf-submit-btn" disabled={!canSubmitConsult}>
                          <span>Confirm Booking</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="consult-nav">
                    {consultStep === 1 ? (
                      <button type="button" className="wizard-btn wizard-btn-back" onClick={() => setConsultStep(0)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back
                      </button>
                    ) : (
                      <div />
                    )}
                    {consultStep === 0 ? (
                      <button
                        type="button"
                        className="wizard-btn wizard-btn-next"
                        onClick={() => setConsultStep(1)}
                        disabled={!consultForm.serviceId}
                      >
                        Next
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                </form>
                </div>
              </div>
            )}
          </section>
        )}

        <section id="contact" className="section contact-section">
          <div className="section-header">
            <h2>Get In Touch</h2>
            <p>Have questions? We'd love to hear from you.</p>
          </div>
          <div className="contact-grid">
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <h4>Visit Us</h4>
                  <p>123 Pet Street, Animal City, AC 12345</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div>
                  <h4>Call Us</h4>
                  <p>(555) 123-4567</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <div>
                  <h4>Email Us</h4>
                  <p>hello@petstore.com</p>
                </div>
              </div>
            </div>
            <form className="contact-form" onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target;
              const name = form[0].value;
              const email = form[1].value;
              const message = form[2].value;
              if (!name || !email || !message) { alert('Please fill in all fields.'); return; }
              try {
                await apiFetch('/contact', {
                  method: 'POST',
                  body: JSON.stringify({ name, email, message }),
                });
                alert('Message sent successfully! We will get back to you soon.');
                form.reset();
              } catch (err) {
                alert('Failed to send: ' + err.message);
              }
            }}>
              <input type="text" name="name" placeholder="Your Name" className="form-input" required />
              <input type="email" name="email" placeholder="Your Email" className="form-input" required />
              <textarea name="message" placeholder="Your Message" className="form-input form-textarea" rows="4" required />
              <button type="submit" className="btn btn-primary form-submit">
                Send Message
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* ===== Admin Login Page ===== */}
      {activeTab === 'admin' && !isAdmin && (
        <div className="admin-login-page">
          <div className="admin-login-container">
            <div className="admin-login-card">
              <div className="admin-login-header">
                <span className="admin-login-logo">🔐</span>
                <h2>Admin Login</h2>
                <p>Secure admin panel access</p>
              </div>
              <form className="admin-login-form" onSubmit={handleAdminLogin}>
                {adminLoginError && <div className="admin-login-error">{adminLoginError}</div>}
                <div className="admin-login-field">
                  <label htmlFor="admin-email">Email</label>
                  <input id="admin-email" type="email" className="admin-login-input" placeholder="admin@petstore.com" defaultValue="" required />
                </div>
                <div className="admin-login-field">
                  <label htmlFor="admin-password">Password</label>
                  <input id="admin-password" type="password" className="admin-login-input" placeholder="Enter your password" defaultValue="" required />
                </div>
                <button type="submit" className="admin-login-btn" disabled={adminLoginLoading}>
                  {adminLoginLoading ? (
                    <><span className="admin-login-spinner"></span> Signing in...</>
                  ) : (
                    'Sign In to Admin'
                  )}
                </button>
              </form>
              <div className="admin-login-footer">
                <button className="admin-login-back-btn" onClick={() => setActiveTab('pets')}>
                  ← Back to Store
                </button>
                {user && (
                  <button className="admin-login-back-btn" onClick={handleLogout} style={{color:'rgba(255,255,255,0.6)'}}>
                    Switch Account
                  </button>
                )}
              </div>
              <div className="admin-login-demo">
                <span>💡</span>
                <p>Demo: <strong>admin@petstore.com</strong> / <strong>admin123</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Admin Panel (Full Page) ===== */}
      {activeTab === 'admin' && isAdmin && (
        <div className="admin-app">
          {/* Admin Topbar */}
          <header className="admin-topbar">
            <div className="admin-topbar-left">
              <span className="admin-topbar-logo">🐾</span>
              <span className="admin-topbar-brand">PetStore Admin</span>
            </div>
            <div className="admin-topbar-center">
              <button className="admin-topbar-back-btn" onClick={() => setActiveTab('pets')}>
                ← Back to Store
              </button>
            </div>
            <div className="admin-topbar-right">
              <span className="admin-topbar-user">👋 {user?.name || 'Admin'}</span>
            </div>
          </header>
          <section className="section admin-section">
          <div className="admin-container">
            {/* Admin Sidebar */}
            <div className="admin-sidebar">
              <div className="admin-sidebar-header">
                <span className="admin-sidebar-icon">⚙️</span>
                <h3>Admin Panel</h3>
              </div>
              <div className="admin-sidebar-nav">
                <button className={`admin-nav-btn ${adminTab === 'dashboard' ? 'admin-nav-active' : ''}`} onClick={() => { setAdminTab('dashboard'); loadAdminDashboard(); loadAdminProducts(); loadAdminInventory(); loadAdminCategories(); loadAdminMessages(); loadAdminUsers(); }}>
                  📊 Dashboard
                </button>
                <button className={`admin-nav-btn ${adminTab === 'products' ? 'admin-nav-active' : ''}`} onClick={() => { setAdminTab('products'); loadAdminProducts(); }}>
                  📦 Products
                </button>
                <button className={`admin-nav-btn ${adminTab === 'inventory' ? 'admin-nav-active' : ''}`} onClick={() => { setAdminTab('inventory'); loadAdminInventory(); }}>
                  📋 Inventory
                </button>
                <button className={`admin-nav-btn ${adminTab === 'orders' ? 'admin-nav-active' : ''}`} onClick={() => { setAdminTab('orders'); loadAdminOrders(); }}>
                  🛒 Orders
                </button>
                <button className={`admin-nav-btn ${adminTab === 'messages' ? 'admin-nav-active' : ''}`} onClick={() => { setAdminTab('messages'); loadAdminMessages(); }}>
                  ✉️ Enquiry
                </button>
                <button className={`admin-nav-btn ${adminTab === 'consultations' ? 'admin-nav-active' : ''}`} onClick={() => { setAdminTab('consultations'); loadAdminConsultations(); }}>
                  🩺 Consults
                </button>
                <button className={`admin-nav-btn ${adminTab === 'users' ? 'admin-nav-active' : ''}`} onClick={() => { setAdminTab('users'); loadAdminUsers(); }}>
                  👥 Users
                </button>
                <button className={`admin-nav-btn ${adminTab === 'categories' ? 'admin-nav-active' : ''}`} onClick={() => { setAdminTab('categories'); loadAdminCategories(); }}>
                  🏷️ Categories
                </button>
              </div>
            </div>

            {/* Admin Content */}
            <div className="admin-content">
              {toast && <div className={`admin-alert ${toast.type==='error'?'admin-alert-error':'admin-alert-success'}`} style={{marginBottom:16}}>{toast.msg}</div>}
              {/* Dashboard */}
              {adminTab === 'dashboard' && (
                <>
                  <div className="admin-page-header">
                    <h2 className="admin-page-title">🏠 Admin Home</h2>
                    <button className="btn btn-primary" onClick={()=>{loadAdminDashboard();loadAdminProducts();loadAdminInventory();loadAdminMessages();loadAdminUsers();}}>🔄 Refresh</button>
                  </div>
                  {adminDashboard ? (
                    <>
                      {/* ===== 1. STATS OVERVIEW ===== */}
                      <div className="admin-stats-grid">
                        <div className="admin-stat-card admin-stat-blue" style={{cursor:'pointer'}} onClick={()=>setAdminTab('products')} role="button" tabIndex={0} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setAdminTab('products')}>
                          <span className="admin-stat-icon">🐾</span>
                          <div><span className="admin-stat-value">{adminDashboard.stats.total_pets}</span><span className="admin-stat-label">Pets</span></div>
                        </div>
                        <div className="admin-stat-card admin-stat-green" style={{cursor:'pointer'}} onClick={()=>setAdminTab('products')} role="button" tabIndex={0} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setAdminTab('products')}>
                          <span className="admin-stat-icon">🍖</span>
                          <div><span className="admin-stat-value">{adminDashboard.stats.total_foods}</span><span className="admin-stat-label">Foods</span></div>
                        </div>
                        <div className="admin-stat-card admin-stat-purple" style={{cursor:'pointer'}} onClick={()=>setAdminTab('orders')} role="button" tabIndex={0} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setAdminTab('orders')}>
                          <span className="admin-stat-icon">🛒</span>
                          <div><span className="admin-stat-value">{adminDashboard.stats.total_orders}</span><span className="admin-stat-label">Orders</span></div>
                        </div>
                        <div className="admin-stat-card admin-stat-red" style={{cursor:'pointer'}} onClick={()=>setAdminTab('orders')} role="button" tabIndex={0} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setAdminTab('orders')}>
                          <span className="admin-stat-icon">⏳</span>
                          <div><span className="admin-stat-value">{adminDashboard.stats.pending_orders}</span><span className="admin-stat-label">Pending</span></div>
                        </div>
                        <div className="admin-stat-card admin-stat-yellow" style={{cursor:'pointer'}} onClick={()=>setAdminTab('inventory')} role="button" tabIndex={0} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setAdminTab('inventory')}>
                          <span className="admin-stat-icon">⚠️</span>
                          <div><span className="admin-stat-value">{adminDashboard.stats.low_stock_items}</span><span className="admin-stat-label">Low Stock</span></div>
                        </div>
                        <div className="admin-stat-card admin-stat-teal" style={{cursor:'pointer'}} onClick={()=>setAdminTab('users')} role="button" tabIndex={0} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setAdminTab('users')}>
                          <span className="admin-stat-icon">👥</span>
                          <div><span className="admin-stat-value">{adminDashboard.stats.total_users}</span><span className="admin-stat-label">Users</span></div>
                        </div>
                        <div className="admin-stat-card" style={{background:'linear-gradient(135deg,#f093fb,#f5576c)',cursor:'pointer'}} onClick={()=>setAdminTab('categories')} role="button" tabIndex={0} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setAdminTab('categories')}>
                          <span className="admin-stat-icon">🏷️</span>
                          <div><span className="admin-stat-value">{adminDashboard.stats.total_categories||0}</span><span className="admin-stat-label">Categories</span></div>
                        </div>
                      </div>

                      {/* ===== 2. FEATURE QUICK ACTIONS ===== */}
                      <h3 className="admin-section-title">⚡ Feature Quick Access</h3>
                      <div className="admin-stats-grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',marginBottom:24}}>
                        {[
                          {icon:'📦',label:'Add Product',tab:'products',color:'blue',desc:'Create new pet or food item',action:'Add'},
                          {icon:'📋',label:'View Products',tab:'products',color:'green',desc:'Search, filter & sort inventory',action:'View'},
                          {icon:'✏️',label:'Update Product',tab:'products',color:'purple',desc:'Edit prices, stock & details',action:'Edit'},
                          {icon:'🗑️',label:'Delete Product',tab:'products',color:'red',desc:'Archive discontinued items',action:'Delete'},
                          {icon:'📦',label:'Inventory Mgmt',tab:'inventory',color:'orange',desc:'Restock, adjust & history',action:'Manage'},
                          {icon:'🏷️',label:'Categories',tab:'categories',color:'pink',desc:'Create & manage categories',action:'CRUD'},
                        ].map((a,i)=>(
                          <div key={i} className={`admin-stat-card admin-stat-${a.color}`} style={{cursor:'pointer'}} onClick={()=>setAdminTab(a.tab)} role="button" tabIndex={0} onKeyDown={e=>(e.key==='Enter'||e.key===' ')&&setAdminTab(a.tab)}>
                            <span className="admin-stat-icon">{a.icon}</span>
                            <div>
                              <span className="admin-stat-value" style={{fontSize:'0.9rem'}}>{a.label}</span>
                              <span className="admin-stat-label" style={{fontSize:'0.65rem',opacity:0.9,textTransform:'none',letterSpacing:0}}>{a.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* ===== 3. PRODUCTS OVERVIEW ===== */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
                        {/* Products Section */}
                        <div style={{background:'var(--white)',borderRadius:'var(--radius-md)',padding:20,border:'1px solid var(--gray-200)',boxShadow:'var(--shadow-sm)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                            <h3 style={{fontSize:'1rem',fontWeight:700}}>📦 Recent Products</h3>
                            <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:'0.8rem'}} onClick={()=>setAdminTab('products')}>View All</button>
                          </div>
                          {adminProducts.length>0?<div style={{display:'flex',flexDirection:'column',gap:8}}>
                            {adminProducts.slice(0,5).map(p=>(
                              <div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--gray-100)',borderRadius:'var(--radius-sm)'}}>
                                <span style={{fontSize:'1.2rem'}}>🐾</span>
                                <div style={{flex:1}}>
                                  <div style={{fontWeight:600,fontSize:'0.85rem'}}>{p.name}</div>
                                  <div style={{fontSize:'0.75rem',color:'var(--gray-400)'}}>{p.breed}</div>
                                </div>
                                <span className={`admin-cat-tag`}>{p.category}</span>
                                {p.quantity<=3?<span className="admin-low-badge">Low</span>:null}
                              </div>
                            ))}
                          </div>:<p className="admin-empty">Load products to see them here</p>}
                        </div>

                        {/* Inventory & Stock Alerts */}
                        <div style={{background:'var(--white)',borderRadius:'var(--radius-md)',padding:20,border:'1px solid var(--gray-200)',boxShadow:'var(--shadow-sm)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                            <h3 style={{fontSize:'1rem',fontWeight:700}}>⚠️ Stock Alerts</h3>
                            <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:'0.8rem'}} onClick={()=>setAdminTab('inventory')}>Manage</button>
                          </div>
                          {(adminInventory.low_stock_count||0)>0?<>
                            <div className="admin-alert" style={{marginBottom:12}}>⚠️ <strong>{adminInventory.low_stock_count}</strong> item(s) low on stock</div>
                            <div style={{display:'flex',flexDirection:'column',gap:8}}>
                              {(adminInventory.low_stock||[]).slice(0,5).map((item,i)=>(
                                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'rgba(255,217,61,0.1)',borderRadius:'var(--radius-sm)',border:'1px solid rgba(255,217,61,0.2)'}}>
                                  <span style={{fontSize:'1.2rem'}}>{item.type==='pet'?'🐾':'🍖'}</span>
                                  <div style={{flex:1}}>
                                    <div style={{fontWeight:600,fontSize:'0.85rem'}}>{item.name}</div>
                                    <div style={{fontSize:'0.75rem',color:'var(--gray-400)'}}>Qty: {item.quantity||0} · {item.category}</div>
                                  </div>
                                  <button className="admin-btn-sm admin-btn-restock" onClick={()=>setAdminTab('inventory')}>Restock</button>
                                </div>
                              ))}
                            </div>
                          </>:<p className="admin-empty" style={{padding:20}}>✅ All items in stock</p>}
                        </div>
                      </div>

                      {/* ===== 4. CATEGORIES OVERVIEW ===== */}
                      <div style={{background:'var(--white)',borderRadius:'var(--radius-md)',padding:20,marginBottom:24,border:'1px solid var(--gray-200)',boxShadow:'var(--shadow-sm)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                          <h3 style={{fontSize:'1rem',fontWeight:700}}>🏷️ Categories</h3>
                          <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:'0.8rem'}} onClick={()=>setAdminTab('categories')}>Manage</button>
                        </div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                          {(adminCategories.defaults?.pets||[]).map(c=>(
                            <span key={c.id} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',background:'rgba(108,99,255,0.08)',borderRadius:50,fontSize:'0.78rem',fontWeight:600}}>{c.icon} {c.name}</span>
                          ))}
                          <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px',background:'var(--gray-200)',borderRadius:50,fontSize:'0.78rem',fontWeight:600}}>⋯</span>
                        </div>
                        <p style={{fontSize:'0.8rem',color:'var(--gray-400)'}}>
                          {adminCategories.custom?.length||0} custom categories · 
                          <button className="btn-link" style={{background:'none',border:'none',color:'var(--primary)',cursor:'pointer',fontSize:'0.8rem',fontWeight:600}} onClick={()=>setAdminTab('categories')}>Create new →</button>
                        </p>
                      </div>

                      {/* ===== 5. RECENT ORDERS ===== */}
                      <div style={{background:'var(--white)',borderRadius:'var(--radius-md)',padding:20,marginBottom:24,border:'1px solid var(--gray-200)',boxShadow:'var(--shadow-sm)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                          <h3 style={{fontSize:'1rem',fontWeight:700}}>🛒 Recent Orders</h3>
                          <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:'0.8rem'}} onClick={()=>setAdminTab('orders')}>View All</button>
                        </div>
                        <div className="admin-table-wrap">
                          <table className="admin-table">
                            <thead><tr><th>Order ID</th><th>Status</th><th>Total</th><th>Payment</th><th>Date</th></tr></thead>
                            <tbody>
                              {(adminDashboard.recent_orders||[]).map(o=>(
                                <tr key={o.id}>
                                  <td className="admin-code">#{o.id}</td>
                                  <td><span className={`admin-status-badge admin-status-${o.status}`}>{o.status}</span></td>
                                  <td className="admin-price">${o.total?.toFixed(2)}</td>
                                  <td>{o.payment_status==='paid'?'✅ Paid':'⏳'}</td>
                                  <td className="admin-date">{new Date(o.created_at).toLocaleDateString()}</td>
                                </tr>
                              ))}
                              {(!adminDashboard.recent_orders||adminDashboard.recent_orders.length===0)&&(
                                <tr><td colSpan={5} className="admin-empty">No orders yet</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ===== 6. RECENT MESSAGES + USERS ===== */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
                        {/* Enquiry */}
                        <div style={{background:'var(--white)',borderRadius:'var(--radius-md)',padding:20,border:'1px solid var(--gray-200)',boxShadow:'var(--shadow-sm)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                            <h3 style={{fontSize:'1rem',fontWeight:700}}>✉️ Recent Enquiries</h3>
                            <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:'0.8rem'}} onClick={()=>setAdminTab('messages')}>View All</button>
                          </div>
                          {adminMessages.length>0?<div style={{display:'flex',flexDirection:'column',gap:8}}>
                            {adminMessages.slice(0,4).map(msg=>(
                              <div key={msg.id} style={{padding:'8px 10px',background:'var(--gray-100)',borderRadius:'var(--radius-sm)'}}>
                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                                  <strong style={{fontSize:'0.8rem'}}>{msg.name}</strong>
                                  <span className="admin-date">{new Date(msg.created_at).toLocaleDateString()}</span>
                                </div>
                                <p style={{fontSize:'0.78rem',color:'var(--gray-500)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{msg.message}</p>
                              </div>
                            ))}
                          </div>:<p className="admin-empty" style={{padding:20}}>No enquiries yet</p>}
                        </div>

                        {/* Users */}
                        <div style={{background:'var(--white)',borderRadius:'var(--radius-md)',padding:20,border:'1px solid var(--gray-200)',boxShadow:'var(--shadow-sm)'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                            <h3 style={{fontSize:'1rem',fontWeight:700}}>👥 Recent Users</h3>
                            <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:'0.8rem'}} onClick={()=>setAdminTab('users')}>View All</button>
                          </div>
                          {adminUsers.length>0?<div style={{display:'flex',flexDirection:'column',gap:8}}>
                            {adminUsers.slice(0,4).map(u=>(
                              <div key={u.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--gray-100)',borderRadius:'var(--radius-sm)'}}>
                                <span className="admin-avatar-sm">{u.avatar}</span>
                                <div style={{flex:1}}>
                                  <div style={{fontWeight:600,fontSize:'0.85rem'}}>{u.name}</div>
                                  <div style={{fontSize:'0.75rem',color:'var(--gray-400)'}}>{u.email}</div>
                                </div>
                                {u.is_admin?<span className="admin-role-badge">⭐ Admin</span>:null}
                              </div>
                            ))}
                          </div>:<p className="admin-empty" style={{padding:20}}>No users yet</p>}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="admin-loading" style={{textAlign:'center',padding:60}}>
                      <p style={{fontSize:'1.1rem',color:'var(--gray-500)',marginBottom:16}}>📊 Loading admin dashboard...</p>
                      <button className="btn btn-primary" onClick={()=>{loadAdminDashboard();loadAdminProducts();loadAdminInventory();loadAdminCategories();loadAdminMessages();loadAdminUsers();}}>Load Dashboard</button>
                    </div>
                  )}
                </>
              )}

              {/* Products */}
              {adminTab === 'products' && (
                <>
                  <div className="admin-page-header">
                    <h2 className="admin-page-title">📦 Products</h2>
                    <div className="admin-page-actions">
                      <button className="btn btn-primary" onClick={() => { setShowAdminForm('add'); setAdminFormData({ type: 'pet', name: '', breed: '', category: 'dog', age: '', price: '', image: '', description: '', gender: 'male', vaccinated: true, in_stock: true }); setAdminFormType('pet'); }}>
                        + Add Pet
                      </button>
                      <button className="btn btn-primary" onClick={() => { setShowAdminForm('add'); setAdminFormData({ type: 'food', name: '', category: 'dog', brand: '', weight: '', price: '', image: '', description: '', rating: 0, in_stock: true }); setAdminFormType('food'); }}>
                        + Add Food
                      </button>
                    </div>
                  </div>

                  <div className="admin-filters">
                    <input className="admin-search-input" placeholder="Search products..." value={adminSearch} onChange={e => { setAdminSearch(e.target.value); setTimeout(loadAdminProducts, 300); }} />
                    <select className="admin-filter-select" value={adminCategory} onChange={e => { setAdminCategory(e.target.value); setTimeout(loadAdminProducts, 50); }}>
                      <option value="all">All Categories</option>
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                      <option value="bird">Bird</option>
                      <option value="fish">Fish</option>
                      <option value="rabbit">Rabbit</option>
                      <option value="reptile">Reptile</option>
                      <option value="treats">Treats</option>
                    </select>
                    <select className="admin-filter-select" value={adminStatus} onChange={e => { setAdminStatus(e.target.value); setTimeout(loadAdminProducts, 50); }}>
                      <option value="all">All Status</option>
                      <option value="in_stock">In Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                    </select>
                    <select className="admin-filter-select" value={adminSort} onChange={e => { setAdminSort(e.target.value); setTimeout(loadAdminProducts, 50); }}>
                      <option value="name">Sort: Name</option>
                      <option value="price">Sort: Price</option>
                      <option value="created_at">Sort: Newest</option>
                    </select>
                  </div>

                  {/* Pets Table */}
                  <h3 className="admin-section-title">Pets ({adminProducts.length})</h3>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Name</th>
                          <th>Breed</th>
                          <th>Category</th>
                          <th>Age</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminProducts.map(p => (
                          <tr key={p.id}>
                            <td><img src={p.image} alt={p.name} className="admin-thumb" /></td>
                            <td className="admin-name">{p.name}</td>
                            <td>{p.breed}</td>
                            <td><span className="admin-cat-tag">{p.category}</span></td>
                            <td>{p.age}</td>
                            <td className="admin-price">${p.price?.toLocaleString()}</td>
                            <td>{p.in_stock ? <span className="admin-instock">✓ In Stock</span> : <span className="admin-outofstock">✕ Out</span>}</td>
                            <td>
                              <div className="admin-actions">
                                <button className="admin-btn-sm" title="View" onClick={() => setProdDetail({item:p,type:'pet'})}>👁️</button>
                                <button className="admin-btn-sm" title="Edit" onClick={() => { setShowAdminForm('edit'); setAdminFormType('pet'); setAdminFormData(p); }}>✏️</button>
                                <button className="admin-btn-sm admin-btn-danger" title="Delete" onClick={async () => {
                                  if (confirm('Delete ' + p.name + '?')) {
                                    try { await adminFetch('/pets/' + p.id, { method: 'DELETE' }); loadAdminProducts(); } catch (e) { alert(e.message); }
                                  }
                                }}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {adminProducts.length === 0 && (
                          <tr><td colSpan={8} className="admin-empty">No pets found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Foods Table */}
                  <h3 className="admin-section-title">Pet Foods ({adminFoods.length})</h3>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Name</th>
                          <th>Brand</th>
                          <th>Category</th>
                          <th>Weight</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminFoods.map(f => (
                          <tr key={f.id}>
                            <td><img src={f.image} alt={f.name} className="admin-thumb" /></td>
                            <td className="admin-name">{f.name}</td>
                            <td>{f.brand}</td>
                            <td><span className="admin-cat-tag">{f.category}</span></td>
                            <td>{f.weight}</td>
                            <td className="admin-price">${f.price?.toFixed(2)}</td>
                            <td>{f.in_stock ? <span className="admin-instock">✓ In Stock</span> : <span className="admin-outofstock">✕ Out</span>}</td>
                            <td>
                              <div className="admin-actions">
                                <button className="admin-btn-sm" title="View" onClick={() => setProdDetail({item:f,type:'food'})}>👁️</button>
                                <button className="admin-btn-sm" title="Edit" onClick={() => { setShowAdminForm('edit'); setAdminFormType('food'); setAdminFormData(f); }}>✏️</button>
                                <button className="admin-btn-sm admin-btn-danger" title="Delete" onClick={async () => {
                                  if (confirm('Delete ' + f.name + '?')) {
                                    try { await adminFetch('/foods/' + f.id, { method: 'DELETE' }); loadAdminProducts(); } catch (e) { alert(e.message); }
                                  }
                                }}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {adminFoods.length === 0 && (
                          <tr><td colSpan={8} className="admin-empty">No foods found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Product Detail Modal */}
              {prodDetail&&<>
                <div className="cart-overlay" onClick={()=>setProdDetail(null)}/>
                <div className="checkout-modal" style={{maxWidth:'520px'}}>
                  <button className="auth-close" onClick={()=>setProdDetail(null)}>✕</button>
                  <div className="checkout-header">
                    {prodDetail.item.image&&<img src={prodDetail.item.image} alt="" style={{width:70,height:70,borderRadius:'var(--radius-sm)',objectFit:'cover',marginBottom:8,display:'block',margin:'0 auto 8px'}}/>}
                    <h2>{prodDetail.item.name}</h2>
                    <p>{prodDetail.type==='pet'?'🐾 Pet':'🍖 Pet Food'}</p>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    {Object.entries(prodDetail.item).filter(([k])=>!['id','created_at','updated_at','images'].includes(k)).map(([k,v])=>(
                      <div key={k} style={{padding:'8px 10px',background:'var(--gray-100)',borderRadius:'var(--radius-sm)'}}>
                        <div style={{fontSize:'0.7rem',color:'var(--gray-400)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{k.replace(/_/g,' ')}</div>
                        <div style={{fontSize:'0.85rem',fontWeight:600,color:'var(--dark)',wordBreak:'break-word'}}>{v?.toString()||'—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>}

              {/* Product Form Modal */}
              {showAdminForm && (
                <>
                  <div className="cart-overlay" onClick={() => setShowAdminForm(null)} />
                  <div className="checkout-modal">
                    <button className="auth-close" onClick={() => setShowAdminForm(null)}>✕</button>
                    <div className="checkout-header">
                      <span className="checkout-logo">{showAdminForm === 'add' ? '✨' : '✏️'}</span>
                      <h2>{showAdminForm === 'add' ? 'Add' : 'Edit'} {adminFormType === 'pet' ? 'Pet' : 'Food'}</h2>
                    </div>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const type = adminFormType;
                        const endpoint = type === 'pet' ? '/pets' : '/foods';
                        const method = showAdminForm === 'add' ? 'POST' : 'PUT';
                        const url = showAdminForm === 'edit' ? endpoint + '/' + adminFormData.id : endpoint;
                        const body = { ...adminFormData };
                        delete body.id; delete body.created_at; delete body.updated_at;
                        if (body.price) body.price = parseFloat(body.price);
                        if (body.discount_price) body.discount_price = parseFloat(body.discount_price);
                        if (body.quantity) body.quantity = parseInt(body.quantity);
                        if (type === 'pet') {
                          body.vaccinated = Boolean(body.vaccinated);
                        }
                        body.in_stock = body.status === 'available';
                        await adminFetch(url, { method, body: JSON.stringify(body) });
                        setShowAdminForm(null);
                        loadAdminProducts();
                      } catch (err) { alert('Failed: ' + err.message); }
                    }}>
                      <div className="co-fields">
                        <div className="co-field co-full">
                          <label>Product Name *</label>
                          <input className="co-input" value={adminFormData.name || ''} onChange={e => setAdminFormData({...adminFormData, name: e.target.value})} required />
                        </div>
                        {adminFormType === 'pet' ? (
                          <>
                            <div className="co-field"><label>Breed *</label><input className="co-input" value={adminFormData.breed || ''} onChange={e => setAdminFormData({...adminFormData, breed: e.target.value})} required /></div>
                            <div className="co-field">
                              <label>Category *</label>
                              <select className="co-input" value={adminFormData.category || 'dog'} onChange={e => setAdminFormData({...adminFormData, category: e.target.value})}>
                                <option value="dog">Dog</option>
                                <option value="cat">Cat</option>
                                <option value="bird">Bird</option>
                                <option value="fish">Fish</option>
                                <option value="rabbit">Rabbit</option>
                                <option value="reptile">Reptile</option>
                              </select>
                            </div>
                            <div className="co-field"><label>Age *</label><input className="co-input" value={adminFormData.age || ''} onChange={e => setAdminFormData({...adminFormData, age: e.target.value})} required /></div>
                            <div className="co-field">
                              <label>Gender</label>
                              <select className="co-input" value={adminFormData.gender || 'male'} onChange={e => setAdminFormData({...adminFormData, gender: e.target.value})}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                              </select>
                            </div>
                            <div className="co-field"><label>Vaccinated</label>
                              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                                <input type="checkbox" checked={adminFormData.vaccinated || false} onChange={e => setAdminFormData({...adminFormData, vaccinated: e.target.checked})} /> Yes
                              </label>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="co-field"><label>Brand *</label><input className="co-input" value={adminFormData.brand || ''} onChange={e => setAdminFormData({...adminFormData, brand: e.target.value})} required /></div>
                            <div className="co-field">
                              <label>Category *</label>
                              <select className="co-input" value={adminFormData.category || 'dog'} onChange={e => setAdminFormData({...adminFormData, category: e.target.value})}>
                                <option value="dog">Dog Food</option>
                                <option value="cat">Cat Food</option>
                                <option value="bird">Bird Food</option>
                                <option value="fish">Fish Food</option>
                                <option value="rabbit">Rabbit Food</option>
                                <option value="treats">Treats</option>
                                <option value="reptile">Reptile</option>
                              </select>
                            </div>
                            <div className="co-field"><label>Weight</label><input className="co-input" placeholder="e.g. 15 lbs" value={adminFormData.weight || ''} onChange={e => setAdminFormData({...adminFormData, weight: e.target.value})} /></div>
                          </>
                        )}
                        <div className="co-field"><label>Supplier</label><input className="co-input" placeholder="Supplier name" value={adminFormData.supplier || ''} onChange={e => setAdminFormData({...adminFormData, supplier: e.target.value})} /></div>
                        {adminFormType === 'food' && (
                          <div className="co-field"><label>Expiry Date</label><input type="date" className="co-input" value={adminFormData.expiry_date || ''} onChange={e => setAdminFormData({...adminFormData, expiry_date: e.target.value})} /></div>
                        )}
                        <div className="co-field"><label>Price ($) *</label><input type="number" step="0.01" min="0" className="co-input" value={adminFormData.price || ''} onChange={e => setAdminFormData({...adminFormData, price: e.target.value})} required /></div>
                        <div className="co-field admin-discount-field">
                          <label>Discount Price ($)</label>
                          <input type="number" step="0.01" min="0" className="co-input" placeholder="Leave empty for no discount" value={adminFormData.discount_price || ''} onChange={e => setAdminFormData({...adminFormData, discount_price: e.target.value})} />
                        </div>
                        <div className="co-field"><label>Discount Start</label><input type="date" className="co-input" value={adminFormData.discount_start || ''} onChange={e => setAdminFormData({...adminFormData, discount_start: e.target.value})} /></div>
                        <div className="co-field"><label>Discount End</label><input type="date" className="co-input" value={adminFormData.discount_end || ''} onChange={e => setAdminFormData({...adminFormData, discount_end: e.target.value})} /></div>
                        <div className="co-field"><label>Quantity in Stock</label><input type="number" min="0" className="co-input" value={adminFormData.quantity ?? 1} onChange={e => setAdminFormData({...adminFormData, quantity: parseInt(e.target.value) || 0})} /></div>
                        <div className="co-field">
                          <label>Status</label>
                          <select className="co-input" value={adminFormData.status || 'available'} onChange={e => setAdminFormData({...adminFormData, status: e.target.value})}>
                            <option value="available">✅ Available</option>
                            <option value="out_of_stock">❌ Out of Stock</option>
                            <option value="discontinued">⛔ Discontinued</option>
                          </select>
                        </div>
                        <div className="co-field co-full"><label>Image URL</label><input className="co-input" placeholder="https://..." value={adminFormData.image || ''} onChange={e => setAdminFormData({...adminFormData, image: e.target.value})} /></div>
                        <div className="co-field co-full"><label>Description</label><textarea className="co-input" rows="3" value={adminFormData.description || ''} onChange={e => setAdminFormData({...adminFormData, description: e.target.value})} /></div>
                      </div>
                      <div className="checkout-nav" style={{marginTop:20}}>
                        <button type="button" className="wizard-btn wizard-btn-back" onClick={() => setShowAdminForm(null)}>Cancel</button>
                        <button type="submit" className="btn btn-primary co-place-order">
                          {showAdminForm === 'add' ? '✨ Create Product' : '💾 Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>
                </>
              )}

              {/* Inventory */}
              {adminTab === 'inventory' && (
                <>
                  <div className="admin-page-header">
                    <h2 className="admin-page-title">📋 Inventory</h2>
                    <div className="admin-page-actions">
                      <button className="btn btn-primary" onClick={()=>{setShowHistory(true);loadInvHistory();}}>📜 History</button>
                      <button className="btn btn-primary" onClick={loadAdminInventory}>🔄 Refresh</button>
                    </div>
                  </div>
                  {(adminInventory.low_stock_count||0) > 0 && (
                    <div className="admin-alert">
                      ⚠️ <strong>{adminInventory.low_stock_count}</strong> item(s) low on stock. Restock below.
                    </div>
                  )}
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Type</th>
                          <th>Qty</th>
                          <th>Status</th>
                          <th>Added</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(adminInventory.items || []).map((item, i) => (
                          <tr key={item.id + item.type + i} className={(item.quantity||0)<=0?'admin-row-warning':''}>
                            <td className="admin-name">{item.name}</td>
                            <td><span className="admin-cat-tag">{item.category}</span></td>
                            <td>{item.type === 'pet' ? '🐾 Pet' : '🍖 Food'}</td>
                            <td><strong>{item.quantity??0}</strong>{(item.quantity||0)<=3&&(item.quantity>0)&&<span className="admin-low-badge"> Low</span>}</td>
                            <td>{(item.quantity||0)>0?<span className="admin-instock">✅ In Stock</span>:<span className="admin-outofstock">❌ Out</span>}</td>
                            <td className="admin-date">{new Date(item.created_at).toLocaleDateString()}</td>
                            <td>
                              <div className="admin-actions">
                                <button className="admin-btn-sm admin-btn-restock" onClick={()=>setShowAdjust({id:item.id,type:item.type,name:item.name,qty:item.quantity||0})}>⚖️ Adjust</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {(!adminInventory.items || adminInventory.items.length === 0) && (
                          <tr><td colSpan={7} className="admin-empty"><button className="btn btn-primary" onClick={loadAdminInventory}>Load Inventory</button></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Adjust Modal */}
                  {showAdjust&&<>
                    <div className="cart-overlay" onClick={()=>setShowAdjust(null)}/>
                    <div className="checkout-modal" style={{maxWidth:'450px'}}>
                      <button className="auth-close" onClick={()=>setShowAdjust(null)}>✕</button>
                      <div className="checkout-header"><span className="checkout-logo">⚖️</span><h2>Adjust: {showAdjust.name}</h2></div>
                      <div className="co-fields">
                        <div className="co-field co-full"><label>New Quantity</label><input className="co-input" type="number" min="0" value={showAdjust.qty} onChange={e=>setShowAdjust({...showAdjust,qty:e.target.value})}/></div>
                        <div className="co-field co-full"><label>Note</label><input className="co-input" value={showAdjust.note||''} onChange={e=>setShowAdjust({...showAdjust,note:e.target.value})} placeholder="Reason for adjustment"/></div>
                      </div>
                      <div className="checkout-nav" style={{justifyContent:'flex-end'}}>
                        <button className="btn" onClick={()=>setShowAdjust(null)}>Cancel</button>
                        <button className="btn btn-primary" style={{marginLeft:8}} onClick={async()=>{try{await adminFetch('/inventory/adjust',{method:'POST',body:JSON.stringify({type:showAdjust.type,id:showAdjust.id,quantity:parseInt(showAdjust.qty)||0,note:showAdjust.note||''})});showToast('Adjusted '+showAdjust.name);setShowAdjust(null);loadAdminInventory();}catch(e){alert(e.message);}}}>💾 Save</button>
                      </div>
                    </div>
                  </>}

                  {/* History Modal */}
                  {showHistory&&<>
                    <div className="cart-overlay" onClick={()=>setShowHistory(false)}/>
                    <div className="checkout-modal" style={{maxWidth:'550px'}}>
                      <button className="auth-close" onClick={()=>setShowHistory(false)}>✕</button>
                      <div className="checkout-header"><span className="checkout-logo">📜</span><h2>Inventory History</h2></div>
                      <div style={{maxHeight:'50vh',overflowY:'auto'}}>
                        {invHistory.length>0?invHistory.map(h=>(
                          <div key={h.id} style={{padding:'10px 0',borderBottom:'1px solid #eee',fontSize:'0.85rem'}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                              <span className={`admin-status-badge admin-status-${h.action==='restock'?'confirmed':h.action==='adjustment'?'processing':'cancelled'}`}>{h.action}</span>
                              <span className="admin-date">{new Date(h.created_at).toLocaleString()}</span>
                            </div>
                            <strong>{h.item_name}</strong> ({h.item_type})<br/>
                            {h.previous_quantity!==undefined&&h.new_quantity!==undefined&&<>Qty: {h.previous_quantity} → {h.new_quantity}</>}
                            {h.note&&<span> · {h.note}</span>}
                          </div>
                        )):<p className="admin-empty">No history</p>}
                      </div>
                    </div>
                  </>}
                </>
              )}

              {/* Orders */}
              {adminTab === 'orders' && (
                <>
                  <div className="admin-page-header">
                    <h2 className="admin-page-title">🛒 Orders</h2>
                    <button className="btn btn-primary" onClick={loadAdminOrders}>🔄 Refresh</button>
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Payment</th>
                          <th>Status</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminOrders.map(o => (
                          <tr key={o.id}>
                            <td className="admin-code">#{o.id.slice(-8)}</td>
                            <td>{o.user_name || o.shipping_name}<br /><small>{o.user_email || o.shipping_email}</small></td>
                            <td>{o.items?.length || 0} item(s)</td>
                            <td className="admin-price">${o.total?.toFixed(2)}</td>
                            <td>{o.payment_status === 'paid' ? '✅' : '⏳'}</td>
                            <td>
                              <select className="admin-status-select" value={o.status} onChange={async (e) => {
                                try {
                                  await adminFetch('/orders/' + o.id + '/status', { method: 'PUT', body: JSON.stringify({ status: e.target.value }) });
                                  loadAdminOrders();
                                } catch (err) { alert(err.message); }
                              }}>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="admin-date">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td>
                              <span className={`admin-status-badge admin-status-${o.status}`}>{o.status}</span>
                            </td>
                          </tr>
                        ))}
                        {adminOrders.length === 0 && (
                          <tr><td colSpan={8} className="admin-empty"><button className="btn btn-primary" onClick={loadAdminOrders}>Load Orders</button></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Enquiry */}
              {adminTab === 'messages' && (
                <>
                  <div className="admin-page-header">
                    <h2 className="admin-page-title">✉️ Contact Enquiries</h2>
                    <button className="btn btn-primary" onClick={loadAdminMessages}>🔄 Refresh</button>
                  </div>
                  <div className="admin-messages">
                    {adminMessages.map(msg => (
                      <div key={msg.id} className="admin-msg-card">
                        <div className="admin-msg-header">
                          <div>
                            <strong>{msg.name}</strong>
                            <span className="admin-msg-email">{msg.email}</span>
                          </div>
                          <div className="admin-msg-actions">
                            <span className="admin-date">{new Date(msg.created_at).toLocaleString()}</span>
                            <button className="admin-btn-sm admin-btn-danger" onClick={async () => {
                              if (confirm('Delete this enquiry?')) {
                                try { await adminFetch('/messages/' + msg.id, { method: 'DELETE' }); loadAdminMessages(); } catch (e) { alert(e.message); }
                              }
                            }}>🗑️</button>
                          </div>
                        </div>
                        <p className="admin-msg-text">{msg.message}</p>
                      </div>
                    ))}
                    {adminMessages.length === 0 && (
                      <div className="admin-empty"><button className="btn btn-primary" onClick={loadAdminMessages}>Load Enquiries</button></div>
                    )}
                  </div>
                </>
              )}

              {/* Consults */}
              {adminTab === 'consultations' && (
                <>
                  <div className="admin-page-header">
                    <h2 className="admin-page-title">🩺 Consults</h2>
                    <button className="btn btn-primary" onClick={loadAdminConsultations}>🔄 Refresh</button>
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Pet</th>
                          <th>Service</th>
                          <th>Preferred Date</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Booked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminConsultations.map(c => (
                          <tr key={c.id}>
                            <td className="admin-code">#{c.id}</td>
                            <td>{c.user_name || 'Guest'}<br /><small>{c.user_email || '—'}</small></td>
                            <td className="admin-name">{c.pet_name}<br /><small>{c.pet_type}{c.pet_breed ? ', ' + c.pet_breed : ''} · {c.pet_age} mo</small></td>
                            <td>{c.service_icon} {c.service_name || '—'}</td>
                            <td>
                              <span className="admin-consult-date">
                                📅 {formatConsultDate(c.preferred_date) || 'Not set'}
                              </span>
                            </td>
                            <td>{c.phone || '—'}</td>
                            <td>
                              <select className="admin-status-select" value={c.status} onChange={async (e) => {
                                try {
                                  await apiFetch('/consultations/' + c.id + '/status', { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) });
                                  loadAdminConsultations();
                                } catch (err) { alert(err.message); }
                              }}>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td className="admin-date">{new Date(c.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {adminConsultations.length === 0 && (
                          <tr><td colSpan={8} className="admin-empty"><button className="btn btn-primary" onClick={loadAdminConsultations}>Load Consults</button></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Users */}
              {adminTab === 'users' && (
                <>
                  <div className="admin-page-header">
                    <h2 className="admin-page-title">👥 Users</h2>
                    <button className="btn btn-primary" onClick={loadAdminUsers}>🔄 Refresh</button>
                  </div>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Avatar</th>
                          <th>Role</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map(u => (
                          <tr key={u.id}>
                            <td className="admin-name">{u.name}</td>
                            <td>{u.email}</td>
                            <td><span className="admin-avatar-sm">{u.avatar}</span></td>
                            <td>{u.is_admin ? <span className="admin-role-badge">⭐ Admin</span> : <span className="admin-role-user">User</span>}</td>
                            <td className="admin-date">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                        {adminUsers.length === 0 && (
                          <tr><td colSpan={5} className="admin-empty"><button className="btn btn-primary" onClick={loadAdminUsers}>Load Users</button></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Categories */}
              {adminTab === 'categories' && (
                <>
                  <div className="admin-page-header">
                    <h2 className="admin-page-title">🏷️ Categories</h2>
                    <button className="btn btn-primary" onClick={()=>{setShowCatForm(true);setEditingCat(null);setCatFormData({name:'',type:'pet',icon:'📦'});}}>+ Add Category</button>
                    <button className="btn btn-primary" onClick={loadAdminCategories}>🔄</button>
                  </div>
                  <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
                    <div style={{flex:1,minWidth:200}}>
                      <h3 className="admin-section-title">🐾 Pet Categories</h3>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:20}}>
                        {(adminCategories.defaults?.pets||[]).map(c=>(
                          <span key={c.id} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:'var(--gray-100)',borderRadius:50,fontSize:'0.85rem',fontWeight:600}}>{c.icon} {c.name}</span>
                        ))}
                      </div>
                      <h3 className="admin-section-title">🍖 Food Categories</h3>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                        {(adminCategories.defaults?.foods||[]).map(c=>(
                          <span key={c.id} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',background:'var(--gray-100)',borderRadius:50,fontSize:'0.85rem',fontWeight:600}}>{c.icon} {c.name}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:300}}>
                      <h3 className="admin-section-title">📦 Custom Categories ({adminCategories.custom?.length||0})</h3>
                      <div className="admin-table-wrapper">
                        <table className="admin-table">
                          <thead><tr><th>Icon</th><th>Name</th><th>Type</th><th>Actions</th></tr></thead>
                          <tbody>
                            {(adminCategories.custom||[]).map(c=>(
                              <tr key={c.id}>
                                <td style={{fontSize:'1.3rem',textAlign:'center'}}>{c.icon||'📦'}</td>
                                <td className="admin-name">{c.name}</td>
                                <td><span className="admin-cat-tag">{c.type}</span></td>
                                <td>
                                  <div className="admin-actions">
                                    <button className="admin-btn-sm" onClick={()=>{setEditingCat(c);setCatFormData({name:c.name,type:c.type,icon:c.icon||'📦'});setShowCatForm(true);}}>✏️</button>
                                    <button className="admin-btn-sm admin-btn-danger" onClick={async()=>{if(!confirm('Delete "'+c.name+'"?'))return;try{await adminFetch('/categories/'+c.id,{method:'DELETE'});showToast('Deleted');loadAdminCategories();}catch(e){alert(e.message);}}}>🗑️</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {(!adminCategories.custom||adminCategories.custom.length===0)&&<tr><td colSpan={4} className="admin-empty">No custom categories</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  {showCatForm&&<>
                    <div className="cart-overlay" onClick={()=>setShowCatForm(false)}/>
                    <div className="checkout-modal" style={{maxWidth:'450px'}}>
                      <button className="auth-close" onClick={()=>setShowCatForm(false)}>✕</button>
                      <div className="checkout-header"><span className="checkout-logo">🏷️</span><h2>{editingCat?'Edit':'Add'} Category</h2></div>
                      <form onSubmit={async(e)=>{e.preventDefault();if(!catFormData.name?.trim()){alert('Name required');return;}try{if(editingCat){await adminFetch('/categories/'+editingCat.id,{method:'PUT',body:JSON.stringify(catFormData)});}else{await adminFetch('/categories',{method:'POST',body:JSON.stringify(catFormData)});}showToast(editingCat?'Updated':'Created');setShowCatForm(false);setEditingCat(null);setCatFormData({name:'',type:'pet',icon:'📦'});loadAdminCategories();}catch(e){alert(e.message);}}}>
                        <div className="co-fields">
                          <div className="co-field co-full"><label>Name *</label><input className="co-input" value={catFormData.name} onChange={e=>setCatFormData({...catFormData,name:e.target.value})} required/></div>
                          <div className="co-field"><label>Type</label><select className="co-input" value={catFormData.type} onChange={e=>setCatFormData({...catFormData,type:e.target.value})}><option value="pet">Pet</option><option value="food">Food</option></select></div>
                          <div className="co-field"><label>Icon</label><input className="co-input" value={catFormData.icon} onChange={e=>setCatFormData({...catFormData,icon:e.target.value})} placeholder="📦"/></div>
                        </div>
                        <div className="checkout-nav" style={{justifyContent:'flex-end'}}>
                          <button type="button" className="btn" onClick={()=>setShowCatForm(false)}>Cancel</button>
                          <button type="submit" className="btn btn-primary" style={{marginLeft:8}}>{editingCat?'💾 Save':'✨ Create'}</button>
                        </div>
                      </form>
                    </div>
                  </>}
                </>
              )}


            </div>
          </div>
        </section>
        </div>
      )}

      {/* ===== Auth Modal ===== */}
      {/* ===== Checkout Modal ===== */}
      {showCheckout && (
        <>
          <div className="cart-overlay" onClick={() => setShowCheckout(false)} />
          <div className="checkout-modal">
            <button className="auth-close" onClick={() => setShowCheckout(false)}>✕</button>

            {orderResult ? (
              <div className="order-success">
                <span className="order-success-icon">✅</span>
                <h2>Order Placed! 🎉</h2>
                <p className="order-success-id">Order #{orderResult.order_id}</p>
                <p className="order-success-msg">{orderResult.message}</p>
                <div className="order-success-details">
                  <div className="osd-row">
                    <span>Subtotal</span>
                    <span>${orderResult.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="osd-row">
                    <span>Shipping</span>
                    <span>{orderResult.shipping === 0 ? 'FREE' : `$${orderResult.shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="osd-row">
                    <span>Tax</span>
                    <span>${orderResult.tax.toFixed(2)}</span>
                  </div>
                  <div className="osd-row osd-total">
                    <span>Total</span>
                    <span>${orderResult.total.toFixed(2)}</span>
                  </div>
                  <div className="osd-row">
                    <span>Payment</span>
                    <span className="osd-payment">💵 Cash on Delivery</span>
                  </div>
                  <div className="osd-row">
                    <span>Status</span>
                    <span className="osd-status">{orderResult.payment_status === 'paid' ? '✅ Paid' : '⏳ Pending'}</span>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => { setShowCheckout(false); setCartItems([]); setOrderResult(null); }}>
                  Continue Shopping
                </button>
              </div>
            ) : (
              <>
                <div className="checkout-header">
                  <span className="checkout-logo">🛍️</span>
                  <h2>Checkout</h2>
                  <p>Complete your order</p>
                </div>

                {/* Checkout Steps */}
                <div className="checkout-steps">
                  <div className={`cs-step ${checkoutStep >= 0 ? 'cs-active' : ''} ${checkoutStep > 0 ? 'cs-done' : ''}`}>
                    <span className="cs-dot">{checkoutStep > 0 ? '✓' : '1'}</span>
                    <span className="cs-label">Shipping</span>
                  </div>
                  <div className={`cs-step ${checkoutStep >= 1 ? 'cs-active' : ''}`}>
                    <span className="cs-dot">2</span>
                    <span className="cs-label">Review & Place</span>
                  </div>
                </div>

                <div className="checkout-body">
                  {/* Step 1: Shipping */}
                  {checkoutStep === 0 && (
                    <div className="co-section">
                      <h3>Shipping Information</h3>

                      <div className="co-account-box">
                        <span className="co-account-icon">👤</span>
                        <div className="co-account-info">
                          <strong>{shippingInfo.name || user?.name || '—'}</strong>
                          <span>{shippingInfo.email || user?.email || '—'}</span>
                        </div>
                        <span className="co-account-badge">✓ From your account</span>
                      </div>

                      <div className="co-fields">
                        <div className="co-field co-full">
                          <label>Full Name *</label>
                          <input className="co-input" placeholder="John Doe" value={shippingInfo.name || user?.name || ''} readOnly disabled={!!(shippingInfo.name || user?.name)} />
                        </div>
                        <div className="co-field">
                          <label>Email *</label>
                          <input className="co-input" type="email" placeholder="you@example.com" value={shippingInfo.email || user?.email || ''} readOnly disabled={!!(shippingInfo.email || user?.email)} />
                        </div>
                        <div className="co-field">
                          <label>Phone</label>
                          <input className="co-input" placeholder="(555) 123-4567" value={shippingInfo.phone} onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})} />
                        </div>
                        {savedAddress && !editAddress ? (
                          <div className="co-field co-full">
                            <label>Address *</label>
                            <div className="co-address-summary">
                              <div className="co-address-text">
                                <strong>{shippingInfo.address}</strong>
                                <span>{shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}</span>
                              </div>
                              <button type="button" className="co-change-address" onClick={() => setEditAddress(true)}>
                                ✏️ Change Address
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="co-field co-full">
                              <label>Address *</label>
                              <input className="co-input" placeholder="123 Pet Street" value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} />
                            </div>
                            <div className="co-field">
                              <label>City *</label>
                              <input className="co-input" placeholder="Animal City" value={shippingInfo.city} onChange={e => setShippingInfo({...shippingInfo, city: e.target.value})} />
                            </div>
                            <div className="co-field">
                              <label>State</label>
                              <input className="co-input" placeholder="CA" value={shippingInfo.state} onChange={e => setShippingInfo({...shippingInfo, state: e.target.value})} />
                            </div>
                            <div className="co-field">
                              <label>ZIP Code</label>
                              <input className="co-input" placeholder="12345" value={shippingInfo.zip} onChange={e => setShippingInfo({...shippingInfo, zip: e.target.value})} />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Review & Place */}
                  {checkoutStep === 1 && (
                    <div className="co-section">
                      <h3>Order Review</h3>
                      <div className="co-review-items">
                        {cartItems.map(item => (
                          <div key={item.id} className="co-review-item">
                            <img src={item.image} alt={item.name} className="co-review-img" />
                            <div className="co-review-info">
                              <strong>{item.name}</strong>
                              <span>{item.breed}</span>
                            </div>
                            <span className="co-review-qty">x{item.quantity}</span>
                            <span className="co-review-price">${(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="co-review-summary">
                        <div><span>Subtotal</span><span>${cartTotal.toLocaleString()}</span></div>
                        <div><span>Shipping</span><span>{cartTotal >= 100 ? 'FREE' : '$12.99'}</span></div>
                        <div><span>Tax (8%)</span><span>${(cartTotal * 0.08).toFixed(2)}</span></div>
                        <div className="co-review-total"><span>Total</span><span>${(cartTotal + (cartTotal >= 100 ? 0 : 12.99) + cartTotal * 0.08).toFixed(2)}</span></div>
                      </div>
                      <div className="co-review-ship">
                        <h4>Shipping To</h4>
                        <p>{shippingInfo.name} — {shippingInfo.email}</p>
                        <p>{shippingInfo.address}, {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}</p>
                      </div>
                      <div className="co-review-pay">
                        <h4>Payment</h4>
                        <p>💵 Cash on Delivery — Pay when your order arrives</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Checkout Navigation */}
                <div className="checkout-nav">
                  {checkoutStep > 0 ? (
                    <button className="wizard-btn wizard-btn-back" onClick={() => setCheckoutStep(s => s - 1)}>
                      ← Back
                    </button>
                  ) : <div />}
                  
                  {checkoutStep < 1 ? (
                    <button
                      className="wizard-btn wizard-btn-next"
                      onClick={() => {
                        if (!shippingInfo.name || !shippingInfo.email || !shippingInfo.address || !shippingInfo.city) {
                          alert('Please fill in all required shipping fields.');
                          return;
                        }
                        setCheckoutStep(1);
                      }}
                    >
                      Review Order →
                    </button>
                  ) : (
                    <button
                      className="wizard-btn wizard-btn-next co-place-order"
                      onClick={async () => {
                        setOrderLoading(true);
                        try {
                          const items = cartItems.map(item => ({
                            item_type: item.category === 'food' ? 'food' : 'pet',
                            item_id: item.id,
                            quantity: item.quantity,
                          }));
                          const result = await apiFetch('/orders', {
                            method: 'POST',
                            body: JSON.stringify({
                              items,
                              payment_method: 'cod',
                              shipping: shippingInfo,
                            }),
                          });
                          const addr = {
                            phone: shippingInfo.phone,
                            address: shippingInfo.address,
                            city: shippingInfo.city,
                            state: shippingInfo.state,
                            zip: shippingInfo.zip,
                          };
                          localStorage.setItem('petstore_address' + (user?.id ? '_' + user.id : ''), JSON.stringify(addr));
                          setSavedAddress(addr);
                          setEditAddress(false);
                          setOrderResult(result);
                        } catch (err) {
                          alert('Order failed: ' + err.message);
                        } finally {
                          setOrderLoading(false);
                        }
                      }}
                      disabled={orderLoading}
                    >
                      {orderLoading ? '⏳ Processing...' : '💰 Place Order'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ===== Orders History Modal ===== */}
      {showOrders && (
        <>
          <div className="cart-overlay" onClick={() => setShowOrders(false)} />
          <div className="checkout-modal orders-modal">
            <button className="auth-close" onClick={() => setShowOrders(false)}>✕</button>
            <div className="checkout-header">
              {ordersTab === 'orders' ? (
                <>
                  <span className="checkout-logo">📦</span>
                  <h2>My Orders</h2>
                  <p>Your order history</p>
                </>
              ) : (
                <>
                  <span className="checkout-logo">🩺</span>
                  <h2>My Consults</h2>
                  <p>Your booked consults</p>
                </>
              )}
            </div>

            {ordersTab === 'orders' && (
              <div className="orders-list">
                {userOrders.length === 0 ? (
                  <div className="orders-empty">
                    <span>📭</span>
                    <p>No orders yet</p>
                  </div>
                ) : (
                  userOrders.map(order => (
                    <div key={order.id} className="order-card">
                      <div className="order-card-header">
                        <span className="order-id">#{order.id}</span>
                        <span className={`order-status order-status-${order.status}`}>{order.status}</span>
                        <span className="order-payment-status">{order.payment_status === 'paid' ? '✅ Paid' : '⏳ ' + order.payment_status}</span>
                      </div>
                      <div className="order-card-body">
                        {order.items.map(item => (
                          <div key={item.id} className="order-item">
                            <img src={item.image} alt={item.name} className="order-item-img" />
                            <div className="order-item-info">
                              <strong>{item.name}</strong>
                              <span>{item.breed} × {item.quantity}</span>
                            </div>
                            <span className="order-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="order-card-footer">
                        <span>Total: <strong>${order.total.toFixed(2)}</strong></span>
                        <span className="order-date">{new Date(order.created_at).toLocaleDateString()}</span>
                        {(order.status === 'confirmed' || order.status === 'pending') && (
                          <button
                            className="order-cancel-btn"
                            onClick={async () => {
                              if (confirm('Cancel this order?')) {
                                try {
                                  await apiFetch(`/orders/${order.id}/cancel`, { method: 'POST' });
                                  const updated = await apiFetch('/orders/history');
                                  setUserOrders(updated);
                                } catch (err) {
                                  alert(err.message);
                                }
                              }
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {ordersTab === 'consultations' && (
              <div className="orders-list">
                {userConsultations.length === 0 ? (
                  <div className="orders-empty">
                    <span>🩺</span>
                    <p>No consults yet</p>
                  </div>
                ) : (
                  userConsultations.map(c => (
                    <div key={c.id} className="order-card consult-card">
                      <div className="order-card-header">
                        <span className="order-id">#{c.id}</span>
                        <span className={`order-status order-status-${c.status}`}>{c.status}</span>
                        <span className="order-payment-status">{c.service_icon} {c.service_name}</span>
                      </div>
                      <div className="order-card-body">
                        <div className="consult-card-row">
                          <span className="consult-card-label">Pet</span>
                          <strong>{c.pet_name} <small>({c.pet_type}{c.pet_breed ? ', ' + c.pet_breed : ''} · {c.pet_age} mo)</small></strong>
                        </div>
                        <div className="consult-card-row consult-date-row">
                          <span className="consult-card-label">📅 Preferred Date</span>
                          <strong className="consult-date-value">
                            {formatConsultDate(c.preferred_date) || 'Not set'}
                          </strong>
                        </div>
                        <div className="consult-card-row">
                          <span className="consult-card-label">Contact</span>
                          <span>{c.phone}</span>
                        </div>
                      </div>
                      <div className="order-card-footer">
                        <span>Booked: <strong>{new Date(c.created_at).toLocaleDateString()}</strong></span>
                        {c.service_price != null && (
                          <span className="order-date">Service: <strong>${c.service_price}</strong></span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {showAuth && (
        <>
          <div className="auth-overlay" onClick={() => setShowAuth(false)} />
          <div className="auth-modal">
            <button className="auth-close" onClick={() => setShowAuth(false)}>✕</button>
            <div className="auth-header">
              <span className="auth-logo">🐾</span>
              <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
              <p>{authMode === 'login' ? 'Sign in to your account' : 'Join PetStore today'}</p>
            </div>

            <form className="auth-form" onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
              {authMode === 'signup' && (
                <div className="auth-field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="form-input"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                </div>
              )}
              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="form-input"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="form-input"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                />
              </div>

              {authError && <div className="auth-error">⚠️ {authError}</div>}

              <button type="submit" className="btn btn-primary auth-submit">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="auth-footer">
              {authMode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button className="auth-switch" onClick={() => openAuth('signup')}>
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button className="auth-switch" onClick={() => openAuth('login')}>
                    Sign in
                  </button>
                </p>
              )}
            </div>

          </div>
        </>
      )}

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="footer-logo">🐾 PetStore</span>
            <p>Finding loving homes for wonderful pets since 2020.</p>
          </div>
          <div className="footer-links">
            <h4>Quick Links</h4>
            <a href="#pets" onClick={(e) => { e.preventDefault(); setActiveTab('pets'); }}>Browse Pets</a>
            <a href="#food" onClick={(e) => { e.preventDefault(); setActiveTab('food'); }}>Pet Food</a>
            <a href="#consultation" onClick={(e) => { e.preventDefault(); setActiveTab('consultation'); }}>Consult</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-social">
            <h4>Follow Us</h4>
            <div className="social-icons">
              <span title="Facebook">📘</span>
              <span title="Instagram">📸</span>
              <span title="Twitter">🐦</span>
              <span title="YouTube">▶️</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 PetStore. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
