from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np

from database import (
    init_db, get_connection, get_settings, update_settings,
    insert_sensor_reading, get_latest_reading, get_recent_readings,
    insert_alert, get_active_alerts, acknowledge_alert
)
from ml_models import forecaster
from data_generator import generate_realistic_lpg_data

app = FastAPI(
    title="AI-Based Smart LPG Monitoring & Forecasting API",
    description="Backend API for IoT load-cell weight ingestion, consumption forecasting, empty-date estimation, and refill alerts.",
    version="1.0.0"
)

# Enable CORS for frontend Vite dev server (usually localhost:5173) and any local client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event
@app.on_event("startup")
def startup_event():
    init_db()
    latest = get_latest_reading()
    if not latest:
        try:
            generate_realistic_lpg_data(num_days=75)
        except Exception as e:
            print(f"Auto-seed notice: {e}")
    forecaster.load_saved_models()

# Pydantic Request Models
class SensorPayload(BaseModel):
    raw_weight: float = Field(..., description="Total measured weight in kg (cylinder + gas)")
    tare_weight: Optional[float] = Field(None, description="Empty cylinder tare weight in kg. If null, stored setting is used.")
    battery_pct: Optional[float] = Field(100.0, description="ESP32 battery voltage percentage")
    rssi: Optional[int] = Field(-55, description="Wi-Fi signal strength in dBm")
    source: Optional[str] = Field("esp32", description="'esp32' or 'simulation'")
    notes: Optional[str] = Field("", description="Optional contextual notes")

class SettingsPayload(BaseModel):
    cylinder_name: str
    tare_weight: float
    full_lpg_capacity: float
    refill_threshold_days: int
    critical_threshold_kg: float
    warning_threshold_kg: float
    active_model: str

class CookSimulationPayload(BaseModel):
    amount_kg: float = Field(0.25, ge=0.05, le=3.0, description="LPG burned in kg during this cooking session")
    meal_type: Optional[str] = Field("Lunch", description="Breakfast, Lunch, Dinner, or Custom")

# Helper function to get recent daily consumption records
def fetch_daily_records(limit: int = 60) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM daily_consumption ORDER BY date DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]

# 1. System Status Endpoint
@app.get("/api/status")
def get_system_status():
    settings = get_settings()
    latest = get_latest_reading()
    alerts = get_active_alerts()
    unack_alerts = [a for a in alerts if not a.get("is_acknowledged", 0)]

    if not latest:
        # Default placeholder if fresh db
        return {
            "status": "ready",
            "connected": False,
            "raw_weight": 0.0,
            "tare_weight": settings["tare_weight"],
            "lpg_remaining": 0.0,
            "pct_remaining": 0.0,
            "battery_pct": 100.0,
            "rssi": -50,
            "refill_status": "NORMAL",
            "last_updated": None,
            "source": "none",
            "active_alerts_count": len(unack_alerts)
        }

    lpg_remaining = latest["lpg_remaining"]
    pct_remaining = round((lpg_remaining / settings["full_lpg_capacity"]) * 100.0, 1)
    
    # Determine refill status badge
    refill_status = "NORMAL"
    if lpg_remaining <= settings["critical_threshold_kg"]:
        refill_status = "CRITICAL"
    elif lpg_remaining <= settings["warning_threshold_kg"]:
        refill_status = "WARNING"

    return {
        "status": "online",
        "connected": True,
        "raw_weight": latest["raw_weight"],
        "tare_weight": latest["tare_weight"],
        "lpg_remaining": lpg_remaining,
        "pct_remaining": max(0.0, min(100.0, pct_remaining)),
        "battery_pct": latest.get("battery_pct", 100.0),
        "rssi": latest.get("rssi", -55),
        "refill_status": refill_status,
        "last_updated": latest["timestamp"],
        "source": latest.get("source", "simulation"),
        "is_anomaly": bool(latest.get("is_anomaly", 0)),
        "active_alerts_count": len(unack_alerts)
    }

