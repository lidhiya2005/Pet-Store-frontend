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


@router.get("/purposes")
def list_purposes():
    db = get_db()
    rows = db.execute("SELECT * FROM consultation_purposes ORDER BY id ASC").fetchall()
    db.close()
    return [dict(r) for r in rows]


@router.get("")
def list_consultations(user: dict = Depends(require_user)):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM consultations WHERE user_id=? ORDER BY created_at DESC",
        (user["id"],),
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


@router.post("", status_code=201)
def book_consultation(data: dict, user: dict = Depends(get_current_user)):
    db = get_db()
    required = ["service_id", "pet_name", "pet_type", "pet_age", "owner_name", "email", "phone", "preferred_date", "preferred_time"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        raise HTTPException(400, detail=f"Required: {', '.join(missing)}")
    uid = user["id"] if user else None
    purposes = data.get("purposes")
    purposes_str = ",".join(purposes) if isinstance(purposes, list) else (purposes or None)
    cur = db.execute(
        "INSERT INTO consultations (user_id,service_id,pet_name,pet_type,pet_breed,pet_age,pet_weight,pet_gender,owner_name,email,phone,address,purposes,allergies,medications,chronic_conditions,is_vaccinated,had_surgeries,last_vet_visit,emergency_name,emergency_phone,emergency_relation,preferred_date,preferred_time,preferred_contact,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (uid, data["service_id"], data["pet_name"], data["pet_type"], data.get("pet_breed"),
         data["pet_age"], data.get("pet_weight"), data.get("pet_gender"),
         data["owner_name"], data["email"], data["phone"], data.get("address"),
         purposes_str, data.get("allergies"), data.get("medications"), data.get("chronic_conditions"),
         data.get("is_vaccinated"), data.get("had_surgeries"), data.get("last_vet_visit"),
         data.get("emergency_name"), data.get("emergency_phone"), data.get("emergency_relation"),
         data["preferred_date"], data["preferred_time"], data.get("preferred_contact", "email"),
         data.get("notes")),
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
