import re
from fastapi import APIRouter, HTTPException
from database import get_db

router = APIRouter(tags=["contact"])


@router.get("/messages")
def list_messages():
    db = get_db()
    rows = db.execute("SELECT * FROM contact_messages ORDER BY created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]


@router.post("", status_code=201)
def submit_contact(data: dict):
    name = data.get("name")
    email = data.get("email")
    msg = data.get("message")
    if not name or not email or not msg:
        raise HTTPException(400, detail="Name, email, and message required")
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        raise HTTPException(400, detail="Invalid email")
    db = get_db()
    db.execute("INSERT INTO contact_messages (name,email,message) VALUES (?,?,?)", (name, email, msg))
    db.commit()
    db.close()
    return {"message": "Message sent successfully! We will get back to you soon."}