# 2. Record Sensor Reading (ESP32 or Simulator)
@app.post("/api/readings/record")
def record_sensor_reading(payload: SensorPayload):
    settings = get_settings()
    tare = payload.tare_weight if payload.tare_weight is not None else settings["tare_weight"]
    latest_prev = get_latest_reading()
    
    raw_weight = payload.raw_weight
    lpg_remaining = max(0.0, round(raw_weight - tare, 3))
    is_anomaly = 0
    anomaly_msg = ""

    # Check for sudden drop anomaly
    if latest_prev:
        prev_lpg = latest_prev["lpg_remaining"]
        drop = prev_lpg - lpg_remaining
        if drop >= 0.8:  # sudden uncharacteristic drop (> 800 grams in single step)
            is_anomaly = 1
            anomaly_msg = f"Rapid weight drop of {drop:.2f} kg detected! Possible abnormal leakage, sensor shift, or unregistered heavy use."
            insert_alert(
                alert_type="ANOMALY_DROP",
                severity="critical",
                message=anomaly_msg,
                lpg_at_time=lpg_remaining
            )
        elif drop <= -5.0:  # sudden massive weight gain = cylinder replaced
            insert_alert(
                alert_type="CYLINDER_REPLACED",
                severity="info",
                message=f"Cylinder swap detected! Weight increased by {abs(drop):.2f} kg. New cycle started.",
                lpg_at_time=lpg_remaining
            )

    # Check low gas refill thresholds
    if lpg_remaining <= settings["critical_threshold_kg"]:
        insert_alert(
            alert_type="REFILL_URGENT",
            severity="critical",
            message=f"Critical LPG level: {lpg_remaining:.2f} kg remaining. Order replacement cylinder immediately!",
            lpg_at_time=lpg_remaining
        )
    elif lpg_remaining <= settings["warning_threshold_kg"]:
        insert_alert(
            alert_type="REFILL_WARNING",
            severity="warning",
            message=f"LPG level is low: {lpg_remaining:.2f} kg remaining. Consider booking a refill.",
            lpg_at_time=lpg_remaining
        )

    reading_id = insert_sensor_reading(
        raw_weight=raw_weight,
        tare_weight=tare,
        source=payload.source or "esp32",
        battery_pct=payload.battery_pct or 100.0,
        rssi=payload.rssi or -55,
        is_anomaly=is_anomaly,
        notes=payload.notes or ("Anomaly: " + anomaly_msg if is_anomaly else "")
    )

    # Update or insert today's daily consumption record
    today_str = datetime.now().strftime("%Y-%m-%d")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM daily_consumption WHERE date = ?", (today_str,))
    today_row = cursor.fetchone()

    if today_row:
        start_lpg = today_row["start_lpg"]
        consumption = max(0.0, round(start_lpg - lpg_remaining, 3))
        cursor.execute("""
        UPDATE daily_consumption SET end_lpg = ?, consumption = ? WHERE date = ?
        """, (lpg_remaining, consumption, today_str))
    else:
        cursor.execute("""
        INSERT INTO daily_consumption (date, start_lpg, end_lpg, consumption, is_weekend)
        VALUES (?, ?, ?, 0.0, ?)
        """, (today_str, lpg_remaining, lpg_remaining, 1 if datetime.now().weekday() in [5, 6] else 0))
    
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "reading_id": reading_id,
        "lpg_remaining": lpg_remaining,
        "is_anomaly": bool(is_anomaly),
        "message": "Reading recorded successfully"
    }

# 3. Reading History
@app.get("/api/readings/history")
def get_readings_history(limit: int = Query(100, ge=1, le=500)):
    readings = get_recent_readings(limit=limit)
    return {"count": len(readings), "readings": readings}

