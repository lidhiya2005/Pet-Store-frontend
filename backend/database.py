import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "petstore.db"


def get_db() -> sqlite3.Connection:
    """Get a database connection with row factory enabled."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize the database and create all tables if they don't exist."""
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            avatar TEXT,
            is_admin INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            breed TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('dog','cat','bird','fish','rabbit','reptile')),
            age TEXT NOT NULL,
            price REAL NOT NULL,
            discount_price REAL,
            discount_start TEXT,
            discount_end TEXT,
            image TEXT NOT NULL,
            images TEXT DEFAULT '[]',
            description TEXT,
            gender TEXT CHECK(gender IN ('male','female')),
            vaccinated INTEGER DEFAULT 0,
            in_stock INTEGER DEFAULT 1,
            status TEXT DEFAULT 'available' CHECK(status IN ('available','out_of_stock','discontinued')),
            supplier TEXT,
            quantity INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS pet_foods (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            brand TEXT NOT NULL,
            weight TEXT NOT NULL,
            price REAL NOT NULL,
            discount_price REAL,
            discount_start TEXT,
            discount_end TEXT,
            image TEXT NOT NULL,
            images TEXT DEFAULT '[]',
            description TEXT,
            rating REAL DEFAULT 0,
            in_stock INTEGER DEFAULT 1,
            status TEXT DEFAULT 'available' CHECK(status IN ('available','out_of_stock','discontinued')),
            supplier TEXT,
            expiry_date TEXT,
            quantity INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('pet','food')),
            icon TEXT DEFAULT '📦',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS inventory_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_type TEXT NOT NULL CHECK(item_type IN ('pet','food')),
            item_id TEXT NOT NULL,
            item_name TEXT NOT NULL,
            action TEXT NOT NULL CHECK(action IN ('restock','adjustment','ordered','discontinued')),
            previous_quantity INTEGER DEFAULT 0,
            new_quantity INTEGER DEFAULT 0,
            note TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS consultation_types (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            duration TEXT NOT NULL,
            price REAL NOT NULL,
            icon TEXT,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS consultations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            service_id TEXT NOT NULL,
            pet_name TEXT NOT NULL,
            pet_type TEXT NOT NULL,
            pet_breed TEXT,
            pet_age TEXT NOT NULL,
            preferred_date TEXT,
            description TEXT NOT NULL,
            phone TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (service_id) REFERENCES consultation_types(id)
        );

        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS cart_items;
        DROP TABLE IF EXISTS consultation_purposes;

        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            item_type TEXT NOT NULL CHECK(item_type IN ('pet','food')),
            item_id TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
            payment_method TEXT NOT NULL CHECK(payment_method = 'cod'),
            payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','failed','refunded')),
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            shipping REAL NOT NULL,
            total REAL NOT NULL,
            shipping_name TEXT NOT NULL,
            shipping_email TEXT NOT NULL,
            shipping_phone TEXT,
            shipping_address TEXT NOT NULL,
            shipping_city TEXT NOT NULL,
            shipping_state TEXT,
            shipping_zip TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            item_type TEXT NOT NULL CHECK(item_type IN ('pet','food')),
            item_id TEXT NOT NULL,
            name TEXT NOT NULL,
            breed TEXT,
            image TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (order_id) REFERENCES orders(id)
        );

        CREATE TABLE IF NOT EXISTS testimonials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            text TEXT NOT NULL,
            avatar TEXT NOT NULL,
            rating INTEGER CHECK(rating >= 1 AND rating <= 5),
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)

    # Migrations for existing databases
    migrations = [
        ("users", "is_admin", "INTEGER DEFAULT 0"),
        ("pets", "discount_price", "REAL"),
        ("pets", "discount_start", "TEXT"),
        ("pets", "discount_end", "TEXT"),
        ("pets", "images", "TEXT DEFAULT '[]'"),
        ("pets", "status", "TEXT DEFAULT 'available'"),
        ("pets", "supplier", "TEXT"),
        ("pets", "quantity", "INTEGER DEFAULT 1"),
        ("pet_foods", "discount_price", "REAL"),
        ("pet_foods", "discount_start", "TEXT"),
        ("pet_foods", "discount_end", "TEXT"),
        ("pet_foods", "images", "TEXT DEFAULT '[]'"),
        ("pet_foods", "status", "TEXT DEFAULT 'available'"),
        ("pet_foods", "supplier", "TEXT"),
        ("pet_foods", "expiry_date", "TEXT"),
        ("pet_foods", "quantity", "INTEGER DEFAULT 1"),
    ]
    for table, col, col_type in migrations:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
            print(f"  - Added {col} column to {table} table")
        except sqlite3.OperationalError:
            pass

    # Add preferred_date to consultations if missing (existing databases)
    try:
        ccols = {r[1] for r in conn.execute("PRAGMA table_info(consultations)").fetchall()}
        if "preferred_date" not in ccols:
            conn.execute("ALTER TABLE consultations ADD COLUMN preferred_date TEXT")
            print("  - Added preferred_date column to consultations table")
    except sqlite3.OperationalError:
        pass

    # Migrate consultations: keep only pet details, description, and guardian phone.
    # Old rows map their `notes` text into the new `description` column.
    try:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(consultations)").fetchall()}
        if "email" in cols:
            print("  - Migrating consultations table (dropping unused columns)")
            conn.executescript(
                """
                PRAGMA foreign_keys=OFF;
                ALTER TABLE consultations RENAME TO consultations_old;
                CREATE TABLE consultations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    service_id TEXT NOT NULL,
                    pet_name TEXT NOT NULL,
                    pet_type TEXT NOT NULL,
                    pet_breed TEXT,
                    pet_age TEXT NOT NULL,
                    preferred_date TEXT,
                    description TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','completed','cancelled')),
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now')),
                    FOREIGN KEY (service_id) REFERENCES consultation_types(id)
                );
                INSERT INTO consultations (id, user_id, service_id, pet_name, pet_type, pet_breed, pet_age, preferred_date, description, phone, status, created_at, updated_at)
                    SELECT id, user_id, service_id, pet_name, pet_type, pet_breed, pet_age,
                           preferred_date,
                           COALESCE(NULLIF(TRIM(notes), ''), 'Consult request'),
                           phone, status, created_at, updated_at
                    FROM consultations_old;
                DROP TABLE consultations_old;
                PRAGMA foreign_keys=ON;
                """
            )
    except sqlite3.OperationalError as e:
        print(f"  - Skipped consultations migration: {e}")

    conn.commit()
    conn.close()
    print("Database tables initialized")
