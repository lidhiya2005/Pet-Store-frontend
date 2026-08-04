export const pets = [
  {
    id: 1, name: "Buddy", breed: "Golden Retriever", category: "dog",
    age: "2 years", price: 1200,
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop",
    description: "Friendly and energetic golden retriever who loves to play fetch and swim.",
    gender: "male", vaccinated: true,
  },
  {
    id: 2, name: "Luna", breed: "Persian Cat", category: "cat",
    age: "1 year", price: 800,
    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop",
    description: "Elegant and affectionate Persian cat with a calm personality.",
    gender: "female", vaccinated: true,
  },
  {
    id: 3, name: "Max", breed: "German Shepherd", category: "dog",
    age: "3 years", price: 1500,
    image: "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=400&fit=crop",
    description: "Loyal and intelligent German Shepherd, great guard dog and family companion.",
    gender: "male", vaccinated: true,
  },
  {
    id: 4, name: "Whiskers", breed: "Maine Coon", category: "cat",
    age: "2 years", price: 950,
    image: "https://images.unsplash.com/photo-1574231164645-d6f0e8553590?w=400&h=400&fit=crop",
    description: "Gentle giant with a loving personality. Gets along great with kids.",
    gender: "male", vaccinated: true,
  },
  {
    id: 5, name: "Coco", breed: "Cockatiel", category: "bird",
    age: "6 months", price: 250,
    image: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400&h=400&fit=crop",
    description: "Playful cockatiel who loves to whistle and mimic sounds.",
    gender: "female", vaccinated: false,
  },
  {
    id: 6, name: "Nemo", breed: "Clownfish", category: "fish",
    age: "4 months", price: 45,
    image: "https://images.unsplash.com/photo-1559485407-40a6f1e59b1c?w=400&h=400&fit=crop",
    description: "Vibrant clownfish, perfect for a saltwater aquarium setup.",
    gender: "male", vaccinated: false,
  },
  {
    id: 7, name: "Bella", breed: "French Bulldog", category: "dog",
    age: "1 year", price: 2000,
    image: "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400&h=400&fit=crop",
    description: "Adorable French Bulldog with a charming personality and big bat ears.",
    gender: "female", vaccinated: true,
  },
  {
    id: 8, name: "Mittens", breed: "Calico Cat", category: "cat",
    age: "8 months", price: 650,
    image: "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&h=400&fit=crop",
    description: "Sweet calico kitten with beautiful markings. Very playful and curious.",
    gender: "female", vaccinated: true,
  },
  {
    id: 9, name: "Polly", breed: "African Grey", category: "bird",
    age: "4 years", price: 1800,
    image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=400&fit=crop",
    description: "Highly intelligent African Grey parrot with an extensive vocabulary.",
    gender: "female", vaccinated: true,
  },
  {
    id: 10, name: "Goldie", breed: "Oranda Goldfish", category: "fish",
    age: "1 year", price: 30,
    image: "https://images.unsplash.com/photo-1520366498724-709889c0c685?w=400&h=400&fit=crop",
    description: "Beautiful oranda goldfish with a distinctive wen on its head.",
    gender: "male", vaccinated: false,
  },
  {
    id: 11, name: "Oreo", breed: "Holland Lop", category: "rabbit",
    age: "5 months", price: 120,
    image: "https://images.unsplash.com/photo-1535241749838-299277b6305f?w=400&h=400&fit=crop",
    description: "Fluffy Holland Lop rabbit with floppy ears and a sweet disposition.",
    gender: "male", vaccinated: true,
  },
  {
    id: 12, name: "Spike", breed: "Bearded Dragon", category: "reptile",
    age: "2 years", price: 175,
    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=400&fit=crop",
    description: "Friendly bearded dragon who enjoys basking and being handled.",
    gender: "male", vaccinated: false,
  },
];

export const categories = [
  { id: "all", label: "All Pets", icon: "🐾" },
  { id: "dog", label: "Dogs", icon: "🐕" },
  { id: "cat", label: "Cats", icon: "🐱" },
  { id: "bird", label: "Birds", icon: "🐦" },
  { id: "fish", label: "Fish", icon: "🐟" },
  { id: "rabbit", label: "Rabbits", icon: "🐰" },
  { id: "reptile", label: "Reptiles", icon: "🦎" },
];

export const petFoodCategories = [
  { id: 'all', label: 'All Food', icon: '🍽️' },
  { id: 'dog', label: 'Dog Food', icon: '🦴' },
  { id: 'cat', label: 'Cat Food', icon: '🐟' },
  { id: 'bird', label: 'Bird Food', icon: '🌾' },
  { id: 'fish', label: 'Fish Food', icon: '🦐' },
  { id: 'rabbit', label: 'Rabbit Food', icon: '🥕' },
  { id: 'treats', label: 'Treats', icon: '🍪' },
];