# 4. Consumption Analytics
@app.get("/api/analytics/consumption")
def get_consumption_analytics():
    daily = fetch_daily_records(limit=60)
    if not daily:
        return {"daily": [], "stats": {}}

    df = pd.DataFrame(daily)
    consumptions = df['consumption'].values
    avg_7d = round(float(np.mean(consumptions[-7:]) if len(consumptions) >= 7 else np.mean(consumptions)), 3)
    avg_30d = round(float(np.mean(consumptions[-30:]) if len(consumptions) >= 30 else np.mean(consumptions)), 3)
    max_day = round(float(np.max(consumptions)), 3)
    total_consumed = round(float(np.sum(consumptions)), 2)

    # Weekday vs Weekend burn analysis
    df['is_weekend'] = df.get('is_weekend', 0)
    weekend_avg = round(float(df[df['is_weekend'] == 1]['consumption'].mean()) if len(df[df['is_weekend'] == 1]) > 0 else avg_7d, 3)
    weekday_avg = round(float(df[df['is_weekend'] == 0]['consumption'].mean()) if len(df[df['is_weekend'] == 0]) > 0 else avg_7d, 3)

    return {
        "daily": daily,
        "stats": {
            "avg_7d": avg_7d,
            "avg_30d": avg_30d,
            "max_day_burn": max_day,
            "weekend_avg": weekend_avg,
            "weekday_avg": weekday_avg,
            "total_consumed_kg": total_consumed,
            "tracked_days": len(daily)
        }
    }

# 5. ML Depletion Prediction & Model Comparison
@app.get("/api/predict")
def predict_depletion(model: Optional[str] = None):
    settings = get_settings()
    active_model = model or settings.get("active_model", "random_forest")
    latest = get_latest_reading()
    daily_history = fetch_daily_records(limit=60)

    current_lpg = latest["lpg_remaining"] if latest else 5.0
    full_capacity = settings["full_lpg_capacity"]

    prediction_result = forecaster.forecast_depletion(
        current_lpg=current_lpg,
        full_capacity=full_capacity,
        recent_daily_history=daily_history,
        model_choice=active_model
    )

    return prediction_result

# 6. Alerts Endpoints
@app.get("/api/alerts")
def get_alerts():
    alerts = get_active_alerts()
    return {"alerts": alerts, "total": len(alerts)}

@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge_alert_endpoint(alert_id: int):
    acknowledge_alert(alert_id)
    return {"status": "success", "message": f"Alert {alert_id} acknowledged"}

# 7. Settings Endpoints
@app.get("/api/settings")
def get_settings_endpoint():
    return get_settings()

@app.post("/api/settings")
def update_settings_endpoint(payload: SettingsPayload):
    update_settings(payload.dict())
    return {"status": "success", "message": "Settings updated successfully", "settings": get_settings()}

# 8. Interactive Simulation Endpoints
@app.post("/api/simulate/cook")
def simulate_cooking(payload: CookSimulationPayload):
    latest = get_latest_reading()
    settings = get_settings()
    tare = settings["tare_weight"]
    
    current_raw = latest["raw_weight"] if latest else (tare + 10.0)
    current_lpg = max(0.0, current_raw - tare)
    
    burn_kg = min(payload.amount_kg, current_lpg)
    new_lpg = round(max(0.0, current_lpg - burn_kg), 3)
    new_raw = round(tare + new_lpg, 3)

    reading_id = insert_sensor_reading(
        raw_weight=new_raw,
        tare_weight=tare,
        source="simulation",
        battery_pct=round(latest.get("battery_pct", 98.0) - 0.05, 1) if latest else 98.0,
        notes=f"Simulated {payload.meal_type} cooking: burned {burn_kg:.2f} kg"
    )

    # Update today's record
    today_str = datetime.now().strftime("%Y-%m-%d")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM daily_consumption WHERE date = ?", (today_str,))
    today_row = cursor.fetchone()
    if today_row:
        start_lpg = today_row["start_lpg"]
        consumption = max(0.0, round(start_lpg - new_lpg, 3))
        cursor.execute("UPDATE daily_consumption SET end_lpg = ?, consumption = ? WHERE date = ?", (new_lpg, consumption, today_str))
    else:
        cursor.execute("INSERT INTO daily_consumption (date, start_lpg, end_lpg, consumption, is_weekend) VALUES (?, ?, ?, ?, ?)",
                       (today_str, current_lpg, new_lpg, burn_kg, 1 if datetime.now().weekday() in [5, 6] else 0))
    conn.commit()
    conn.close()

    # Alerts check
    if new_lpg <= settings["critical_threshold_kg"]:
        insert_alert("REFILL_URGENT", "critical", f"Critical LPG level: {new_lpg:.2f} kg remaining!", new_lpg)
    elif new_lpg <= settings["warning_threshold_kg"]:
        insert_alert("REFILL_WARNING", "warning", f"Refill warning: {new_lpg:.2f} kg remaining.", new_lpg)

    return {
        "status": "success",
        "action": "cooked",
        "meal": payload.meal_type,
        "burned_kg": burn_kg,
        "new_lpg": new_lpg,
        "new_raw_weight": new_raw
    }

