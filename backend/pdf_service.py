import os
import json
import base64
import io
import fitz
from PIL import Image

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "templates", "EPA.002 - BORANG PERMOHONAN MENGADAKAN PROJEK (01Jan2026)_V1.pdf")
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config", "epa002_coordinates.json")

def load_coordinates():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_coordinates(data):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def bl_to_fitz(rect, page_height=841.68):
    """
    Converts bottom-left origin PDF coordinates [x1, y1, x2, y2]
    to PyMuPDF top-left origin Rect(x0, y0, x1, y1).
    """
    x1, y1, x2, y2 = rect
    min_x, max_x = min(x1, x2), max(x1, x2)
    min_y, max_y = min(y1, y2), max(y1, y2)
    return fitz.Rect(min_x, page_height - max_y, max_x, page_height - min_y)

_CACHED_TEMPLATE_BOXES = None

def get_template_checkbox_boxes(page):
    """
    Scans the template PDF once to locate the exact visual square border
    of all 48 checkbox glyphs (\uf0f0 in SymbolMT and \uf0a3 in Wingdings2).
    """
    global _CACHED_TEMPLATE_BOXES
    if _CACHED_TEMPLATE_BOXES is not None:
        return _CACHED_TEMPLATE_BOXES

    boxes = []
    for block in page.get_text('dict')['blocks']:
        if 'lines' in block:
            for line in block['lines']:
                for span in line['spans']:
                    sr = fitz.Rect(span['bbox'])
                    if '\uf0f0' in span['text']:
                        boxes.append(fitz.Rect(sr.x0 + 0.66, sr.y0 + 3.31, sr.x1 - 0.42, sr.y0 + 8.83))
                    elif '\uf0a3' in span['text']:
                        boxes.append(fitz.Rect(sr.x0 + 0.76, sr.y0 + 1.11, sr.x1 - 0.88, sr.y0 + 6.63))

    _CACHED_TEMPLATE_BOXES = boxes
    return _CACHED_TEMPLATE_BOXES

def find_checkbox_box(page, rect):
    """
    Finds the exact printed checkbox box on the page corresponding to the
    given calibration rect.
    """
    if 3.0 <= rect.width <= 8.0 and 3.0 <= rect.height <= 8.0:
        return rect

    template_boxes = get_template_checkbox_boxes(page)
    target_x = rect.x0 + 3.5
    target_y = rect.y0 + 3.0
    best_box = None
    min_dist = 999.0
    for cand in template_boxes:
        d = abs(cand.x0 - target_x) + abs(cand.y0 - target_y)
        if d < min_dist:
            min_dist = d
            best_box = cand

    if best_box is not None and min_dist < 15.0:
        return best_box

    return fitz.Rect(rect.x0 + 3.5, rect.y0 + 2.5, rect.x0 + 9.0, rect.y0 + 8.0)

def draw_vector_checkmark(page, rect, color=(0, 0, 0), width=1.4):
    """
    Draws a filled calligraphic vector checkmark matching the reference
    checkbox icon: curved left hook at mid-height, sharp bottom vertex, and
    a tapered right stroke sweeping directly through the top-right corner.
    """
    box = find_checkbox_box(page, rect)
    w = box.width
    h = box.height

    left_tip = fitz.Point(box.x0 + w * 0.14, box.y0 + h * 0.50)
    inner_valley = fitz.Point(box.x0 + w * 0.42, box.y0 + h * 0.64)
    right_top_tip = fitz.Point(box.x0 + w * 1.20, box.y0 - h * 0.16)
    right_bot_tip = fitz.Point(box.x0 + w * 1.25, box.y0 - h * 0.10)
    outer_vertex = fitz.Point(box.x0 + w * 0.39, box.y0 + h * 0.86)

    shape = page.new_shape()
    shape.draw_bezier(
        left_tip,
        fitz.Point(box.x0 + w * 0.24, box.y0 + h * 0.40),
        fitz.Point(box.x0 + w * 0.34, box.y0 + h * 0.48),
        inner_valley
    )
    shape.draw_bezier(
        inner_valley,
        fitz.Point(box.x0 + w * 0.62, box.y0 + h * 0.34),
        fitz.Point(box.x0 + w * 0.90, box.y0 + h * 0.06),
        right_top_tip
    )
    shape.draw_line(right_top_tip, right_bot_tip)
    shape.draw_bezier(
        right_bot_tip,
        fitz.Point(box.x0 + w * 0.92, box.y0 + h * 0.16),
        fitz.Point(box.x0 + w * 0.60, box.y0 + h * 0.52),
        outer_vertex
    )
    shape.draw_bezier(
        outer_vertex,
        fitz.Point(box.x0 + w * 0.32, box.y0 + h * 0.66),
        fitz.Point(box.x0 + w * 0.22, box.y0 + h * 0.54),
        left_tip
    )
    shape.finish(color=None, fill=color, closePath=True)
    shape.commit()

