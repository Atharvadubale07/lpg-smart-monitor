import sqlite3
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

if os.environ.get("VERCEL") or os.environ.get("USE_TMP_DB"):
    DB_PATH = "/tmp/lpg_monitor.db"
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "lpg_monitor.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        cylinder_name TEXT NOT NULL,
        tare_weight REAL NOT NULL,
        full_lpg_capacity REAL NOT NULL,
        refill_threshold_days INTEGER NOT NULL,
        critical_threshold_kg REAL NOT NULL,
        warning_threshold_kg REAL NOT NULL,
        active_model TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Sensor readings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        raw_weight REAL NOT NULL,
        tare_weight REAL NOT NULL,
        lpg_remaining REAL NOT NULL,
        battery_pct REAL DEFAULT 100.0,
        rssi INTEGER DEFAULT -55,
        source TEXT DEFAULT 'simulation',
        is_anomaly INTEGER DEFAULT 0,
        notes TEXT DEFAULT ''
    )
    """)

    # Daily aggregated consumption table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_consumption (
        date TEXT PRIMARY KEY,
        start_lpg REAL NOT NULL,
        end_lpg REAL NOT NULL,
        consumption REAL NOT NULL,
        cycle_id INTEGER DEFAULT 1,
        is_weekend INTEGER DEFAULT 0,
        notes TEXT DEFAULT ''
    )
    """)

    # Alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        lpg_at_time REAL NOT NULL,
        is_acknowledged INTEGER DEFAULT 0
    )
    """)

    # Cylinder cycles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cylinder_cycles (
        cycle_id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        initial_lpg REAL NOT NULL,
        total_days INTEGER DEFAULT 0,
        avg_daily_burn REAL DEFAULT 0.0,
        status TEXT DEFAULT 'active'
    )
    """)

    # Default settings row if not present
    cursor.execute("SELECT id FROM settings WHERE id = 1")
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO settings (
            id, cylinder_name, tare_weight, full_lpg_capacity,
            refill_threshold_days, critical_threshold_kg, warning_threshold_kg,
            active_model, updated_at
        ) VALUES (
            1, 'Domestic 14.2 kg Cylinder', 15.3, 14.2,
            7, 2.0, 3.5,
            'random_forest', ?
        )
        """, (datetime.now().isoformat(),))

    conn.commit()
    conn.close()

def get_settings() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "cylinder_name": "Domestic 14.2 kg Cylinder",
        "tare_weight": 15.3,
        "full_lpg_capacity": 14.2,
        "refill_threshold_days": 7,
        "critical_threshold_kg": 2.0,
        "warning_threshold_kg": 3.5,
        "active_model": "random_forest"
    }

def update_settings(data: Dict[str, Any]):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE settings SET
        cylinder_name = ?,
        tare_weight = ?,
        full_lpg_capacity = ?,
        refill_threshold_days = ?,
        critical_threshold_kg = ?,
        warning_threshold_kg = ?,
        active_model = ?,
        updated_at = ?
    WHERE id = 1
    """, (
        data.get("cylinder_name", "Domestic 14.2 kg Cylinder"),
        data.get("tare_weight", 15.3),
        data.get("full_lpg_capacity", 14.2),
        data.get("refill_threshold_days", 7),
        data.get("critical_threshold_kg", 2.0),
        data.get("warning_threshold_kg", 3.5),
        data.get("active_model", "random_forest"),
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()

def insert_sensor_reading(raw_weight: float, tare_weight: float, source: str = 'simulation', 
                          battery_pct: float = 100.0, rssi: int = -55, 
                          timestamp: Optional[str] = None, is_anomaly: int = 0, notes: str = "") -> int:
    conn = get_connection()
    cursor = conn.cursor()
    if not timestamp:
        timestamp = datetime.now().isoformat()
    lpg_remaining = max(0.0, round(raw_weight - tare_weight, 3))
    
    cursor.execute("""
    INSERT INTO sensor_readings (timestamp, raw_weight, tare_weight, lpg_remaining, battery_pct, rssi, source, is_anomaly, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (timestamp, raw_weight, tare_weight, lpg_remaining, battery_pct, rssi, source, is_anomaly, notes))
    
    reading_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return reading_id

def get_latest_reading() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_recent_readings(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_readings ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    # return chronologically ascending
    return [dict(r) for r in reversed(rows)]

def insert_alert(alert_type: str, severity: str, message: str, lpg_at_time: float, timestamp: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    if not timestamp:
        timestamp = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO alerts (timestamp, alert_type, severity, message, lpg_at_time, is_acknowledged)
    VALUES (?, ?, ?, ?, ?, 0)
    """, (timestamp, alert_type, severity, message, lpg_at_time))
    conn.commit()
    conn.close()

def get_active_alerts() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def acknowledge_alert(alert_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET is_acknowledged = 1 WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
