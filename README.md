# USM BHEPA Paperwork Automation App (EPA.002 Auto-Filler & Visual Editor)

A full-stack web application designed for Universiti Sains Malaysia (USM) student societies, clubs, and councils to automate filling the official **EPA.002 - BORANG PERMOHONAN MENGADAKAN PROJEK** PDF form using LLM intelligence, coupled with a real-time interactive split-screen editor, drag-to-adjust calibration, and dual-mode PDF export.

---

## 🌟 Key Features

1. **Pre-configured User & Society Presets:**
   - Pre-loaded with Steven Elnathan Meliala & Persatuan Persaudaraan Kristian Agape details (editable anytime via the UI "Presets & API" dialog).
   - Saved persistently to both backend configuration (`backend/config/default_profile.json`) and browser storage.

2. **AI Natural Language Event Intake:**
   - Input plain English/Malay event descriptions (e.g., *"Prayer meeting 1 Intentional Prayer on 23 Oct 2026 from 11:30am to 2pm at Bilik Tutorial 150 for 30 people"*).
   - Automatically extracts event titles, dates, time ranges, venues, participant counts, method (Fizikal/Hibrid/Online), and fee requirements.
   - Generates a formal **25–40 word Bahasa Melayu `Ringkasan Projek`** tailored for USM BHEPA administrative approval.
   - Recommends the event **Peringkat (A/B/C/D)**, **MyCSD generic code (01–08)**, and up to **2 SDG goals (01–17)**.
   - Works **100% offline out-of-the-box** using an intelligent USM BHEPA heuristic parser, or integrates with live **Google Gemini API (Gemini-2.5 Flash)** when an API key is entered.

3. **Split-Screen Interactive Review & Canvas Editor:**
   - **Left Panel:** Two-way bound form sections with live debounced PDF re-rendering as you type.
   - **Right Panel:** Pixel-perfect visual PDF canvas preview with smooth zoom controls (60% to 200%).
   - **Drag-to-Adjust & Calibration Mode:**
     - Toggle **"Calibrate / Drag"** to view and drag text bounding boxes on the canvas.
     - Click anywhere on the PDF in Calibration Mode to capture exact `[x, y]` bottom-left coordinates and map them to any checkbox or text field, persisting changes directly to `backend/config/epa002_coordinates.json`.
   - **Manual Signature Upload:** Drop or browse transparent PNG signatures for *Tandatangan Pemohon* and *Tandatangan YDP / SU*.

4. **Dual-Mode PDF Export (`PyMuPDF` + `reportlab`):**
   - **Mode A (Editable PDF - Default):** Generates interactive `FreeText` annotations at exact mapped coordinates so you can still edit any text in Adobe Acrobat or Edge browser after downloading.
   - **Mode B (Flattened PDF):** Renders crisp vector text, checkmarks, and signatures directly into the PDF content stream.

---

## 🚀 Quick Start

To launch both backend and frontend servers simultaneously:

```bash
./start.sh
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 📁 Project Architecture

```
├── backend/
│   ├── config/
│   │   ├── epa002_coordinates.json    # Exact A4 bottom-left coordinate mappings
│   │   └── default_profile.json       # Persisted society & user defaults
│   ├── templates/
│   │   └── EPA.002 - BORANG PERMOHONAN MENGADAKAN PROJEK (01Jan2026)_V1.pdf
│   ├── uploads/                       # Uploaded signature storage
│   ├── pdf_service.py                 # PyMuPDF rendering & dual-mode export engine
│   ├── llm_service.py                 # Gemini API + heuristic BHEPA NLP parser
│   ├── main.py                        # FastAPI endpoints & CORS middleware
│   └── venv/                          # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SettingsModal.jsx      # Preset profiles & Gemini API key manager
│   │   │   └── CalibrateModal.jsx     # Click-to-calibrate coordinate mapper
│   │   ├── App.jsx                    # Split-screen editor, canvas preview, and actions
│   │   ├── index.css                  # Modern USM purple & gold design system
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
├── start.sh                           # One-click startup script
└── README.md
```

---

## 🎯 Template & Coordinate Mapping

Coordinates use standard PDF points (`595.44 × 841.68` points for A4, origin at bottom-left `[x1, y1, x2, y2]`):

- `nama_pertubuhan`: `[151.02, 717.71, 305.14, 732.22]`
- `nama_pemohon`: `[129.34, 644.14, 224.16, 658.66]`
- `no_kp`: `[454.72, 644.30, 497.26, 658.82]`
- `jawatan_pemohon`: `[130.52, 626.16, 176.79, 640.67]`
- `no_matrik`: `[455.32, 626.02, 496.92, 640.53]`
- `emel_pemohon`: `[129.91, 608.50, 282.71, 623.02]`
- `no_telefon`: `[449.17, 608.63, 509.30, 623.14]`
- `tajuk_projek`: `[128.17, 570.78, 273.61, 584.26]`
- `ringkasan_projek`: `[129.32, 537.00, 559.37, 568.00]` (auto-wrapping & auto-scaling)
- `tarikh_projek`: `[460.36, 522.03, 580.00, 536.55]`
- `masa_projek`: `[462.38, 504.68, 544.90, 519.19]`
- `lokasi_projek`: `[462.85, 486.71, 528.71, 501.23]`
- `sasaran_peserta`: `[496.73, 411.60, 530.00, 426.11]`
- `kategori_persatuan`: `[126.95, 684.72, 146.95, 695.72]`
- `kampus_ki`: `[446.03, 685.87, 466.03, 696.87]`
- `hebat_tidak`: `[483.50, 703.16, 503.50, 714.15]`
- `kaedah_fizikal`: `[126.94, 508.25, 146.94, 519.25]`
- `penganjuran_dalam`: `[127.08, 489.32, 147.08, 500.32]`
- `peringkat_d`: `[41.45, 281.36, 61.45, 292.35]`
- `mycsd_06`: `[318.30, 318.10, 338.30, 329.10]`
- `sdg_03`: `[199.50, 261.10, 219.49, 272.09]`
- `signature_pemohon`: `[445.42, 307.04, 535.13, 339.87]`
