# 🐾 Pet Store Management System

A full-stack Pet Store Management System built with **React (Vite)** for the frontend and **FastAPI** for the backend. The application provides a modern interface for browsing pet products while offering an administrator dashboard to manage inventory, orders, customers, and store operations.

---

## 📌 Features

### Customer Features
- Browse pets by category
- View pet details
- Search and filter pets
- Add items to cart
- Place orders
- Contact the store
- Book pet consultations
- Responsive user interface

### Admin Features
- Secure JWT authentication
- Dashboard with store statistics
- Product management (Create, Read, Update, Delete)
- Category management
- Inventory management
- Order management
- Customer management
- Sales monitoring

---

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- JavaScript (ES6+)
- CSS3
- Axios
- React Hooks

### Backend
- FastAPI
- SQLite
- SQLAlchemy
- JWT Authentication
- Passlib (bcrypt)
- Uvicorn

---

## 📁 Project Structure

```text
pet-store/
│
├── index.html                  # Vite entry point
├── package.json                # Frontend dependencies
├── vite.config.js              # Vite configuration and API proxy
│
├── src/
│   ├── main.jsx                # Main React application
│   ├── data/
│   │   └── pets.js             # Static fallback data
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Hero.jsx
│   │   ├── PetCard.jsx
│   │   └── CategoryFilter.jsx
│   └── styles/
│       ├── App.css
│       ├── Header.css
│       ├── Hero.css
│       └── index.css
│
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── database.py             # SQLite database schema
│   ├── auth.py                 # JWT authentication
│   ├── seed.py                 # Seed demo data
│   ├── requirements.txt
│   ├── petstore.db             # SQLite database
│   └── router/
│       ├── pets.py
│       ├── foods.py
│       ├── consultations.py
│       ├── cart.py
│       ├── contact.py
│       └── orders.py
│
├── auth.js
├── cart.js
├── consultations.js
├── contact.js
├── index.js                    # Legacy Express stub files
│
├── TODO.md
└── README.md
```

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/pet-store.git
cd pet-store
```

---

## Frontend Setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend runs at:

```
http://localhost:5173
```

---

## Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Create a virtual environment:

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS/Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```



Run the FastAPI server:

```bash
uvicorn main:app --reload
```

The backend will be available at:

```
http://localhost:8000
```

Swagger API documentation:

```
http://localhost:8000/docs
```

---

## API Modules

The backend exposes RESTful APIs for:

- Authentication
- Pets
- Pet Food
- Shopping Cart
- Orders
- Consultations
- Contact Messages
- Admin Dashboard

---

## Database

SQLite is used for development.

The database stores:

- Users
- Pets
- Categories
- Orders
- Order Items
- Cart
- Consultations
- Contact Messages
- Testimonials
- Inventory

Demo data can be generated using:

```bash
python seed.py
```

---

## Authentication

The application uses:

- JWT Authentication
- Password hashing with bcrypt
- Protected API routes
- Role-based administrator access

---

## Project Highlights

- Single Page Application (SPA)
- FastAPI REST API backend
- Responsive React frontend
- SQLite database integration
- JWT-based authentication
- CRUD operations for products and orders
- Shopping cart functionality
- Consultation booking
- Contact form handling
- Vite proxy configuration for API communication

---

## Future Enhancements

- Online payment integration
- Customer accounts
- Wishlist functionality
- Product reviews and ratings
- Email notifications
- Image uploads
- Admin analytics dashboard
- Docker deployment
- PostgreSQL support
- Unit and integration testing

---

## Development Notes

- Vite proxies frontend API requests to the FastAPI backend running on port **8000**.
- SQLite is automatically created if it does not exist.
- Demo users, pets, food items, consultations, and testimonials can be generated using the seed script.

---

## License

This project is developed for educational and portfolio purposes.

---

## Author

**Your Name**

- GitHub: https://github.com/lidhiya2005
- LinkedIn: https://linkedin.com/in/LidhiyaAmmu