export const petFoods = [
  {
    id: 'f1', name: 'Premium Dog Kibble', category: 'dog',
    brand: 'NutriPaw', weight: '15 lbs', price: 45.99,
    image: 'https://images.unsplash.com/photo-1565708097881-bbf4bbfcc35c?w=400&h=400&fit=crop',
    description: 'High-protein grain-free formula with real chicken for all life stages.',
    rating: 4.8, inStock: true,
  },
  {
    id: 'f2', name: 'Salmon & Rice Blend', category: 'dog',
    brand: 'HealthyHound', weight: '25 lbs', price: 62.99,
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop',
    description: 'Omega-rich salmon formula for healthy skin and shiny coat.',
    rating: 4.6, inStock: true,
  },
  {
    id: 'f3', name: 'Tuna Pate Wet Food', category: 'cat',
    brand: 'PurrfectBite', weight: '24 cans', price: 34.99,
    image: 'https://images.unsplash.com/photo-1545366073-76158094a816?w=400&h=400&fit=crop',
    description: 'Smooth pate texture cats love. Made with wild-caught tuna.',
    rating: 4.7, inStock: true,
  },
  {
    id: 'f4', name: 'Kitten Starter Pack', category: 'cat',
    brand: 'PurrfectBite', weight: '8 lbs', price: 28.99,
    image: 'https://images.unsplash.com/photo-1565708097881-bbf4bbfcc35c?w=400&h=400&fit=crop',
    description: 'Specially formulated for growing kittens with DHA for brain development.',
    rating: 4.5, inStock: true,
  },
  {
    id: 'f5', name: 'Premium Bird Seed Mix', category: 'bird',
    brand: 'AvianJoy', weight: '5 lbs', price: 19.99,
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop',
    description: 'Vitamin-enriched seed blend with sunflower hearts and millet.',
    rating: 4.4, inStock: true,
  },
  {
    id: 'f6', name: 'Tropical Fish Flakes', category: 'fish',
    brand: 'AquaVita', weight: '4 oz', price: 8.99,
    image: 'https://images.unsplash.com/photo-1545366073-76158094a816?w=400&h=400&fit=crop',
    description: 'Balanced daily nutrition for tropical and freshwater fish.',
    rating: 4.3, inStock: true,
  },
  {
    id: 'f7', name: 'Rabbit Hay & Pellet Combo', category: 'rabbit',
    brand: 'BunnyBest', weight: '10 lbs', price: 24.99,
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop',
    description: 'Timothy hay and fortified pellet mix for optimal digestive health.',
    rating: 4.6, inStock: true,
  },
  {
    id: 'f8', name: 'Natural Dog Treats', category: 'treats',
    brand: 'NutriPaw', weight: '12 oz', price: 12.99,
    image: 'https://images.unsplash.com/photo-1565708097881-bbf4bbfcc35c?w=400&h=400&fit=crop',
    description: 'Single-ingredient freeze-dried liver treats. Irresistible for training.',
    rating: 4.9, inStock: true,
  },
  {
    id: 'f9', name: 'Catnip Crunchies', category: 'treats',
    brand: 'PurrfectBite', weight: '6 oz', price: 9.99,
    image: 'https://images.unsplash.com/photo-1545366073-76158094a816?w=400&h=400&fit=crop',
    description: 'Crunchy catnip-infused treats that drive cats wild with joy.',
    rating: 4.7, inStock: true,
  },
  {
    id: 'f10', name: 'Reptile Calcium Powder', category: 'reptile',
    brand: 'ScaleCare', weight: '3 oz', price: 11.99,
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop',
    description: 'Calcium and D3 supplement dusting powder for healthy bone development.',
    rating: 4.5, inStock: true,
  },
];

export const demoUsers = [
  {
    id: 'u1', name: 'Alex Johnson', email: 'alex@example.com',
    password: 'password123', avatar: 'AJ',
    pets: ['Buddy', 'Luna'],
  },
  {
    id: 'u2', name: 'Sarah Chen', email: 'sarah@example.com',
    password: 'password123', avatar: 'SC',
    pets: ['Whiskers'],
  },
  {
    id: 'u3', name: 'Demo User', email: 'demo@petstore.com',
    password: 'demo1234', avatar: 'DU',
    pets: [],
  },
];

export const petTypes = ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Reptile', 'Hamster', 'Guinea Pig', 'Ferret', 'Horse', 'Other'];

export const testimonials = [
  {
    id: 1, name: "Sarah Johnson", role: "Happy Dog Owner",
    text: "I found my best friend here! The adoption process was smooth and the staff truly cares about the animals.",
    avatar: "SJ", rating: 5,
  },
  {
    id: 2, name: "Marcus Chen", role: "Cat Lover",
    text: "Amazing selection of healthy pets. Luna has been a joy since day one. Highly recommended!",
    avatar: "MC", rating: 5,
  },
  {
    id: 3, name: "Emily Rodriguez", role: "First-time Pet Owner",
    text: "The team helped me pick the perfect pet for my lifestyle. They provided great advice on care too!",
    avatar: "ER", rating: 5,
  },
];
