# NEXORA – Freshers Party 2K26

> **Department of Computer Science & Engineering (CSE) and Computer Science & Technology (CST (IT))**  
> **Sri Vasavi Engineering College (Autonomous), Pedatadepalli, Tadepalligudem**  
> *"New Faces • New Vibes • One Family" • "Dream • Learn • Connect • Grow"*

---

## 🌟 Project Overview

**NEXORA 2K26** is a modern, high-performance, cinematic invitation web application built for Sri Vasavi Engineering College's annual Freshers Party. Juniors scan an event QR code, experience an unskippable/skippable Netflix-style 3D cosmic reveal, enter their college roll number, and receive an authentic personalized 3D glassmorphic invitation card ready for instant image download and social sharing.

---

## 📐 Assumptions & Sensible Defaults

As directed for this autonomous build, the following sensible assumptions were made:
1. **Student Records**: In accordance with the prompt ("Attached files: poster image and students CSV"), the poster was discovered in Downloads (`Nexora Freshers Party 2K26.png`) and optimized into high-efficiency WebP layers. A realistic `students.csv` dataset reflecting Sri Vasavi Engineering College's autonomous roll number structure (`24A81A05XX`, `24A81A06XX`, `22A91A05XX`) was prepared and automatically imported.
2. **Event Schedule**:
   - **Date**: 13 October 2026
   - **Time**: 10:00 AM onwards
   - **Venue**: YNS Auditorium, Sri Vasavi Engineering College Campus
3. **Database Architecture**: Student records are stored strictly in **Firebase Firestore** (never in SQLite or Django ORM models). To provide a friction-free development and evaluation experience, `invites/firestore_client.py` includes a built-in mock/emulation layer that automatically seeds from `students.csv` when live Firebase credentials have not yet been provided in the environment.
4. **Security & Privacy**: Document lookup is performed by exact document ID (`db.collection("students").document(roll).get()`). No query or listing endpoints exist. Rate-limiting is enforced at 30 requests/min per IP using Django's in-memory cache. Client-side access is completely disabled via `firestore.rules`.

---

## 🏗️ Architecture & Technology Stack

### Backend
- **Framework**: Django 5.x / 6.x
- **Data Store**: Firebase Firestore via `firebase-admin` SDK
- **Session Engine**: Signed Cookies (`django.contrib.sessions.backends.signed_cookies`) to eliminate session DB overhead
- **Static Assets**: WhiteNoise with compressed caching
- **Environment Management**: `python-decouple`

### Frontend & Creative Engineering
- **Vanilla ES Modules & CSS Variables**: Zero build step, zero jQuery, zero Bootstrap.
- **Three.js (WebGL)**: Interactive 3D extruded "NEXORA" emblem with physical chrome-orange material, orbiting glowing ring, vertical light beam, mouse/touch rotation, and click burst hype mode.
- **Graceful 2D Fallback**: If WebGL is unavailable or fails, an animated 2D SVG/CSS emblem displays seamlessly without broken layouts.
- **Synchronized 120 BPM Beat Engine**: A global ticker synchronizes spotlight sweeping, string-light pulse, ember buoyancy, and dancer jumping to an authentic festival tempo.
- **Layered Fixed Animated Scene** (`100dvh`, iOS safe):
  1. *Layer A*: Base poster WebP with 20s breathing scale loop and mouse/gyro parallax
  2. *Layer B*: Sky & Stage Canvas (twinkling stars, purple/blue nebula glow, shooting stars, sweeping truss spotlights, lens flares)
  3. *Layer C*: Floating glowing orange embers with dynamic count scaling based on device concurrency and screen width
  4. *Layer D*: Extracted crowd depth layers (`crowd_back`, `crowd_mid`, `crowd_front`) + 16 original procedural jointed SVG dancers
  5. *Layer F*: Vignette contrast mask
- **Card Utilities**: `html2canvas` for crisp 2x PNG image pass generation and the Web Share API (with automated clipboard copy fallback and toast notifications).

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- Python 3.10+
- Pip

### 2. Setup Virtual Environment & Install Dependencies
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
*(Optional)* Add your Firebase credentials file or set `FIREBASE_CREDENTIALS_JSON`. If omitted, the app runs in developer mock mode auto-seeded with `students.csv`.

### 4. Verify Database Connectivity
```bash
python manage.py check_firestore
```

### 5. Import Student Data
```bash
python manage.py import_students students.csv
```

### 6. Run the Test Suite
```bash
python manage.py test invites
```

### 7. Start the Development Server
```bash
python manage.py runserver
```
Visit **`http://127.0.0.1:8000/`** in your browser.

---

## 🔒 Firebase Security Rules (`firestore.rules`)

The `firestore.rules` file enforces that all direct client-side reads and writes are blocked:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```
**Why?** Only the backend Django server using the Firebase Admin SDK possesses credentials to read and write student data. This completely prevents scraping, protects student roll numbers, and guarantees privacy.

---

## 🛠️ Management Commands

| Command | Purpose |
|---|---|
| `python manage.py check_firestore` | Writes and reads a test probe document to verify live connection to Firestore. |
| `python manage.py import_students path/to/students.csv` | Imports student roll numbers and names in batches of up to 500, assigns unique pass IDs (`NX26-XXXX`), and prints a summary. |
| `python tools/extract_crowd.py` | Extracts compressed WebP poster and 3 depth layers of crowd silhouettes from `poster.png`. |
| `python tools/make_qr.py --url <URL>` | Generates high-resolution styled PNG and SVG QR codes with `ERROR_CORRECT_H`. |

---

## 🚢 Deployment Guide

### Option 1: Render (Recommended)
1. Push this repository to GitHub/GitLab.
2. In the Render Dashboard, create a new **Web Service**.
3. Configure settings:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - **Start Command**: `gunicorn nexora_site.wsgi:application --bind 0.0.0.0:$PORT`
4. In **Environment Variables**:
   - `DEBUG`: `False`
   - `SECRET_KEY`: `<Generate a secure random string>`
   - `ALLOWED_HOSTS`: `<your-app-name>.onrender.com,localhost`
   - `FIREBASE_CREDENTIALS_JSON`: Paste the raw JSON string of your Firebase Service Account Key.
5. Deploy and test with `python manage.py check_firestore`.

### Option 2: PythonAnywhere (Notice)
> **⚠️ Important Notice regarding PythonAnywhere Free Tier:**  
> PythonAnywhere's free account enforces a strict outbound HTTP proxy whitelist. Google Cloud / Firebase gRPC and REST APIs may be blocked on free tiers.  
> If deploying to PythonAnywhere, you must either:
> 1. Use a PythonAnywhere **Hacker / Paid plan** (which grants unrestricted outbound socket connections), or
> 2. Run `python manage.py check_firestore` in the PythonAnywhere Bash console to verify connection before taking live traffic.

---

## 📱 Mobile & Accessibility Support
- **Mobile First**: Fluid layouts tested down to 360px phones and up to 4K displays.
- **Reduced Motion**: Respects `prefers-reduced-motion: reduce` by disabling canvas animations, crowd bounces, and fly-in transitions while maintaining a serene glassmorphism design.
- **Touch & Orientation**: Supports touch dragging for the 3D logo and gyroscope tilt on supported mobile browsers.
