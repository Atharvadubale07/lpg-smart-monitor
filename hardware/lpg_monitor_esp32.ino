/*
 * AI-Based Smart LPG Consumption Monitoring & Forecasting System
 * Microcontroller: ESP32 DevKit V1
 * ADC / Amplifier: HX711 24-bit ADC for Weighing Scales
 * Load Cell: 4-wire strain gauge load cell (e.g., 40kg or 50kg capacity)
 *
 * Description:
 * Reads raw weight from load cell, applies calibration factor,
 * and sends JSON telemetry payload via Wi-Fi HTTP POST to the FastAPI backend.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "HX711.h"

// ================= USER CONFIGURATION =================
// 1. Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// 2. Backend Server IP & Port (e.g., your laptop IP running FastAPI)
const char* SERVER_URL    = "http://192.168.1.100:8000/api/readings/record";

// 3. Pin Definitions (ESP32)
const int LOADCELL_DOUT_PIN = 21;  // HX711 DT pin
const int LOADCELL_SCK_PIN  = 22;  // HX711 SCK pin
const int STATUS_LED_PIN    = 2;   // On-board LED indicator

// 4. Calibration Parameters
// Place a known test weight on the platform (e.g. 5.0 kg) to calculate calibration_factor
// calibration_factor = (raw_reading_with_weight - raw_tare_reading) / known_weight_in_kg
float calibration_factor = 22800.0f; 

// Known empty cylinder tare weight (kg)
float cylinder_tare_kg   = 15.3f;    // 15.3 kg for domestic 14.2kg cylinder

// 5. Sampling Interval (milliseconds)
const unsigned long SEND_INTERVAL_MS = 60000; // Send reading every 60 seconds (or adjust for deep sleep)
unsigned long last_send_time = 0;

// Initialize HX711 instance
HX711 scale;

void setup() {
  Serial.begin(115200);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  delay(1000);

  Serial.println("\n=======================================================");
  Serial.println("  Smart LPG Monitoring & Empty-Date Prediction (ESP32) ");
  Serial.println("=======================================================");

  // Initialize HX711
  Serial.println("[LOAD_CELL] Initializing HX711 load cell amplifier...");
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);

  if (scale.is_ready()) {
    Serial.println("[LOAD_CELL] HX711 connected successfully.");
    scale.set_scale(calibration_factor);
    // scale.tare(); // Zero the platform if starting empty without cylinder
  } else {
    Serial.println("[WARNING] HX711 not found. Check wiring (DT/SCK)!");
  }

  // Connect to Wi-Fi
  connectWiFi();
}

void loop() {
  // Check Wi-Fi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Reconnecting...");
    connectWiFi();
  }

  // Periodically read and transmit weight
  if (millis() - last_send_time >= SEND_INTERVAL_MS) {
    last_send_time = millis();
    transmitWeightReading();
  }

  delay(200);
}

void connectWiFi() {
  Serial.print("[WIFI] Connecting to ");
  Serial.print(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Blink while connecting
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("\n[WIFI] Connected successfully!");
    Serial.print("[WIFI] ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    digitalWrite(STATUS_LED_PIN, LOW);
    Serial.println("\n[WIFI] Connection timeout. Operating in offline measurement mode.");
  }
}

void transmitWeightReading() {
  if (!scale.is_ready()) {
    Serial.println("[ERROR] Load cell not ready for reading!");
    return;
  }

  // Take average of 10 samples to filter out mechanical vibration
  float total_measured_weight = scale.get_units(10); 
  if (total_measured_weight < 0.0) total_measured_weight = 0.0;

  float estimated_lpg_remaining = max(0.0f, total_measured_weight - cylinder_tare_kg);
  int rssi = WiFi.RSSI();

  Serial.println("\n-------------------------------------------");
  Serial.printf("Measured Total Weight (W_t): %.3f kg\n", total_measured_weight);
  Serial.printf("Cylinder Tare (T)          : %.3f kg\n", cylinder_tare_kg);
  Serial.printf("Estimated LPG Remaining (L): %.3f kg\n", estimated_lpg_remaining);
  Serial.println("-------------------------------------------");

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    // Construct JSON payload
    char jsonBuffer[256];
    snprintf(jsonBuffer, sizeof(jsonBuffer),
      "{\"raw_weight\": %.3f, \"tare_weight\": %.3f, \"battery_pct\": 98.5, \"rssi\": %d, \"source\": \"esp32\"}",
      total_measured_weight, cylinder_tare_kg, rssi
    );

    Serial.print("[HTTP] Sending POST to backend: ");
    Serial.println(jsonBuffer);

    int httpResponseCode = http.POST(jsonBuffer);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("[HTTP] Server Response (%d): %s\n", httpResponseCode, response.c_str());
      
      // Quick flash LED to indicate successful transmission
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(150);
      digitalWrite(STATUS_LED_PIN, HIGH);
    } else {
      Serial.printf("[HTTP] POST failed, error code: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  } else {
    Serial.println("[HTTP] Skipped sending (Wi-Fi not connected).");
  }
}
