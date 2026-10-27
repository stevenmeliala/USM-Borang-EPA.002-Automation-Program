import os
import json
import base64
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

from pdf_service import (
    load_coordinates,
    save_coordinates,
    generate_pdf_bytes,
    generate_preview_image,
    CONFIG_PATH
)
from llm_service import extract_event_info

app = FastAPI(title="USM BHEPA EPA.002 Paperwork Automation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROFILE_PATH = os.path.join(os.path.dirname(__file__), "config", "default_profile.json")
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

class AIExtractRequest(BaseModel):
    prompt: str
    api_key: Optional[str] = None

class PDFRequest(BaseModel):
    form_data: Dict[str, Any]
    coordinates: Optional[Dict[str, Any]] = None
    signatures: Optional[Dict[str, Any]] = None
    mode: Optional[str] = "editable"  # 'editable' (Mode A) or 'flattened' (Mode B)

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "USM BHEPA EPA.002 Auto-Filler"}

@app.get("/api/config/coordinates")
def get_coordinates():
    return load_coordinates()

@app.post("/api/config/coordinates")
def update_coordinates(payload: Dict[str, Any]):
    save_coordinates(payload)
    return {"status": "success", "message": "Coordinates saved successfully"}

@app.get("/api/config/profile")
def get_profile():
    if os.path.exists(PROFILE_PATH):
        with open(PROFILE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@app.post("/api/config/profile")
def update_profile(profile_data: Dict[str, Any]):
    with open(PROFILE_PATH, "w", encoding="utf-8") as f:
        json.dump(profile_data, f, indent=2)
    return {"status": "success", "message": "Profile presets saved successfully"}

@app.post("/api/ai/extract")
def ai_extract(req: AIExtractRequest):
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    extracted = extract_event_info(req.prompt.strip(), api_key=req.api_key)
    return {"status": "success", "data": extracted}

@app.post("/api/pdf/preview")
def preview_pdf(req: PDFRequest):
    try:
        preview_data = generate_preview_image(
            form_data=req.form_data,
            custom_coords=req.coordinates,
            signatures=req.signatures,
            dpi=150
        )
        return {"status": "success", "preview": preview_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {str(e)}")

@app.post("/api/pdf/export")
def export_pdf(req: PDFRequest):
    try:
        mode = req.mode or "editable"
        pdf_bytes = generate_pdf_bytes(
            form_data=req.form_data,
            custom_coords=req.coordinates,
            mode=mode,
            signatures=req.signatures
        )
        
        tajuk = req.form_data.get("tajuk_projek", "PROJEK")
        safe_title = "".join(c for c in tajuk if c.isalnum() or c in (" ", "_", "-")).rstrip()
        filename = f"EPA.002_{safe_title}_{mode.upper()}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

@app.post("/api/upload-signature")
async def upload_signature(file: UploadFile = File(...)):
    try:
        content = await file.read()
        b64_str = base64.b64encode(content).decode("utf-8")
        mime = file.content_type or "image/png"
        data_url = f"data:{mime};base64,{b64_str}"
        
        # Save copy locally
        file_path = os.path.join(UPLOADS_DIR, file.filename or "signature.png")
        with open(file_path, "wb") as f:
            f.write(content)
            
        return {
            "status": "success",
            "filename": file.filename,
            "data_url": data_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload signature: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
