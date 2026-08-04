"""Content-based filtering recommendation engine.

Ranks pets / pet foods by how similar they are to a seed item (or a set of
cart items) using item attributes:

  - same category          -> +3
  - same breed / brand     -> +2
  - price within +-25%     -> +1
  - shared description kw  -> +1

Exposes two endpoints:
  GET  /api/recommendations          -> similar items given filters / a seed item
  POST /api/recommendations/from-items -> similar + complementary items for cart contents
"""

from fastapi import APIRouter, Depends, Query
from database import get_db
from auth import get_current_user

router = APIRouter(tags=["recommendations"])

CATEGORY_WEIGHT = 3
ATTR_WEIGHT = 2  # breed (pets) / brand (foods)
PRICE_WEIGHT = 1
DESC_WEIGHT = 1

MAX_LIMIT = 12


def _fetch_rows(sql: str, params=()):
    db = get_db()
    rows = [dict(r) for r in db.execute(sql, params).fetchall()]
    db.close()
    return rows


def _description_keywords(text: str) -> set:
    stop = {"the", "a", "an", "and", "or", "for", "with", "to", "of", "in", "on"}
    return {w for w in (text or "").lower().replace(",", " ").split() if w not in stop and len(w) > 2}


def _similarity_score(item: dict, seed: dict, item_type: str) -> int:
    """Content-based similarity between an item and a seed item."""
    score = 0
    if item.get("category") and item["category"] == seed.get("category"):
        score += CATEGORY_WEIGHT
    attr_key = "breed" if item_type == "pet" else "brand"
    if seed.get(attr_key) and item.get(attr_key) and seed[attr_key].lower() == item[attr_key].lower():
        score += ATTR_WEIGHT
    try:
        item_price = float(item.get("price") or 0)
        seed_price = float(seed.get("price") or 0)
        if seed_price > 0 and 0.75 * seed_price <= item_price <= 1.25 * seed_price:
            score += PRICE_WEIGHT
    except (TypeError, ValueError):
        pass
    overlap = _description_keywords(seed.get("description")) & _description_keywords(item.get("description"))
    if overlap:
        score += DESC_WEIGHT
    return score


def _rank_items(items: list, seed: dict, item_type: str, exclude_ids: set) -> list:
    """Score every item against the seed and return them sorted best first."""
    scored = []
    for item in items:
        if str(item.get("id")) in exclude_ids:
            continue
        if item_type == "food" and not item.get("in_stock"):
            continue
        score = _similarity_score(item, seed, item_type)
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda pair: -pair[0])
    return [item for _, item in scored]


def _pets() -> list:
    return _fetch_rows("SELECT * FROM pets")


def _foods() -> list:
    return _fetch_rows("SELECT * FROM pet_foods")


@router.get("")
def get_recommendations(
    item_type: str = Query("pet", pattern="^(pet|food)$"),
    category: str = Query(None),
    breed: str = Query(None),
    brand: str = Query(None),
    price: float = Query(None),
    exclude_ids: str = Query(None),
    limit: int = Query(6, ge=1, le=MAX_LIMIT),
):
    """Return content-based recommendations.

    Pass `category` to get same-category items, or pass `breed`/`brand` and
    `price` to get attribute-matched items. `exclude_ids` accepts a
    comma-separated list of ids to leave out.
    """
    items = _pets() if item_type == "pet" else _foods()
    exclude = {x for x in (exclude_ids or "").split(",") if x}

    seed = {}
    if category and category != "all":
        seed["category"] = category
    if breed:
        seed["breed"] = breed
    if brand:
        seed["brand"] = brand
    if price is not None:
        seed["price"] = price

    if not seed:
        # No seed context: fall back to popular / in-stock items.
        ranked = list(items)
        if item_type == "food":
            ranked.sort(key=lambda i: -(i.get("rating") or 0))
        else:
            ranked.sort(key=lambda i: i.get("created_at") or "", reverse=True)
        results = [i for i in ranked if str(i.get("id")) not in exclude and (item_type == "pet" or i.get("in_stock"))][:limit]
        for r in results:
            r["item_type"] = item_type
            r["reason"] = "Popular right now"
        return results

    ranked = _rank_items(items, seed, item_type, exclude)

    results = []
    for item in ranked[:limit]:
        out = dict(item)
        out["item_type"] = item_type
        reasons = []
        if out.get("category") and out["category"] == seed.get("category"):
            reasons.append(f"Same category: {out['category']}")
        attr_key = "breed" if item_type == "pet" else "brand"
        if seed.get(attr_key) and out.get(attr_key) and seed[attr_key].lower() == out[attr_key].lower():
            reasons.append(f"Same {attr_key}: {out[attr_key]}")
        if seed.get("price") and out.get("price") and abs(float(out["price"]) - float(seed["price"])) <= 0.25 * float(seed["price"]):
            reasons.append("Similar price")
        out["reason"] = reasons[0] if reasons else "Matches your taste"
        results.append(out)
    return results


