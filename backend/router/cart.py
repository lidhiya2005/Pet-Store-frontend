from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from auth import require_user

router = APIRouter(tags=["cart"])


@router.get("")
def list_cart(user: dict = Depends(require_user)):
    db = get_db()
    items = db.execute(
        "SELECT * FROM cart_items WHERE user_id=? ORDER BY created_at DESC",
        (user["id"],),
    ).fetchall()
    db.close()
    return [dict(i) for i in items]


@router.post("", status_code=201)
def add_to_cart(data: dict, user: dict = Depends(require_user)):
    db = get_db()
    t = data.get("item_type")
    iid = data.get("item_id")
    q = data.get("quantity", 1)
    if not t or not iid:
        raise HTTPException(400, detail="item_type and item_id required")
    if t not in ("pet", "food"):
        raise HTTPException(400, detail='item_type must be "pet" or "food"')
    existing = db.execute(
        "SELECT * FROM cart_items WHERE user_id=? AND item_type=? AND item_id=?",
        (user["id"], t, iid),
    ).fetchone()
    if existing:
        db.execute("UPDATE cart_items SET quantity=quantity+? WHERE id=?", (q, existing["id"]))
    else:
        db.execute("INSERT INTO cart_items (user_id,item_type,item_id,quantity) VALUES (?,?,?,?)", (user["id"], t, iid, q))
    db.commit()
    items = db.execute(
        "SELECT * FROM cart_items WHERE user_id=? ORDER BY created_at DESC",
        (user["id"],),
    ).fetchall()
    db.close()
    return [dict(i) for i in items]


@router.put("/{item_id}")
def update_cart_item(item_id: int, data: dict, user: dict = Depends(require_user)):
    db = get_db()
    q = data.get("quantity")
    item = db.execute("SELECT * FROM cart_items WHERE id=? AND user_id=?", (item_id, user["id"])).fetchone()
    if not item:
        db.close()
        raise HTTPException(404, detail="Cart item not found")
    if q is not None and q <= 0:
        db.execute("DELETE FROM cart_items WHERE id=?", (item_id,))
    else:
        db.execute("UPDATE cart_items SET quantity=? WHERE id=?", (q, item_id))
    db.commit()
    items = db.execute(
        "SELECT * FROM cart_items WHERE user_id=? ORDER BY created_at DESC",
        (user["id"],),
    ).fetchall()
    db.close()
    return [dict(i) for i in items]


@router.delete("")
def clear_cart(user: dict = Depends(require_user)):
    db = get_db()
    db.execute("DELETE FROM cart_items WHERE user_id=?", (user["id"],))
    db.commit()
    db.close()
    return []


@router.delete("/{item_id}")
def remove_cart_item(item_id: int, user: dict = Depends(require_user)):
    db = get_db()
    item = db.execute("SELECT * FROM cart_items WHERE id=? AND user_id=?", (item_id, user["id"])).fetchone()
    if not item:
        db.close()
        raise HTTPException(404, detail="Cart item not found")
    db.execute("DELETE FROM cart_items WHERE id=?", (item_id,))
    db.commit()
    items = db.execute(
        "SELECT * FROM cart_items WHERE user_id=? ORDER BY created_at DESC",
        (user["id"],),
    ).fetchall()
    db.close()
    return [dict(i) for i in items]
