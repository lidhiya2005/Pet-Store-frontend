from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_db
from auth import require_user

router = APIRouter(tags=["pets"])


@router.get("")
def list_pets(category: str = Query(None), search: str = Query(None)):
    db = get_db()
    sql = "SELECT * FROM pets WHERE 1=1"
    params = []
    if category and category != "all":
        sql += " AND category = ?"
        params.append(category)
    if search:
        sql += " AND (name LIKE ? OR breed LIKE ? OR description LIKE ?)"
        st = f"%{search}%"
        params.extend([st, st, st])
    sql += " ORDER BY name ASC"
    rows = db.execute(sql, params).fetchall()
    db.close()
    return [dict(r) for r in rows]


@router.get("/categories")
def get_categories():
    return [
        {"id": "all", "label": "All Pets", "icon": "🐾"},
        {"id": "dog", "label": "Dogs", "icon": "🐕"},
        {"id": "cat", "label": "Cats", "icon": "🐱"},
        {"id": "bird", "label": "Birds", "icon": "🐦"},
        {"id": "fish", "label": "Fish", "icon": "🐟"},
        {"id": "rabbit", "label": "Rabbits", "icon": "🐰"},
        {"id": "reptile", "label": "Reptiles", "icon": "🦎"},
    ]


@router.get("/{pet_id}")
def get_pet(pet_id: int):
    db = get_db()
    pet = db.execute("SELECT * FROM pets WHERE id = ?", (pet_id,)).fetchone()
    db.close()
    if not pet:
        raise HTTPException(404, detail="Pet not found")
    return dict(pet)


@router.post("", status_code=201)
def create_pet(data: dict, user: dict = Depends(require_user)):
    db = get_db()
    if not all([data.get("name"), data.get("breed"), data.get("category"), data.get("age"), data.get("price")]):
        raise HTTPException(400, detail="Missing required fields: name, breed, category, age, price")
    cur = db.execute(
        "INSERT INTO pets (name,breed,category,age,price,image,description,gender,vaccinated) VALUES (?,?,?,?,?,?,?,?,?)",
        (data["name"], data["breed"], data["category"], data["age"], data["price"],
         data.get("image", ""), data.get("description", ""), data.get("gender"),
         1 if data.get("vaccinated") else 0),
    )
    db.commit()
    pet = db.execute("SELECT * FROM pets WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(pet)


@router.put("/{pet_id}")
def update_pet(pet_id: int, data: dict, user: dict = Depends(require_user)):
    db = get_db()
    if not db.execute("SELECT * FROM pets WHERE id=?", (pet_id,)).fetchone():
        db.close()
        raise HTTPException(404, detail="Pet not found")
    db.execute(
        "UPDATE pets SET name=COALESCE(?,name), breed=COALESCE(?,breed), category=COALESCE(?,category), age=COALESCE(?,age), price=COALESCE(?,price), image=COALESCE(?,image), description=COALESCE(?,description), gender=COALESCE(?,gender), vaccinated=COALESCE(?,vaccinated), in_stock=COALESCE(?,in_stock), updated_at=datetime('now') WHERE id=?",
        (data.get("name"), data.get("breed"), data.get("category"), data.get("age"),
         data.get("price"), data.get("image"), data.get("description"), data.get("gender"),
         1 if data.get("vaccinated") is not None and data["vaccinated"] else (0 if data.get("vaccinated") is not None else None),
         1 if data.get("in_stock") is not None and data["in_stock"] else (0 if data.get("in_stock") is not None else None),
         pet_id))
    db.commit()
    pet = db.execute("SELECT * FROM pets WHERE id=?", (pet_id,)).fetchone()
    db.close()
    return dict(pet)


@router.delete("/{pet_id}")
def delete_pet(pet_id: int, user: dict = Depends(require_user)):
    db = get_db()
    if not db.execute("SELECT * FROM pets WHERE id=?", (pet_id,)).fetchone():
        db.close()
        raise HTTPException(404, detail="Pet not found")
    db.execute("DELETE FROM pets WHERE id=?", (pet_id,))
    db.commit()
    db.close()
    return {"message": "Pet deleted successfully"}