@router.post("/from-items")
def recommend_from_items(data: dict, user: dict = Depends(get_current_user)):
    """Content-based recommendations built from the current cart.

    Body: {"items": [{"item_type": "pet"|"food", "item_id": "1", "quantity": 1}]}

    Returns up to 8 recommendations: items similar to what is in the cart plus
    complementary pairings (e.g. food for the pet breeds/categories in cart).
    """
    raw = data.get("items") or []
    if not raw:
        return []

    try:
        limit = min(int(data.get("limit", 8)), MAX_LIMIT)
    except (TypeError, ValueError):
        limit = MAX_LIMIT
    pets = _pets()
    foods = _foods()
    pets_by_id = {str(p["id"]): p for p in pets}
    foods_by_id = {str(f["id"]): f for f in foods}

    cart_pets = []
    cart_foods = []
    for entry in raw:
        t = entry.get("item_type")
        iid = str(entry.get("item_id"))
        if t == "pet" and iid in pets_by_id:
            cart_pets.append(pets_by_id[iid])
        elif t == "food" and iid in foods_by_id:
            cart_foods.append(foods_by_id[iid])

    exclude = {str(p["id"]) for p in cart_pets} | {str(f["id"]) for f in cart_foods}
    scored = {}  # id -> (score, item)

    def add_candidate(item, seed, item_type, weight_multiplier=1.0):
        iid = str(item["id"])
        if iid in exclude:
            return
        score = _similarity_score(item, seed, item_type) * weight_multiplier
        if score > 0:
            if iid not in scored or score > scored[iid][0]:
                scored[iid] = (score, item)

    # 1) Similar items to each cart pet / cart food.
    for seed in cart_pets:
        for item in _rank_items(pets, seed, "pet", exclude):
            add_candidate(item, seed, "pet")
    for seed in cart_foods:
        for item in _rank_items(foods, seed, "food", exclude):
            add_candidate(item, seed, "food")

    # 2) Complementary food: if the cart has a dog, recommend dog food, etc.
    cart_categories = {p.get("category") for p in cart_pets if p.get("category")}
    if cart_categories:
        for f in foods:
            if f.get("category") in cart_categories and str(f["id"]) not in exclude:
                score = 3 + (f.get("rating") or 0)
                if str(f["id"]) not in scored or score > scored[str(f["id"])][0]:
                    scored[str(f["id"])] = (score, f)

    # 3) Complementary pets: if cart has cat food, suggest cats.
    food_categories = {f.get("category") for f in cart_foods if f.get("category") and f["category"] != "treats"}
    if food_categories:
        for p in pets:
            if p.get("category") in food_categories and str(p["id"]) not in exclude:
                score = 3
                if str(p["id"]) not in scored or score > scored[str(p["id"])][0]:
                    scored[str(p["id"])] = (score, p)

    ordered = sorted(scored.items(), key=lambda kv: -kv[1][0])
    results = []
    for iid, (score, item) in ordered[:limit]:
        out = dict(item)
        out["item_type"] = "pet" if "breed" in out else "food"
        out["reason"] = _recommendation_reason(out, cart_pets, cart_foods)
        out["score"] = round(score, 2)
        results.append(out)
    return results


def _recommendation_reason(item: dict, cart_pets: list, cart_foods: list) -> str:
    """Human-readable reason for a recommendation given cart contents."""
    if "breed" in item:
        # It's a pet
        for f in cart_foods:
            if f.get("category") == item.get("category"):
                return f"Pairs with {f['name']}"
        for p in cart_pets:
            if p.get("breed") and p["breed"] == item.get("breed"):
                return f"Similar to {p['name']}"
        for p in cart_pets:
            if p.get("category") == item.get("category"):
                return f"More {item['category']}s like {p['name']}"
        return "You might also like"
    # It's food
    for p in cart_pets:
        if p.get("category") == item.get("category"):
            return f"Food for {p['name']}"
    for f in cart_foods:
        if f.get("brand") and f["brand"] == item.get("brand"):
            return f"Same brand as {f['name']}"
    for f in cart_foods:
        if f.get("category") == item.get("category"):
            return f"Similar to {f['name']}"
    return "Popular choice"
