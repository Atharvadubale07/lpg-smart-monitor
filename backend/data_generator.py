import random
from datetime import datetime, timedelta
import pandas as pd
from database import init_db, get_connection
from ml_models import forecaster

def generate_realistic_lpg_data(num_days: int = 75):
    """
    Generates realistic 75-day multi-cycle domestic LPG usage history:
    - Tare weight: 15.3 kg
    - Full LPG: 14.2 kg (Total full = 29.5 kg)
    - Daily average cooking: ~0.38 - 0.52 kg/day
    - Weekends: ~25-40% higher cooking (0.55 - 0.75 kg/day)
    - Realistic sensor noise: ± 0.03 kg
    - Includes 2 cylinder cycles:
        Cycle 1: Day -75 to Day -42 (Depleted and refilled)
        Cycle 2: Day -41 to Present (~3.4 kg remaining today)
    - Morning (7-9 AM: ~35% of daily gas), Afternoon (12-2 PM: ~25%), Evening (7-9 PM: ~40%)
    """
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    # Clear previous simulated data
    cursor.execute("DELETE FROM sensor_readings")
    cursor.execute("DELETE FROM daily_consumption")
    cursor.execute("DELETE FROM alerts")
    cursor.execute("DELETE FROM cylinder_cycles")
    conn.commit()

    tare_weight = 15.3
    full_capacity = 14.2
    
    start_date = datetime.now() - timedelta(days=num_days)
    current_lpg = full_capacity
    cycle_id = 1
    cycle_start = start_date.strftime("%Y-%m-%d")

    daily_records = []
    sensor_records = []
    alert_records = []

    for d in range(num_days + 1):
        day_date = start_date + timedelta(days=d)
        is_weekend = 1 if day_date.weekday() in [5, 6] else 0

        # Normal domestic daily consumption
        base_burn = random.uniform(0.32, 0.44)
        if is_weekend:
            base_burn += random.uniform(0.12, 0.28)  # family meals / guests
        
        # Occasional feast or heavy cooking day
        if random.random() < 0.08:
            base_burn += random.uniform(0.20, 0.35)

        base_burn = round(base_burn, 3)

        # Check if cylinder depleted and was replaced
        if current_lpg - base_burn <= 0.4:
            cursor.execute("""
            INSERT INTO cylinder_cycles (cycle_id, start_date, end_date, initial_lpg, total_days, avg_daily_burn, status)
            VALUES (?, ?, ?, ?, ?, ?, 'completed')
            """, (cycle_id, cycle_start, day_date.strftime("%Y-%m-%d"), full_capacity, d, round(full_capacity / max(1, d), 3)))

            # Swap cylinder
            cycle_id += 1
            cycle_start = day_date.strftime("%Y-%m-%d")
            current_lpg = full_capacity
            
            alert_records.append((
                (day_date + timedelta(hours=10)).isoformat(),
                "CYLINDER_REPLACED",
                "info",
                f"Cylinder replaced with fresh {full_capacity} kg cylinder (Cycle #{cycle_id}).",
                current_lpg,
                1
            ))

        start_day_lpg = current_lpg
        actual_day_burn = min(base_burn, current_lpg - 0.1)
        current_lpg = round(current_lpg - actual_day_burn, 3)

        daily_records.append({
            "date": day_date.strftime("%Y-%m-%d"),
            "start_lpg": round(start_day_lpg, 3),
            "end_lpg": round(current_lpg, 3),
            "consumption": round(actual_day_burn, 3),
            "cycle_id": cycle_id,
            "is_weekend": is_weekend
        })

        # Generate 4-6 sensor readings per day (Morning, Noon, Evening, Night)
        day_hours = [6, 8, 11, 14, 18, 21]
        temp_lpg = start_day_lpg
        morning_burn = actual_day_burn * 0.35
        lunch_burn = actual_day_burn * 0.25
        dinner_burn = actual_day_burn * 0.40

        for h in day_hours:
            if h == 8:
                temp_lpg -= morning_burn
            elif h == 14:
                temp_lpg -= lunch_burn
            elif h == 21:
                temp_lpg -= dinner_burn
            
            # Add small load-cell sensor noise
            sensor_noise = random.uniform(-0.02, 0.02)
            sim_raw_weight = round(tare_weight + max(0.0, temp_lpg) + sensor_noise, 3)
            reading_time = (day_date + timedelta(hours=h, minutes=random.randint(5, 50))).isoformat()
            
            sensor_records.append((
                reading_time,
                sim_raw_weight,
                tare_weight,
                max(0.0, round(sim_raw_weight - tare_weight, 3)),
                round(random.uniform(94, 99), 1),
                random.randint(-68, -52),
                'simulation',
                0,
                'Normal routine'
            ))

    # Record active cycle
    cursor.execute("""
    INSERT INTO cylinder_cycles (cycle_id, start_date, end_date, initial_lpg, total_days, avg_daily_burn, status)
    VALUES (?, ?, NULL, ?, ?, ?, 'active')
    """, (cycle_id, cycle_start, full_capacity, 34, 0.41))

    # Insert daily consumption
    for rec in daily_records:
        cursor.execute("""
        INSERT INTO daily_consumption (date, start_lpg, end_lpg, consumption, cycle_id, is_weekend)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (rec['date'], rec['start_lpg'], rec['end_lpg'], rec['consumption'], rec['cycle_id'], rec['is_weekend']))

    # Insert sensor readings
    cursor.executemany("""
    INSERT INTO sensor_readings (timestamp, raw_weight, tare_weight, lpg_remaining, battery_pct, rssi, source, is_anomaly, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sensor_records)

    # Current alerts based on final LPG
    now_str = datetime.now().isoformat()
    if current_lpg < 3.5:
        alert_records.append((
            now_str,
            "REFILL_WARNING",
            "warning",
            f"LPG remaining ({current_lpg:.2f} kg) has dropped below 3.5 kg threshold. Plan refill booking.",
            current_lpg,
            0
        ))
    if current_lpg < 2.0:
        alert_records.append((
            now_str,
            "REFILL_URGENT",
            "critical",
            f"URGENT: Only {current_lpg:.2f} kg gas left! Cylinder will run out very soon.",
            current_lpg,
            0
        ))

    # Insert alerts
    cursor.executemany("""
    INSERT INTO alerts (timestamp, alert_type, severity, message, lpg_at_time, is_acknowledged)
    VALUES (?, ?, ?, ?, ?, ?)
    """, alert_records)

    conn.commit()
    conn.close()

    # Train ML models on generated data
    df_daily = pd.DataFrame(daily_records)
    train_res = forecaster.train_models(df_daily)

    print(f"Data generated: {len(daily_records)} days, {len(sensor_records)} sensor readings.")
    print(f"Current LPG remaining: {current_lpg} kg (Total weight: {round(tare_weight + current_lpg, 2)} kg)")
    print("ML Models Training Result:", train_res)

if __name__ == "__main__":
    generate_realistic_lpg_data()
