import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db
from seed import seed
from router import pets, foods, consultations, cart, contact
from auth import require_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed
    try:
        init_db()
        seed()
        print("Database initialized and seeded")
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        raise
    yield
    # Shutdown
    print("Shutting down PetStore API")


app = FastAPI(
    title="PetStore API",
    version="1.0.0",
    description="🐾 PetStore - Find Your Perfect Companion",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(pets.router, prefix="/api/pets")
app.include_router(foods.router, prefix="/api/foods")
app.include_router(consultations.router, prefix="/api/consultations")
app.include_router(cart.router, prefix="/api/cart")
app.include_router(contact.router, prefix="/api/contact")


# Health check
@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z"}


# API documentation overview
@app.get("/api/health/docs", tags=["health"])
def api_docs():
    return {
        "service": "PetStore API",
        "version": "1.0.0",
        "base_url": "/api",
        "status": "running",
        "documentation": {
            "health": {
                "check": {"method": "GET", "path": "/api/health", "description": "Health check"},
                "docs": {"method": "GET", "path": "/api/health/docs", "description": "API documentation overview"},
            },
            "pets": {
                "list": {"method": "GET", "path": "/api/pets", "description": "List all pets", "params": "?category=&search="},
                "categories": {"method": "GET", "path": "/api/pets/categories", "description": "Get pet categories"},
                "get": {"method": "GET", "path": "/api/pets/:id", "description": "Get a single pet"},
                "create": {"method": "POST", "path": "/api/pets", "description": "Create a pet (auth required)"},
                "update": {"method": "PUT", "path": "/api/pets/:id", "description": "Update a pet (auth required)"},
                "delete": {"method": "DELETE", "path": "/api/pets/:id", "description": "Delete a pet (auth required)"},
            },
            "foods": {
                "list": {"method": "GET", "path": "/api/foods", "description": "List all pet foods", "params": "?category=&search="},
                "categories": {"method": "GET", "path": "/api/foods/categories", "description": "Get food categories"},
                "get": {"method": "GET", "path": "/api/foods/:id", "description": "Get a single pet food"},
                "create": {"method": "POST", "path": "/api/foods", "description": "Create pet food (auth required)"},
                "update": {"method": "PUT", "path": "/api/foods/:id", "description": "Update pet food (auth required)"},
                "delete": {"method": "DELETE", "path": "/api/foods/:id", "description": "Delete pet food (auth required)"},
            },
            "auth": {
                "register": {"method": "POST", "path": "/api/auth/register", "description": "Register a new user"},
                "login": {"method": "POST", "path": "/api/auth/login", "description": "Login"},
                "me": {"method": "GET", "path": "/api/auth/me", "description": "Get current user (auth required)"},
            },
            "cart": {
                "list": {"method": "GET", "path": "/api/cart", "description": "List cart items (auth required)"},
                "add": {"method": "POST", "path": "/api/cart", "description": "Add item to cart (auth required)"},
                "update": {"method": "PUT", "path": "/api/cart/:id", "description": "Update cart item quantity (auth required)"},
                "remove": {"method": "DELETE", "path": "/api/cart/:id", "description": "Remove cart item (auth required)"},
                "clear": {"method": "DELETE", "path": "/api/cart", "description": "Clear cart (auth required)"},
            },
            "consultations": {
                "types": {"method": "GET", "path": "/api/consultations/types", "description": "Get consultation types"},
                "purposes": {"method": "GET", "path": "/api/consultations/purposes", "description": "Get consultation purposes"},
                "book": {"method": "POST", "path": "/api/consultations", "description": "Book a consultation"},
                "list": {"method": "GET", "path": "/api/consultations", "description": "List user consultations (auth required)"},
                "get": {"method": "GET", "path": "/api/consultations/:id", "description": "Get a consultation"},
                "updateStatus": {"method": "PATCH", "path": "/api/consultations/:id/status", "description": "Update consultation status (auth required)"},
            },
            "contact": {
                "submit": {"method": "POST", "path": "/api/contact", "description": "Submit a contact message"},
                "messages": {"method": "GET", "path": "/api/contact/messages", "description": "List contact messages"},
            },
        },
    }


# Auth routes (inline since they're simple)
@app.post("/api/auth/register", tags=["auth"])
def register(data: dict):
    from auth import hash_password, generate_token
    from database import get_db

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return JSONResponse(status_code=400, content={"error": "Name, email, and password are required"})

    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        db.close()
        return JSONResponse(status_code=409, content={"error": "Email already registered"})

    user_id = f"u{int(__import__('time').time() * 1000)}"
    hashed_pw = hash_password(password)
    avatar = "".join(w[0].upper() for w in name.split()[:2])

    db.execute(
        "INSERT INTO users (id, name, email, password, avatar) VALUES (?, ?, ?, ?, ?)",
        (user_id, name, email, hashed_pw, avatar),
    )
    db.commit()
    user = db.execute("SELECT id, name, email, avatar, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()

    token = generate_token(dict(user))
    return {"user": dict(user), "token": token}


@app.post("/api/auth/login", tags=["auth"])
def login(data: dict):
    from auth import verify_password, generate_token
    from database import get_db

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return JSONResponse(status_code=400, content={"error": "Email and password are required"})

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not user or not verify_password(password, user["password"]):
        db.close()
        return JSONResponse(status_code=401, content={"error": "Invalid email or password"})

    user_dict = dict(user)
    token = generate_token(user_dict)
    user_dict.pop("password", None)
    db.close()
    return {"user": user_dict, "token": token}


@app.post("/api/auth/admin-login", tags=["auth"])
def admin_login(data: dict):
    """Dedicated admin login - only allows admin users to log in."""
    from auth import verify_password, generate_token
    from database import get_db

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return JSONResponse(status_code=400, content={"error": "Email and password are required"})

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not user or not verify_password(password, user["password"]):
        db.close()
        return JSONResponse(status_code=401, content={"error": "Invalid email or password"})

    # Check admin status - only admins can use this endpoint
    # NOTE: user is a sqlite3.Row, which has no .get(); use bracket access
    if not user["is_admin"]:
        db.close()
        return JSONResponse(status_code=403, content={"error": "Admin access required. You do not have admin privileges."})

    user_dict = dict(user)
    token = generate_token(user_dict)
    user_dict.pop("password", None)
    db.close()
    return {"user": user_dict, "token": token}


@app.get("/api/auth/me", tags=["auth"])
def get_me(user: dict = Depends(require_user)):
    from database import get_db

    db = get_db()
    u = db.execute("SELECT id, name, email, avatar, is_admin, created_at FROM users WHERE id = ?", (user["id"],)).fetchone()
    db.close()
    if not u:
        return JSONResponse(status_code=404, content={"error": "User not found"})
    return dict(u)


# ===== Orders Routes (inline) =====
@app.post("/api/orders", tags=["orders"])
def create_order(data: dict, user: dict = Depends(require_user)):
    import time
    from database import get_db
    db = get_db()
    try:
        # Ensure the user exists in the database
        existing_user = db.execute("SELECT id FROM users WHERE id = ?", (user["id"],)).fetchone()
        if not existing_user:
            # Auto-create user from JWT token data if they don't exist in DB
            avatar = "".join(w[0].upper() for w in user.get("name", "User").split()[:2])
            db.execute(
                "INSERT OR IGNORE INTO users (id, name, email, password, avatar) VALUES (?, ?, ?, ?, ?)",
                (user["id"], user.get("name", "User"), user.get("email", ""), "", avatar),
            )

        items = data.get("items", [])
        if not items:
            raise HTTPException(400, detail="No items in order")
        payment_method = "cod"
        shipping = data.get("shipping", {})
        for field in ["name", "email", "address", "city"]:
            if not shipping.get(field):
                raise HTTPException(400, detail=f"Shipping {field} is required")
        subtotal = 0
        order_items = []
        for item in items:
            item_type = item.get("item_type")
            item_id = str(item.get("item_id"))
            qty = item.get("quantity", 1)
            if item_type == "pet":
                row = db.execute("SELECT id, name, breed, image, price FROM pets WHERE id = ?", (item_id,)).fetchone()
            elif item_type == "food":
                row = db.execute("SELECT id, name, brand, image, price FROM pet_foods WHERE id = ?", (item_id,)).fetchone()
            else:
                continue
            if not row:
                continue
            r = dict(row)
            price = r["price"]
            subtotal += price * qty
            order_items.append({"item_type": item_type, "item_id": str(r["id"]),
                "name": r["name"], "breed": r.get("breed") or r.get("brand") or "",
                "image": r["image"], "price": price, "quantity": qty})
        if not order_items:
            raise HTTPException(400, detail="No valid items in order")
        tax = round(subtotal * 0.08, 2)
        shipping_cost = 0 if subtotal >= 100 else 12.99
        total = round(subtotal + tax + shipping_cost, 2)
        order_id = f"ORD-{int(time.time() * 1000)}"
        db.execute(
            """INSERT INTO orders (id, user_id, status, payment_method, payment_status,
                subtotal, tax, shipping, total, shipping_name, shipping_email,
                shipping_phone, shipping_address, shipping_city, shipping_state,
                shipping_zip, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (order_id, user["id"], "confirmed", payment_method,
             "paid",
             subtotal, tax, shipping_cost, total,
             shipping.get("name",""), shipping.get("email",""),
             shipping.get("phone",""), shipping.get("address",""),
             shipping.get("city",""), shipping.get("state",""),
             shipping.get("zip",""), data.get("notes","")))
        for oi in order_items:
            db.execute(
                "INSERT INTO order_items (order_id, item_type, item_id, name, breed, image, price, quantity) VALUES (?,?,?,?,?,?,?,?)",
                (order_id, oi["item_type"], oi["item_id"], oi["name"], oi["breed"], oi["image"], oi["price"], oi["quantity"]))
        db.execute("DELETE FROM cart_items WHERE user_id = ?", (user["id"],))
        db.commit()
        return {"order_id": order_id, "status": "confirmed",
            "payment_method": payment_method,
            "payment_status": "paid",
            "subtotal": subtotal, "tax": tax, "shipping": shipping_cost,
            "total": total, "items": order_items, "message": "Order placed successfully!"}
    except HTTPException:
        db.close()
        raise
    except Exception as e:
        db.rollback()
        db.close()
        raise HTTPException(500, detail=f"Failed to create order: {str(e)}")


@app.get("/api/orders/history", tags=["orders"])
def order_history(user: dict = Depends(require_user)):
    from database import get_db
    db = get_db()
    rows = db.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", (user["id"],)).fetchall()
    orders = []
    for row in rows:
        o = dict(row)
        items = db.execute("SELECT * FROM order_items WHERE order_id = ? ORDER BY id", (o["id"],)).fetchall()
        o["items"] = [dict(i) for i in items]
        orders.append(o)
    db.close()
    return orders


@app.get("/api/orders/{order_id}", tags=["orders"])
def get_order(order_id: str, user: dict = Depends(require_user)):
    from database import get_db
    db = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, user["id"])).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, detail="Order not found")
    o = dict(row)
    items = db.execute("SELECT * FROM order_items WHERE order_id = ? ORDER BY id", (o["id"],)).fetchall()
    o["items"] = [dict(i) for i in items]
    db.close()
    return o


@app.post("/api/orders/{order_id}/pay", tags=["orders"])
def pay_order(order_id: str, data: dict, user: dict = Depends(require_user)):
    from database import get_db
    db = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, user["id"])).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, detail="Order not found")
    o = dict(row)
    if o["payment_status"] == "paid":
        db.close()
        return {"order_id": order_id, "status": "already_paid", "message": "Order is already paid"}
    db.execute("UPDATE orders SET payment_status = 'paid', status = 'processing', updated_at = datetime('now') WHERE id = ?", (order_id,))
    db.commit()
    db.close()
    return {"order_id": order_id, "status": "processing", "payment_status": "paid", "message": "Payment successful!"}


@app.post("/api/orders/{order_id}/cancel", tags=["orders"])
def cancel_order(order_id: str, user: dict = Depends(require_user)):
    from database import get_db
    db = get_db()
    row = db.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, user["id"])).fetchone()
    if not row:
        db.close()
        raise HTTPException(404, detail="Order not found")
    o = dict(row)
    if o["status"] in ("shipped", "delivered", "cancelled"):
        db.close()
        raise HTTPException(400, detail=f"Cannot cancel order with status '{o['status']}'")
    db.execute("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", (order_id,))
    db.commit()
    db.close()
    return {"order_id": order_id, "status": "cancelled", "message": "Order cancelled successfully"}


# ===== Admin Helpers =====
def require_admin(user: dict = Depends(require_user)) -> dict:
    from database import get_db
    db = get_db()
    row = db.execute("SELECT is_admin FROM users WHERE id = ?", (user["id"],)).fetchone()
    db.close()
    if not row or not row["is_admin"]:
        raise HTTPException(403, detail="Admin access required")
    return user


# ===== Admin Routes =====
@app.get("/api/admin/check", tags=["admin"])
def check_admin(user: dict = Depends(require_user)):
    from database import get_db
    db = get_db()
    row = db.execute("SELECT is_admin FROM users WHERE id = ?", (user["id"],)).fetchone()
    db.close()
    return {"is_admin": bool(row and row["is_admin"])}


@app.get("/api/admin/dashboard", tags=["admin"])
def admin_dashboard(user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    stats = {
        "total_pets": db.execute("SELECT COUNT(*) FROM pets").fetchone()[0],
        "total_foods": db.execute("SELECT COUNT(*) FROM pet_foods").fetchone()[0],
        "total_categories": db.execute("SELECT COUNT(*) FROM categories").fetchone()[0],
        "total_orders": db.execute("SELECT COUNT(*) FROM orders").fetchone()[0],
        "total_users": db.execute("SELECT COUNT(*) FROM users").fetchone()[0],
        "total_revenue": round(db.execute("SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'cancelled'").fetchone()[0], 2),
        "pending_orders": db.execute("SELECT COUNT(*) FROM orders WHERE status IN ('pending','confirmed')").fetchone()[0],
        "low_stock_items": db.execute("SELECT COUNT(*) FROM pets WHERE quantity=0 OR status='out_of_stock'").fetchone()[0] + db.execute("SELECT COUNT(*) FROM pet_foods WHERE quantity=0 OR status='out_of_stock'").fetchone()[0],
        "on_sale": db.execute("SELECT COUNT(*) FROM pets WHERE discount_price IS NOT NULL").fetchone()[0] + db.execute("SELECT COUNT(*) FROM pet_foods WHERE discount_price IS NOT NULL").fetchone()[0],
    }
    recent = db.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 5").fetchall()
    db.close()
    return {"stats": stats, "recent_orders": [dict(r) for r in recent]}


# === Pet Management (Enhanced) ===
@app.get("/api/admin/pets", tags=["admin"])
def admin_list_pets(
    search: str = Query(None),
    category: str = Query(None),
    status: str = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    sort: str = Query("name"),
    user: dict = Depends(require_admin),
):
    from database import get_db
    db = get_db()
    sql = "SELECT * FROM pets WHERE 1=1"
    p = []
    if category and category != "all": sql += " AND category=?"; p.append(category)
    if status and status != "all": sql += " AND status=?"; p.append(status)
    if min_price is not None: sql += " AND price >= ?"; p.append(min_price)
    if max_price is not None: sql += " AND price <= ?"; p.append(max_price)
    if search:
        s = f"%{search}%"
        sql += " AND (name LIKE ? OR breed LIKE ? OR supplier LIKE ? OR description LIKE ?)"
        p.extend([s, s, s, s])
    sort_map = {"name": "name ASC", "price": "price ASC", "quantity": "quantity ASC", "created_at": "created_at DESC"}
    sql += f" ORDER BY {sort_map.get(sort, 'name ASC')}"
    rows = db.execute(sql, p).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/admin/pets", status_code=201, tags=["admin"])
def admin_create_pet(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    if not all([data.get("name"), data.get("breed"), data.get("category"), data.get("age"), data.get("price") is not None]):
        raise HTTPException(400, detail="Missing required fields: name, breed, category, age, price")
    cur = db.execute(
        """INSERT INTO pets (name,breed,category,age,price,discount_price,discount_start,discount_end,
           image,images,description,gender,vaccinated,status,supplier,quantity,in_stock)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (data["name"], data["breed"], data["category"], data["age"], data["price"],
         data.get("discount_price"), data.get("discount_start"), data.get("discount_end"),
         data.get("image",""), data.get("images","[]"), data.get("description",""),
         data.get("gender"), 1 if data.get("vaccinated") else 0,
         data.get("status","available"), data.get("supplier",""),
         data.get("quantity",1), 1 if data.get("in_stock",1) else 0))
    db.commit()
    pet = db.execute("SELECT * FROM pets WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(pet)


@app.put("/api/admin/pets/{pet_id}", tags=["admin"])
def admin_update_pet(pet_id: int, data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    if not db.execute("SELECT * FROM pets WHERE id=?", (pet_id,)).fetchone():
        db.close(); raise HTTPException(404, detail="Pet not found")
    db.execute(
        """UPDATE pets SET name=COALESCE(?,name),breed=COALESCE(?,breed),category=COALESCE(?,category),
           age=COALESCE(?,age),price=COALESCE(?,price),discount_price=COALESCE(?,discount_price),
           discount_start=COALESCE(?,discount_start),discount_end=COALESCE(?,discount_end),
           image=COALESCE(?,image),images=COALESCE(?,images),description=COALESCE(?,description),
           gender=COALESCE(?,gender),vaccinated=COALESCE(?,vaccinated),
           status=COALESCE(?,status),supplier=COALESCE(?,supplier),
           quantity=COALESCE(?,quantity),in_stock=COALESCE(?,in_stock),
           updated_at=datetime('now') WHERE id=?""",
        (data.get("name"), data.get("breed"), data.get("category"), data.get("age"),
         data.get("price"), data.get("discount_price"), data.get("discount_start"), data.get("discount_end"),
         data.get("image"), data.get("images"), data.get("description"), data.get("gender"),
         1 if data.get("vaccinated") is not None and data["vaccinated"] else (0 if data.get("vaccinated") is not None else None),
         data.get("status"), data.get("supplier"),
         data.get("quantity"),
         1 if data.get("in_stock") is not None and data["in_stock"] else (0 if data.get("in_stock") is not None else None),
         pet_id))
    db.commit()
    pet = db.execute("SELECT * FROM pets WHERE id=?", (pet_id,)).fetchone()
    db.close()
    return dict(pet)


@app.delete("/api/admin/pets/{pet_id}", tags=["admin"])
def admin_delete_pet(pet_id: int, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    row = db.execute("SELECT * FROM pets WHERE id=?", (pet_id,)).fetchone()
    if not row:
        db.close(); raise HTTPException(404, detail="Pet not found")
    # Log to inventory history
    r = dict(row)
    db.execute("INSERT INTO inventory_history (item_type,item_id,item_name,action,note) VALUES (?,?,?,?,?)",
               ("pet", str(pet_id), r["name"], "discontinued", "Deleted by admin"))
    db.execute("DELETE FROM pets WHERE id=?", (pet_id,))
    db.commit(); db.close()
    return {"message": "Pet deleted successfully"}


# === Food Management (Enhanced) ===
@app.get("/api/admin/foods", tags=["admin"])
def admin_list_foods(
    search: str = Query(None),
    category: str = Query(None),
    status: str = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    sort: str = Query("name"),
    user: dict = Depends(require_admin),
):
    from database import get_db
    db = get_db()
    sql = "SELECT * FROM pet_foods WHERE 1=1"
    p = []
    if category and category != "all": sql += " AND category=?"; p.append(category)
    if status and status != "all": sql += " AND status=?"; p.append(status)
    if min_price is not None: sql += " AND price >= ?"; p.append(min_price)
    if max_price is not None: sql += " AND price <= ?"; p.append(max_price)
    if search:
        s = f"%{search}%"
        sql += " AND (name LIKE ? OR brand LIKE ? OR supplier LIKE ? OR description LIKE ?)"
        p.extend([s, s, s, s])
    sort_map = {"name": "name ASC", "price": "price ASC", "quantity": "quantity ASC", "created_at": "created_at DESC"}
    sql += f" ORDER BY {sort_map.get(sort, 'name ASC')}"
    rows = db.execute(sql, p).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/admin/foods", status_code=201, tags=["admin"])
def admin_create_food(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    import time
    db = get_db()
    if not all([data.get("name"), data.get("category"), data.get("brand"), data.get("price") is not None]):
        raise HTTPException(400, detail="Missing required fields: name, category, brand, price")
    fid = f"f{int(time.time()*1000)}"
    db.execute(
        """INSERT INTO pet_foods (id,name,category,brand,weight,price,discount_price,discount_start,discount_end,
           image,images,description,rating,status,supplier,expiry_date,quantity,in_stock)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (fid, data["name"], data["category"], data["brand"], data.get("weight",""), data["price"],
         data.get("discount_price"), data.get("discount_start"), data.get("discount_end"),
         data.get("image",""), data.get("images","[]"), data.get("description",""),
         data.get("rating",0), data.get("status","available"),
         data.get("supplier",""), data.get("expiry_date"),
         data.get("quantity",1), 1 if data.get("in_stock",1) else 0))
    db.commit()
    food = db.execute("SELECT * FROM pet_foods WHERE id=?", (fid,)).fetchone()
    db.close()
    return dict(food)


@app.put("/api/admin/foods/{food_id}", tags=["admin"])
def admin_update_food(food_id: str, data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    if not db.execute("SELECT * FROM pet_foods WHERE id=?", (food_id,)).fetchone():
        db.close(); raise HTTPException(404, detail="Food not found")
    db.execute(
        """UPDATE pet_foods SET name=COALESCE(?,name),category=COALESCE(?,category),brand=COALESCE(?,brand),
           weight=COALESCE(?,weight),price=COALESCE(?,price),
           discount_price=COALESCE(?,discount_price),discount_start=COALESCE(?,discount_start),
           discount_end=COALESCE(?,discount_end),image=COALESCE(?,image),images=COALESCE(?,images),
           description=COALESCE(?,description),rating=COALESCE(?,rating),
           status=COALESCE(?,status),supplier=COALESCE(?,supplier),
           expiry_date=COALESCE(?,expiry_date),quantity=COALESCE(?,quantity),
           in_stock=COALESCE(?,in_stock),updated_at=datetime('now') WHERE id=?""",
        (data.get("name"), data.get("category"), data.get("brand"), data.get("weight"), data.get("price"),
         data.get("discount_price"), data.get("discount_start"), data.get("discount_end"),
         data.get("image"), data.get("images"), data.get("description"), data.get("rating"),
         data.get("status"), data.get("supplier"), data.get("expiry_date"), data.get("quantity"),
         1 if data.get("in_stock") is not None and data["in_stock"] else (0 if data.get("in_stock") is not None else None),
         food_id))
    db.commit()
    food = db.execute("SELECT * FROM pet_foods WHERE id=?", (food_id,)).fetchone()
    db.close()
    return dict(food)


@app.delete("/api/admin/foods/{food_id}", tags=["admin"])
def admin_delete_food(food_id: str, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    row = db.execute("SELECT * FROM pet_foods WHERE id=?", (food_id,)).fetchone()
    if not row:
        db.close(); raise HTTPException(404, detail="Food not found")
    r = dict(row)
    db.execute("INSERT INTO inventory_history (item_type,item_id,item_name,action,note) VALUES (?,?,?,?,?)",
               ("food", food_id, r["name"], "discontinued", "Deleted by admin"))
    db.execute("DELETE FROM pet_foods WHERE id=?", (food_id,))
    db.commit(); db.close()
    return {"message": "Deleted successfully"}


# === Category Management (Full CRUD) ===
@app.get("/api/admin/categories", tags=["admin"])
def admin_list_categories(user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    rows = db.execute("SELECT * FROM categories ORDER BY type, name").fetchall()
    default_pets = [
        {"id": "all", "name": "All Pets", "icon": "🐾"},
        {"id": "dog", "name": "Dogs", "icon": "🐕"},
        {"id": "cat", "name": "Cats", "icon": "🐱"},
        {"id": "bird", "name": "Birds", "icon": "🐦"},
        {"id": "fish", "name": "Fish", "icon": "🐟"},
        {"id": "rabbit", "name": "Rabbits", "icon": "🐰"},
        {"id": "reptile", "name": "Reptiles", "icon": "🦎"},
    ]
    default_foods = [
        {"id": "all", "name": "All Food", "icon": "🍽️"},
        {"id": "dog", "name": "Dog Food", "icon": "🦴"},
        {"id": "cat", "name": "Cat Food", "icon": "🐟"},
        {"id": "bird", "name": "Bird Food", "icon": "🌾"},
        {"id": "fish", "name": "Fish Food", "icon": "🦐"},
        {"id": "rabbit", "name": "Rabbit Food", "icon": "🥕"},
        {"id": "treats", "name": "Treats", "icon": "🍪"},
        {"id": "reptile", "name": "Reptile Food", "icon": "🦎"},
    ]
    db.close()
    return {"defaults": {"pets": default_pets, "foods": default_foods}, "custom": [dict(r) for r in rows]}


@app.post("/api/admin/categories", status_code=201, tags=["admin"])
def admin_create_category(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    if not data.get("name") or not data.get("type"):
        raise HTTPException(400, detail="Name and type required")
    if data["type"] not in ("pet", "food"):
        raise HTTPException(400, detail="Type must be 'pet' or 'food'")
    db.execute("INSERT INTO categories (name,type,icon) VALUES (?,?,?)",
               (data["name"], data["type"], data.get("icon","📦")))
    db.commit()
    cat = db.execute("SELECT * FROM categories ORDER BY id DESC LIMIT 1").fetchone()
    db.close()
    return dict(cat)


@app.put("/api/admin/categories/{cat_id}", tags=["admin"])
def admin_update_category(cat_id: int, data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    if not db.execute("SELECT * FROM categories WHERE id=?", (cat_id,)).fetchone():
        db.close(); raise HTTPException(404, detail="Category not found")
    db.execute("UPDATE categories SET name=COALESCE(?,name), icon=COALESCE(?,icon) WHERE id=?",
               (data.get("name"), data.get("icon"), cat_id))
    db.commit()
    cat = db.execute("SELECT * FROM categories WHERE id=?", (cat_id,)).fetchone()
    db.close()
    return dict(cat)


@app.delete("/api/admin/categories/{cat_id}", tags=["admin"])
def admin_delete_category(cat_id: int, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    if not db.execute("SELECT * FROM categories WHERE id=?", (cat_id,)).fetchone():
        db.close(); raise HTTPException(404, detail="Category not found")
    db.execute("DELETE FROM categories WHERE id=?", (cat_id,))
    db.commit(); db.close()
    return {"message": "Category deleted"}


# === Inventory Management (Enhanced) ===
@app.get("/api/admin/inventory", tags=["admin"])
def admin_inventory(user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    pets = db.execute("SELECT id,name,category,'pet' as type,status,quantity,created_at FROM pets ORDER BY name").fetchall()
    foods = db.execute("SELECT id,name,category,'food' as type,status,quantity,created_at FROM pet_foods ORDER BY name").fetchall()
    items = [dict(r) for r in pets] + [dict(r) for r in foods]
    low = [i for i in items if i["quantity"] == 0 or i["status"] == "out_of_stock"]
    db.close()
    return {"items": items, "low_stock": low, "low_stock_count": len(low)}


@app.post("/api/admin/inventory/restock", tags=["admin"])
def admin_restock(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    t, iid, qty = data.get("type"), data.get("id"), data.get("quantity", 10)
    if not t or not iid: raise HTTPException(400, detail="Type and id required")
    if t == "pet":
        row = db.execute("SELECT * FROM pets WHERE id=?", (iid,)).fetchone()
        if not row: db.close(); raise HTTPException(404)
        r = dict(row)
        prev_qty = r.get("quantity", 0) or 0
        new_qty = prev_qty + int(qty)
        db.execute("UPDATE pets SET quantity=?,status=?,in_stock=1,updated_at=datetime('now') WHERE id=?",
                   (new_qty, "available", iid))
        db.execute("INSERT INTO inventory_history (item_type,item_id,item_name,action,previous_quantity,new_quantity,note) VALUES (?,?,?,?,?,?,?)",
                   ("pet", str(iid), r["name"], "restock", prev_qty, new_qty, f"Restocked with {qty} units"))
    elif t == "food":
        row = db.execute("SELECT * FROM pet_foods WHERE id=?", (iid,)).fetchone()
        if not row: db.close(); raise HTTPException(404)
        r = dict(row)
        prev_qty = r.get("quantity", 0) or 0
        new_qty = prev_qty + int(qty)
        db.execute("UPDATE pet_foods SET quantity=?,status=?,in_stock=1,updated_at=datetime('now') WHERE id=?",
                   (new_qty, "available", iid))
        db.execute("INSERT INTO inventory_history (item_type,item_id,item_name,action,previous_quantity,new_quantity,note) VALUES (?,?,?,?,?,?,?)",
                   ("food", iid, r["name"], "restock", prev_qty, new_qty, f"Restocked with {qty} units"))
    else: db.close(); raise HTTPException(400, detail="Invalid type")
    db.commit(); db.close()
    return {"message": f"Restocked {qty} units", "type": t, "id": iid}


@app.post("/api/admin/inventory/adjust", tags=["admin"])
def admin_adjust_inventory(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    t, iid, new_qty, note = data.get("type"), data.get("id"), data.get("quantity"), data.get("note", "")
    if not t or not iid or new_qty is None: raise HTTPException(400, detail="Type, id, and quantity required")
    if t == "pet":
        row = db.execute("SELECT * FROM pets WHERE id=?", (iid,)).fetchone()
        if not row: db.close(); raise HTTPException(404)
        r = dict(row)
        prev_qty = r.get("quantity", 0) or 0
        status = "available" if new_qty > 0 else "out_of_stock"
        db.execute("UPDATE pets SET quantity=?,status=?,in_stock=?,updated_at=datetime('now') WHERE id=?",
                   (new_qty, status, 1 if new_qty > 0 else 0, iid))
        db.execute("INSERT INTO inventory_history (item_type,item_id,item_name,action,previous_quantity,new_quantity,note) VALUES (?,?,?,?,?,?,?)",
                   ("pet", str(iid), r["name"], "adjustment", prev_qty, new_qty, note))
    elif t == "food":
        row = db.execute("SELECT * FROM pet_foods WHERE id=?", (iid,)).fetchone()
        if not row: db.close(); raise HTTPException(404)
        r = dict(row)
        prev_qty = r.get("quantity", 0) or 0
        status = "available" if new_qty > 0 else "out_of_stock"
        db.execute("UPDATE pet_foods SET quantity=?,status=?,in_stock=?,updated_at=datetime('now') WHERE id=?",
                   (new_qty, status, 1 if new_qty > 0 else 0, iid))
        db.execute("INSERT INTO inventory_history (item_type,item_id,item_name,action,previous_quantity,new_quantity,note) VALUES (?,?,?,?,?,?,?)",
                   ("food", iid, r["name"], "adjustment", prev_qty, new_qty, note))
    else: db.close(); raise HTTPException(400, detail="Invalid type")
    db.commit(); db.close()
    return {"message": "Inventory adjusted", "type": t, "id": iid, "new_quantity": new_qty}


@app.get("/api/admin/inventory/history", tags=["admin"])
def admin_inventory_history(user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    rows = db.execute("SELECT * FROM inventory_history ORDER BY created_at DESC LIMIT 100").fetchall()
    db.close()
    return [dict(r) for r in rows]


# === Pricing Management ===
@app.post("/api/admin/pricing/discount", tags=["admin"])
def admin_apply_discount(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    t, iid = data.get("type"), data.get("id")
    discount_price = data.get("discount_price")
    start = data.get("start")
    end = data.get("end")
    if not t or not iid or discount_price is None:
        raise HTTPException(400, detail="Type, id, and discount_price required")
    if t == "pet":
        if not db.execute("SELECT * FROM pets WHERE id=?", (iid,)).fetchone(): db.close(); raise HTTPException(404)
        db.execute("UPDATE pets SET discount_price=?,discount_start=?,discount_end=?,updated_at=datetime('now') WHERE id=?",
                   (discount_price, start, end, iid))
    elif t == "food":
        if not db.execute("SELECT * FROM pet_foods WHERE id=?", (iid,)).fetchone(): db.close(); raise HTTPException(404)
        db.execute("UPDATE pet_foods SET discount_price=?,discount_start=?,discount_end=?,updated_at=datetime('now') WHERE id=?",
                   (discount_price, start, end, iid))
    else: db.close(); raise HTTPException(400, detail="Invalid type")
    db.commit(); db.close()
    return {"message": "Discount applied", "type": t, "id": iid, "discount_price": discount_price}


@app.delete("/api/admin/pricing/discount", tags=["admin"])
def admin_remove_discount(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    t, iid = data.get("type"), data.get("id")
    if not t or not iid: raise HTTPException(400, detail="Type and id required")
    if t == "pet":
        if not db.execute("SELECT * FROM pets WHERE id=?", (iid,)).fetchone(): db.close(); raise HTTPException(404)
        db.execute("UPDATE pets SET discount_price=NULL,discount_start=NULL,discount_end=NULL,updated_at=datetime('now') WHERE id=?", (iid,))
    elif t == "food":
        if not db.execute("SELECT * FROM pet_foods WHERE id=?", (iid,)).fetchone(): db.close(); raise HTTPException(404)
        db.execute("UPDATE pet_foods SET discount_price=NULL,discount_start=NULL,discount_end=NULL,updated_at=datetime('now') WHERE id=?", (iid,))
    else: db.close(); raise HTTPException(400, detail="Invalid type")
    db.commit(); db.close()
    return {"message": "Discount removed", "type": t, "id": iid}


# === Image Management ===
@app.post("/api/admin/images", tags=["admin"])
def admin_add_image(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    import json
    db = get_db()
    t, iid, url = data.get("type"), data.get("id"), data.get("url")
    if not t or not iid or not url: raise HTTPException(400, detail="Type, id, and url required")
    if t == "pet":
        row = db.execute("SELECT * FROM pets WHERE id=?", (iid,)).fetchone()
        if not row: db.close(); raise HTTPException(404)
        r = dict(row)
        images = json.loads(r.get("images", "[]") or "[]")
        images.append(url)
        db.execute("UPDATE pets SET images=?,updated_at=datetime('now') WHERE id=?", (json.dumps(images), iid))
    elif t == "food":
        row = db.execute("SELECT * FROM pet_foods WHERE id=?", (iid,)).fetchone()
        if not row: db.close(); raise HTTPException(404)
        r = dict(row)
        images = json.loads(r.get("images", "[]") or "[]")
        images.append(url)
        db.execute("UPDATE pet_foods SET images=?,updated_at=datetime('now') WHERE id=?", (json.dumps(images), iid))
    else: db.close(); raise HTTPException(400, detail="Invalid type")
    db.commit(); db.close()
    return {"message": "Image added", "images": images}


@app.delete("/api/admin/images", tags=["admin"])
def admin_remove_image(data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    import json
    db = get_db()
    t, iid, url = data.get("type"), data.get("id"), data.get("url")
    if not t or not iid or not url: raise HTTPException(400, detail="Type, id, and url required")
    if t == "pet":
        row = db.execute("SELECT * FROM pets WHERE id=?", (iid,)).fetchone()
        if not row: db.close(); raise HTTPException(404)
        r = dict(row)
        images = json.loads(r.get("images", "[]") or "[]")
        images = [img for img in images if img != url]
        db.execute("UPDATE pets SET images=?,updated_at=datetime('now') WHERE id=?", (json.dumps(images), iid))
    elif t == "food":
        row = db.execute("SELECT * FROM pet_foods WHERE id=?", (iid,)).fetchone()
        if not row: db.close(); raise HTTPException(404)
        r = dict(row)
        images = json.loads(r.get("images", "[]") or "[]")
        images = [img for img in images if img != url]
        db.execute("UPDATE pet_foods SET images=?,updated_at=datetime('now') WHERE id=?", (json.dumps(images), iid))
    else: db.close(); raise HTTPException(400, detail="Invalid type")
    db.commit(); db.close()
    return {"message": "Image removed", "images": images}


# === Order Management ===
@app.get("/api/admin/orders", tags=["admin"])
def admin_list_orders(status: str = Query(None), search: str = Query(None), user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    sql = "SELECT o.*,u.name as user_name,u.email as user_email FROM orders o LEFT JOIN users u ON o.user_id=u.id WHERE 1=1"
    p = []
    if status and status != "all": sql += " AND o.status=?"; p.append(status)
    if search: s = f"%{search}%"; sql += " AND (o.id LIKE ? OR u.name LIKE ?)"; p.extend([s, s])
    sql += " ORDER BY o.created_at DESC"
    rows = db.execute(sql, p).fetchall()
    orders = []
    for row in rows:
        o = dict(row)
        o["items"] = [dict(i) for i in db.execute("SELECT * FROM order_items WHERE order_id=? ORDER BY id", (o["id"],)).fetchall()]
        orders.append(o)
    db.close()
    return orders


@app.put("/api/admin/orders/{order_id}/status", tags=["admin"])
def admin_update_order_status(order_id: str, data: dict, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    if not db.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone():
        db.close(); raise HTTPException(404, detail="Order not found")
    s = data.get("status")
    valid = ["pending","confirmed","processing","shipped","delivered","cancelled"]
    if s not in valid: db.close(); raise HTTPException(400, detail="Invalid status")
    db.execute("UPDATE orders SET status=?,updated_at=datetime('now') WHERE id=?", (s, order_id))
    db.commit(); db.close()
    return {"message": f"Status updated to {s}", "order_id": order_id, "status": s}


# === Contact Messages ===
@app.get("/api/admin/messages", tags=["admin"])
def admin_list_messages(user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    rows = db.execute("SELECT * FROM contact_messages ORDER BY created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.delete("/api/admin/messages/{message_id}", tags=["admin"])
def admin_delete_message(message_id: int, user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    if not db.execute("SELECT * FROM contact_messages WHERE id=?", (message_id,)).fetchone():
        db.close(); raise HTTPException(404)
    db.execute("DELETE FROM contact_messages WHERE id=?", (message_id,))
    db.commit(); db.close()
    return {"message": "Deleted"}


# === Users ===
@app.get("/api/admin/users", tags=["admin"])
def admin_list_users(user: dict = Depends(require_admin)):
    from database import get_db
    db = get_db()
    rows = db.execute("SELECT id,name,email,avatar,is_admin,created_at FROM users ORDER BY created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]


# 404 handler
@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"error": "Route not found"})


# Generic error handler
@app.exception_handler(Exception)
async def generic_error(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "Internal server error"})