@app.post("/api/simulate/advance-day")
def simulate_advance_day():
    latest = get_latest_reading()
    settings = get_settings()
    tare = settings["tare_weight"]
    
    current_raw = latest["raw_weight"] if latest else (tare + 10.0)
    current_lpg = max(0.0, current_raw - tare)
    
    burn_kg = round(np.random.uniform(0.35, 0.55), 3)
    new_lpg = round(max(0.0, current_lpg - burn_kg), 3)
    new_raw = round(tare + new_lpg, 3)

    insert_sensor_reading(
        raw_weight=new_raw,
        tare_weight=tare,
        source="simulation",
        battery_pct=96.5,
        notes="Simulated 1 day advancement"
    )

    return {
        "status": "success",
        "action": "advanced_1_day",
        "burned_kg": burn_kg,
        "new_lpg": new_lpg,
        "new_raw_weight": new_raw
    }

@app.post("/api/simulate/refill")
def simulate_refill():
    settings = get_settings()
    tare = settings["tare_weight"]
    full_cap = settings["full_lpg_capacity"]
    new_raw = round(tare + full_cap, 3)

    insert_sensor_reading(
        raw_weight=new_raw,
        tare_weight=tare,
        source="simulation",
        notes="Simulated full cylinder replacement"
    )

    insert_alert(
        alert_type="CYLINDER_REPLACED",
        severity="info",
        message=f"Cylinder replaced with fresh {full_cap} kg cylinder.",
        lpg_at_time=full_cap
    )

    return {
        "status": "success",
        "action": "refilled",
        "new_lpg": full_cap,
        "new_raw_weight": new_raw
    }

@app.post("/api/simulate/anomaly")
def simulate_anomaly():
    latest = get_latest_reading()
    settings = get_settings()
    tare = settings["tare_weight"]
    
    current_raw = latest["raw_weight"] if latest else (tare + 8.0)
    current_lpg = max(0.0, current_raw - tare)
    
    drop_amount = 1.35  # sudden abnormal drop
    new_lpg = round(max(0.0, current_lpg - drop_amount), 3)
    new_raw = round(tare + new_lpg, 3)

    insert_sensor_reading(
        raw_weight=new_raw,
        tare_weight=tare,
        source="simulation",
        is_anomaly=1,
        notes=f"INJECTED ANOMALY: Sudden drop of {drop_amount} kg"
    )

    insert_alert(
        alert_type="ANOMALY_DROP",
        severity="critical",
        message=f"ABNORMAL ANOMALY: Rapid weight loss of {drop_amount} kg detected in short period! Investigate for leaks immediately.",
        lpg_at_time=new_lpg
    )

    return {
        "status": "success",
        "action": "anomaly_injected",
        "drop_amount": drop_amount,
        "new_lpg": new_lpg,
        "new_raw_weight": new_raw
    }

@app.post("/api/simulate/reset")
def reset_simulation_data():
    generate_realistic_lpg_data(num_days=75)
    return {"status": "success", "message": "Simulation data reset and models retrained."}

@app.post("/api/train")
def train_models_endpoint():
    daily = fetch_daily_records(limit=100)
    if len(daily) < 10:
        raise HTTPException(status_code=400, detail="Insufficient historical data (need >= 10 days)")
    df = pd.DataFrame(daily)
    result = forecaster.train_models(df)
    return result

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
