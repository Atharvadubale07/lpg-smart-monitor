# Vercel Deployment Guide for Smart LPG Monitoring System

This project is configured as a **unified full-stack repository** ready for 1-click deployment on [Vercel](https://vercel.com):
- **Frontend**: React + Vite built into static high-speed CDN assets (`frontend/dist`)
- **Backend API**: Python FastAPI running as high-performance Vercel Serverless Functions (`api/index.py`)
- **IoT Endpoint**: Public HTTPS route (`https://your-app.vercel.app/api/readings/record`) accessible by your ESP32 from anywhere

---

## Method 1: Deploy via GitHub (Recommended & Easiest)

### Step 1: Push Code to GitHub
1. Create a new empty repository on [GitHub](https://github.com/new) named `lpg-smart-monitor`.
2. Open PowerShell in `C:\Users\ADMIN\.gemini\antigravity\scratch\lpg-smart-monitor` and run:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/lpg-smart-monitor.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log in to [vercel.com](https://vercel.com) (or sign up free with GitHub).
2. Click **"Add New..."** → **"Project"**.
3. Select your `lpg-smart-monitor` repository from the list and click **"Import"**.
4. Vercel will automatically read [vercel.json](file:///C:/Users/ADMIN/.gemini/antigravity/scratch/lpg-smart-monitor/vercel.json):
   - **Framework Preset**: *Other* (or Vite)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
5. Click **"Deploy"**.

Within ~60 seconds, your site is live at:
`https://lpg-smart-monitor.vercel.app` (or your chosen project slug).

---

## Method 2: Deploy directly via Vercel CLI

If you prefer terminal deployment without pushing to GitHub first:
```bash
cd C:\Users\ADMIN\.gemini\antigravity\scratch\lpg-smart-monitor
npx vercel
```
1. Follow the interactive prompts in your terminal.
2. Log in through the browser when prompted.
3. Accept the default settings.
4. For production release, run:
   ```bash
   npx vercel --prod
   ```

---

## Connecting Your Physical ESP32 to the Vercel Deployment

Once deployed, your ESP32 no longer needs to be on the same local Wi-Fi network as your laptop! It can transmit data over any Wi-Fi or mobile hotspot.

In [lpg_monitor_esp32.ino](file:///C:/Users/ADMIN/.gemini/antigravity/scratch/lpg-smart-monitor/hardware/lpg_monitor_esp32.ino), update line 21:

```cpp
// Replace with your actual live Vercel domain:
const char* SERVER_URL = "https://your-project-name.vercel.app/api/readings/record";
```

### HTTPS Support on ESP32
Because Vercel automatically uses HTTPS, ensure your ESP32 Arduino sketch uses `WiFiClientSecure` with insecure certificate validation for quick setup:
```cpp
#include <WiFiClientSecure.h>

WiFiClientSecure secureClient;
secureClient.setInsecure(); // Skips SSL root cert check for convenience

HTTPClient http;
http.begin(secureClient, SERVER_URL);
http.addHeader("Content-Type", "application/json");
int httpCode = http.POST(jsonPayload);
```

---

## Key Technical Optimizations for Vercel

1. **Serverless Ephemeral Storage**:
   Vercel serverless functions have a read-only root directory. The database path in [database.py](file:///C:/Users/ADMIN/.gemini/antigravity/scratch/lpg-smart-monitor/backend/database.py) automatically redirects to `/tmp/lpg_monitor.db` when the `VERCEL` environment variable is detected.
2. **Cold-Start Auto-Seeding**:
   When a fresh Vercel serverless container spins up, [main.py](file:///C:/Users/ADMIN/.gemini/antigravity/scratch/lpg-smart-monitor/backend/main.py) automatically initializes and seeds 75 days of baseline consumption history, ensuring all charts and predictions load immediately.
3. **Optimized Package Bundle**:
   Root [requirements.txt](file:///C:/Users/ADMIN/.gemini/antigravity/scratch/lpg-smart-monitor/requirements.txt) is tuned to install cleanly under Vercel's 250MB AWS Lambda uncompressed limit.