def decode_image_bytes(img_input):
    """
    Decodes an image from base64 data url, base64 string, or file path.
    """
    if not img_input:
        return None
    try:
        if img_input.startswith("data:image"):
            # Strip data:image/...;base64,
            header, b64_data = img_input.split(",", 1)
            return base64.b64decode(b64_data)
        elif os.path.exists(img_input):
            with open(img_input, "rb") as f:
                return f.read()
        else:
            return base64.b64decode(img_input)
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def build_pdf_document(form_data, custom_coords=None, mode="editable", signatures=None):
    """
    Populates the EPA.002 template with form_data and returns a fitz.Document.
    mode: 'editable' (Mode A - FreeText annotations) or 'flattened' (Mode B - vector text direct in page)
    """
    coords = custom_coords or load_coordinates()
    doc = fitz.open(TEMPLATE_PATH)
    page = doc[0]
    H = page.rect.height
    
    text_fields = coords.get("text_fields", {})
    checkboxes = coords.get("checkboxes", {})
    widgets = coords.get("widgets", {})
    
    # 1. Populate Text Fields
    for field_key, field_cfg in text_fields.items():
        val = form_data.get(field_key, "")
        if not val:
            continue
        val = str(val).strip()
        if not val:
            continue
            
        fitz_rect = bl_to_fitz(field_cfg["rect"], H)
        font_size = float(field_cfg.get("font_size", 9.0))
        
        if field_key == "ringkasan_projek":
            # Multi-line box: find the exact auto-fitting font size for both modes
            best_fs = 6.5
            for fs in [font_size, font_size - 0.5, font_size - 1.0, font_size - 1.5, 6.5]:
                test_shape = page.new_shape()
                rc = test_shape.insert_textbox(
                    fitz_rect,
                    val,
                    fontsize=fs,
                    fontname="helv",
                    align=fitz.TEXT_ALIGN_LEFT
                )
                if rc >= 0:
                    best_fs = fs
                    break

            if mode == "editable":
                # Align FreeText first-line baseline (y0 + 0.8 * fs) with insert_textbox (y0 + 1.075 * fs)
                annot_rect = fitz.Rect(
                    fitz_rect.x0,
                    fitz_rect.y0 + 0.275 * best_fs,
                    fitz_rect.x1,
                    fitz_rect.y1 + 4.0
                )
                annot = page.add_freetext_annot(
                    annot_rect,
                    val,
                    fontsize=best_fs,
                    fontname="helv",
                    text_color=(0, 0, 0),
                    fill_color=None,
                    border_color=None
                )
                annot.update()
            else:
                page.insert_textbox(
                    fitz_rect,
                    val,
                    fontsize=best_fs,
                    fontname="helv",
                    color=(0, 0, 0),
                    align=fitz.TEXT_ALIGN_LEFT
                )
        else:
            # Single-line field: auto-scale font size if text exceeds cell width
            best_fs = font_size
            for fs in [font_size, font_size - 0.5, font_size - 1.0, font_size - 1.5, 7.0, 6.5]:
                if fitz.get_text_length(val, fontname="helv", fontsize=fs) <= fitz_rect.width - 2.0:
                    best_fs = fs
                    break
            text_w = fitz.get_text_length(val, fontname="helv", fontsize=best_fs)
            baseline_y = fitz_rect.y1 - 2.5

            if mode == "editable":
                # FreeText places baseline at annot_rect.y0 + 0.8 * fontsize.
                # Match baseline_y exactly and ensure width never wraps single-line text.
                annot_rect = fitz.Rect(
                    fitz_rect.x0,
                    baseline_y - 0.8 * best_fs,
                    max(fitz_rect.x1, fitz_rect.x0 + text_w + 10.0),
                    baseline_y + 0.6 * best_fs
                )
                annot = page.add_freetext_annot(
                    annot_rect,
                    val,
                    fontsize=best_fs,
                    fontname="helv",
                    text_color=(0, 0, 0),
                    fill_color=None,
                    border_color=None
                )
                annot.update()
            else:
                page.insert_text(
                    fitz.Point(fitz_rect.x0, baseline_y),
                    val,
                    fontsize=best_fs,
                    fontname="helv",
                    color=(0, 0, 0)
                )

    # 2. Determine active checkboxes
    active_boxes = set()
    
    # HEBAT Flagship Programs
    hebat = str(form_data.get("hebat_flagship", "")).strip().lower()
    if hebat in ["ya", "yes"]:
        active_boxes.add("hebat_ya")
    elif hebat in ["tidak", "no"]:
        active_boxes.add("hebat_tidak")
        
    # Kategori
    kategori = str(form_data.get("kategori", "")).strip().lower()
    kat_map = {
        "majlis": "kategori_majlis",
        "desasiswa": "kategori_desasiswa",
        "kelab": "kategori_kelab",
        "anak negeri": "kategori_anak_negeri",
        "persatuan": "kategori_persatuan",
        "badan beruniform": "kategori_badan_beruniform",
        "sekretariat": "kategori_sekretariat"
    }
    if kategori in kat_map:
        active_boxes.add(kat_map[kategori])
        
    # Kampus
    kampus = str(form_data.get("kampus", "")).strip().lower()
    kampus_map = {
        "ki": "kampus_ki",
        "induk": "kampus_ki",
        "kj": "kampus_kj",
        "kejuruteraan": "kampus_kj",
        "kk": "kampus_kk",
        "kesihatan": "kampus_kk"
    }
    if kampus in kampus_map:
        active_boxes.add(kampus_map[kampus])
        
    # Kaedah Pelaksanaan
    kaedah = str(form_data.get("kaedah_pelaksanaan", "")).strip().lower()
    if "fizikal" in kaedah:
        active_boxes.add("kaedah_fizikal")
    elif "hibrid" in kaedah:
        active_boxes.add("kaedah_hibrid")
    elif "talian" in kaedah or "online" in kaedah:
        active_boxes.add("kaedah_talian")
        
    # Penganjuran
    penganjuran = str(form_data.get("penganjuran", "")).strip().lower()
    if "dalam" in penganjuran:
        active_boxes.add("penganjuran_dalam")
    elif "luar" in penganjuran:
        active_boxes.add("penganjuran_luar")
        
    # Kutipan Wang
    kutipan = str(form_data.get("kutipan_wang", "")).strip().lower()
    if kutipan in ["ya", "yes"]:
        active_boxes.add("kutipan_ya")
    elif kutipan in ["tidak", "no"]:
        active_boxes.add("kutipan_tidak")
        
    # Peringkat
    peringkat = str(form_data.get("peringkat", "")).strip().upper()
    peringkat_map = {
        "A": "peringkat_a",
        "B": "peringkat_b",
        "C": "peringkat_c",
        "D": "peringkat_d"
    }
    if peringkat in peringkat_map:
        active_boxes.add(peringkat_map[peringkat])
        
    # MyCSD
    mycsd = str(form_data.get("mycsd", "")).strip()
    if len(mycsd) == 1:
        mycsd = f"0{mycsd}"
    mycsd_key = f"mycsd_{mycsd}"
    if mycsd_key in checkboxes:
        active_boxes.add(mycsd_key)
        
    # SDGs (up to 2)
    sdgs = form_data.get("sdg", [])
    if isinstance(sdgs, str):
        sdgs = [s.strip() for s in sdgs.split(",") if s.strip()]
    for s in sdgs:
        s_code = str(s).strip()
        if len(s_code) == 1:
            s_code = f"0{s_code}"
        sdg_key = f"sdg_{s_code}"
        if sdg_key in checkboxes:
            active_boxes.add(sdg_key)
            
    # Explicit checkbox overrides from form_data (if user manually toggled boxes)
    custom_checks = form_data.get("active_checkboxes", [])
    if custom_checks:
        for cb in custom_checks:
            active_boxes.add(cb)

    # 3. Draw Checkmarks
    for cb_key in active_boxes:
        if cb_key in checkboxes:
            cb_cfg = checkboxes[cb_key]
            cb_rect = bl_to_fitz(cb_cfg["rect"], H)
            draw_vector_checkmark(page, cb_rect, color=(0, 0, 0), width=1.4)

    # 4. Insert Signatures
    # Signatures can come from signatures dict or form_data
    sigs = signatures or {}
    sig_pemohon = sigs.get("signature_pemohon") or form_data.get("signature_pemohon")
    sig_disemak = sigs.get("signature_disemak") or form_data.get("signature_disemak")
    
    if sig_pemohon and "signature_pemohon" in widgets:
        img_bytes = decode_image_bytes(sig_pemohon)
        if img_bytes:
            sig_rect = bl_to_fitz(widgets["signature_pemohon"]["rect"], H)
            page.insert_image(sig_rect, stream=img_bytes, keep_proportion=True)

    if sig_disemak and "signature_disemak" in widgets:
        img_bytes = decode_image_bytes(sig_disemak)
        if img_bytes:
            sig_rect = bl_to_fitz(widgets["signature_disemak"]["rect"], H)
            page.insert_image(sig_rect, stream=img_bytes, keep_proportion=True)

    return doc

def generate_pdf_bytes(form_data, custom_coords=None, mode="editable", signatures=None):
    """
    Returns PDF binary bytes.
    """
    doc = build_pdf_document(form_data, custom_coords=custom_coords, mode=mode, signatures=signatures)
    pdf_bytes = doc.tobytes(deflate=True, garbage=3)
    doc.close()
    return pdf_bytes

def generate_preview_image(form_data, custom_coords=None, signatures=None, dpi=150):
    """
    Renders page 0 of the filled PDF as a PNG base64 string for immediate canvas preview.
    """
    # For preview image, we use flattened mode so all text and checkmarks are rasterized into the pixmap
    doc = build_pdf_document(form_data, custom_coords=custom_coords, mode="flattened", signatures=signatures)
    page = doc[0]
    pix = page.get_pixmap(dpi=dpi)
    png_bytes = pix.tobytes("png")
    doc.close()
    
    b64_str = base64.b64encode(png_bytes).decode("utf-8")
    return {
        "image_data": f"data:image/png;base64,{b64_str}",
        "width": pix.width,
        "height": pix.height,
        "dpi": dpi
    }
