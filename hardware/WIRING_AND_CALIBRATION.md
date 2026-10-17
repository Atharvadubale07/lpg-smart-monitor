# ESP32 & HX711 Hardware Wiring & Calibration Guide

## 1. Circuit Connections

### A. Load Cell to HX711 Amplifier Module
Standard 4-wire strain gauge load cells (or 4 half-bridge load cells via a combiner board):

| Load Cell Wire Color | HX711 Pin | Description |
|---|---|---|
| **Red** | `E+` | Excitation Positive (Power) |
| **Black** | `E-` | Excitation Negative (Ground) |
| **White** | `A-` | Signal Negative |
| **Green** | `A+` | Signal Positive |
| **Yellow / Bare** (if present) | `GND` / Shield | Ground / Chassis Shielding |

---

### B. HX711 Module to ESP32 DevKit V1

| HX711 Pin | ESP32 Pin | Note |
|---|---|---|
| `VCC` | `VIN` (5V) or `3V3` | 5V recommended for better SNR, check module rating |
| `GND` | `GND` | Common system ground |
| `DT` (Data) | `GPIO 21` | Digital Input |
| `SCK` (Clock) | `GPIO 22` | Digital Output clock |

---

## 2. Calibration Procedure

To calculate the precise `calibration_factor`:
1. Leave the weighing platform completely empty.
2. Run the tare function: `scale.tare()`.
3. Place a certified reference weight on the platform (e.g., a precisely measured 5.000 kg water container).
4. Read the unscaled units from `scale.get_value(10)`.
5. Calculate:
   $$\text{calibration\_factor} = \frac{\text{raw\_reading\_with\_weight}}{\text{known\_weight\_in\_kg}}$$
6. Enter this value into `calibration_factor` inside `lpg_monitor_esp32.ino`.

---

## 3. Laboratory Safety & Academic Validation
- **College Safety Compliance**: Initial calibration and experimental validation should be conducted using water canisters or inert weights matching the physical tare and gross weight of an LPG cylinder (e.g. 15.3 kg tare + 5 to 14 kg contents).
- **Physical Integrity**: Never modify, drill, heat, or tamper with any pressurized gas cylinder or valve assembly.
- **Weighing Base**: Use a sturdy, non-flexing circular or triangular platform with rubber vibration dampers to isolate mechanical floor vibration.
