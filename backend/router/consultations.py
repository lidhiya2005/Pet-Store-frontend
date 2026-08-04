from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import require_user, get_current_user

router = APIRouter(tags=["consultations"])


@router.get("/types")
def list_types():
    db = get_db()
    rows = db.execute("SELECT * FROM consultation_types ORDER BY price ASC").fetchall()
    db.close()
    return [dict(r) for r in rows]


@router.get("")
def list_consultations(user: dict = Depends(require_user)):
    db = get_db()
    rows = db.execute(
        """
        SELECT c.*, ct.name AS service_name, ct.icon AS service_icon, ct.price AS service_price
        FROM consultations c
        LEFT JOIN consultation_types ct ON ct.id = c.service_id
        WHERE c.user_id=? ORDER BY c.created_at DESC
        """,
        (user["id"],),
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


@router.post("", status_code=201)
def book_consultation(data: dict, user: dict = Depends(get_current_user)):
    db = get_db()
    required = ["service_id", "pet_name", "pet_type", "pet_age", "description", "phone"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        raise HTTPException(400, detail=f"Required: {', '.join(missing)}")
    uid = user["id"] if user else None
    cur = db.execute(
        "INSERT INTO consultations (user_id,service_id,pet_name,pet_type,pet_breed,pet_age,preferred_date,description,phone) VALUES (?,?,?,?,?,?,?,?,?)",
        (uid, data["service_id"], data["pet_name"], data["pet_type"], data.get("pet_breed"),
         data["pet_age"], data.get("preferred_date"), data["description"], data["phone"]),
    )
    db.commit()
    c = db.execute("SELECT * FROM consultations WHERE id=?", (cur.lastrowid,)).fetchone()
    db.close()
    return dict(c)


@router.get("/{cid}")
def get_consultation(cid: int):
    db = get_db()
    c = db.execute("SELECT * FROM consultations WHERE id=?", (cid,)).fetchone()
    db.close()
    if not c:
        raise HTTPException(404, detail="Not found")
    return dict(c)


@router.patch("/{cid}/status")
def update_status(cid: int, data: dict, user: dict = Depends(require_user)):
    db = get_db()
    s = data.get("status")
    if s not in ("pending", "confirmed", "completed", "cancelled"):
        raise HTTPException(400, detail="Invalid status")
    if not db.execute("SELECT * FROM consultations WHERE id=?", (cid,)).fetchone():
        db.close()
        raise HTTPException(404, detail="Not found")
    db.execute("UPDATE consultations SET status=?, updated_at=datetime('now') WHERE id=?", (s, cid))
    db.commit()
    c = db.execute("SELECT * FROM consultations WHERE id=?", (cid,)).fetchone()
    db.close()
    return dict(c)
