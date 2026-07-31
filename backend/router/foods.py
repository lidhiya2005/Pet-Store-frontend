from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_db
from auth import require_user

router = APIRouter(tags=["foods"])


@router.get("")
def list_foods(category: str = Query(None), search: str = Query(None)):
    db = get_db()
    sql = "SELECT * FROM pet_foods WHERE 1=1"
    params = []
    if category and category != "all":
        sql += " AND category = ?"
        params.append(category)
    if search:
        sql += " AND (name LIKE ? OR brand LIKE ? OR description LIKE ?)"
        st = f"%{search}%"
        params.extend([st, st, st])
    sql += " ORDER BY name ASC"
    rows = db.execute(sql, params).fetchall()
    db.close()
    return [dict(r) for r in rows]


@router.get("/categories")
def get_categories():
    return [
        {"id": "all", "label": "All Food", "icon": "🍽️"},
        {"id": "dog", "label": "Dog Food", "icon": "🦴"},
        {"id": "cat", "label": "Cat Food", "icon": "🐟"},
        {"id": "bird", "label": "Bird Food", "icon": "🌾"},
        {"id": "fish", "label": "Fish Food", "icon": "🦐"},
        {"id": "rabbit", "label": "Rabbit Food", "icon": "🥕"},
        {"id": "treats", "label": "Treats", "icon": "🍪"},
    ]


@router.get("/{food_id}")
def get_food(food_id: str):
    db = get_db()
    food = db.execute("SELECT * FROM pet_foods WHERE id = ?", (food_id,)).fetchone()
    db.close()
    if not food:
        raise HTTPException(404, detail="Pet food not found")
    return dict(food)


@router.post("", status_code=201)
def create_food(data: dict, user: dict = Depends(require_user)):
    db = get_db()
    if not all([data.get("name"), data.get("category"), data.get("brand"), data.get("weight"), data.get("price")]):
        raise HTTPException(400, detail="Missing required fields: name, category, brand, weight, price")
    import time
    fid = data.get("id") or f"f{int(time.time()*1000)}"
    db.execute(
        "INSERT INTO pet_foods (id,name,category,brand,weight,price,image,description,rating,in_stock) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (fid, data["name"], data["category"], data["brand"], data["weight"], data["price"],
         data.get("image", ""), data.get("description", ""), data.get("rating", 0),
         1 if data.get("in_stock", True) else 0),
    )
    db.commit()
    food = db.execute("SELECT * FROM pet_foods WHERE id=?", (fid,)).fetchone()
    db.close()
    return dict(food)


@router.put("/{food_id}")
def update_food(food_id: str, data: dict, user: dict = Depends(require_user)):
    db = get_db()
    if not db.execute("SELECT * FROM pet_foods WHERE id=?", (food_id,)).fetchone():
        db.close()
        raise HTTPException(404, detail="Pet food not found")
    db.execute(
        "UPDATE pet_foods SET name=COALESCE(?,name), category=COALESCE(?,category), brand=COALESCE(?,brand), weight=COALESCE(?,weight), price=COALESCE(?,price), image=COALESCE(?,image), description=COALESCE(?,description), rating=COALESCE(?,rating), in_stock=COALESCE(?,in_stock), updated_at=datetime('now') WHERE id=?",
        (data.get("name"), data.get("category"), data.get("brand"), data.get("weight"),
         data.get("price"), data.get("image"), data.get("description"), data.get("rating"),
         1 if data.get("in_stock") is not None and data["in_stock"] else (0 if data.get("in_stock") is not None else None),
         food_id))
    db.commit()
    food = db.execute("SELECT * FROM pet_foods WHERE id=?", (food_id,)).fetchone()
    db.close()
    return dict(food)


@router.delete("/{food_id}")
def delete_food(food_id: str, user: dict = Depends(require_user)):
    db = get_db()
    if not db.execute("SELECT * FROM pet_foods WHERE id=?", (food_id,)).fetchone():
        db.close()
        raise HTTPException(404, detail="Pet food not found")
    db.execute("DELETE FROM pet_foods WHERE id=?", (food_id,))
    db.commit()
    db.close()
    return {"message": "Pet food deleted successfully"}
