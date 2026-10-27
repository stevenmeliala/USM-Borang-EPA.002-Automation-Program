import os
import re
import json
import requests
from datetime import datetime

SYSTEM_PROMPT = """You are an expert administrative assistant for Universiti Sains Malaysia (USM) student affairs (BHEPA).
Your job is to extract event details from a user's natural language input (which may be in English, Malay, or Manglish) and produce a structured JSON object to fill the official USM EPA.002 form.

Required Output Fields:
{
  "tajuk_projek": "Exact event title with quotation marks if subtitle exists (e.g., 'Perjumpaan Berdoa 1 - \"Intentional Prayer\"')",
  "tarikh_projek": "Formatted date in Malay e.g. '23 Oktober 2026'",
  "masa_projek": "Formatted time range e.g. '11:30 AM - 14:00 PM' or '11:30 AM - 02:00 PM'",
  "lokasi_projek": "Specific venue/room e.g. 'Bilik Tutorial 150' or 'Dewan Budaya'",
  "sasaran_peserta": "Number of participants as string e.g. '30'",
  "kaedah_pelaksanaan": "Fizikal, Hibrid, or Atas Talian",
  "penganjuran": "Dalam Kampus or Luar Kampus",
  "kutipan_wang": "Tidak (default unless fee is explicitly mentioned, in which case 'Ya')",
  "kutipan_rm": "RM amount if any, otherwise empty string",
  "tujuan_kutipan": "Purpose if fee is collected, otherwise empty string",
  "hebat_flagship": "Tidak (default unless explicitly described as a HEBAT Flagship program, in which case 'Ya')",
  "ringkasan_projek": "A formal, high-impact Bahasa Melayu summary between 25 and 40 words suitable for USM BHEPA administrative approval. It must clearly articulate the purpose, targeted learning outcome/benefit to USM students, and character development.",
  "peringkat": "One of ['A', 'B', 'C', 'D']. 'D' is for Pertubuhan/Pusat Pengajian (club/internal events), 'C' for Universiti/Negeri, 'B' for Kebangsaan, 'A' for Antarabangsa.",
  "mycsd": "One of ['01', '02', '03', '04', '05', '06', '07', '08']. Recommended: '06' for Kepimpinan, '04' for Kesukarelawanan, '02' for Khidmat Masyarakat, '03' for Pengucapan Awam, '07' for Kebudayaan, '08' for Sukan, '01' for Reka Cipta & Inovasi, '05' for Keusahawanan.",
  "sdg": "Array of 1 to 2 SDG codes as strings from ['01', '02', ..., '17']. E.g. ['03'] for Good Health and Well-being, ['04'] for Quality Education, ['16'] for Peace & Strong Institutions."
}

Respond ONLY with valid JSON. Do not include markdown code block syntax if possible, or wrap in ```json ... ```.
"""

MALAY_MONTHS = {
    1: "Januari", 2: "Februari", 3: "Mac", 4: "April",
    5: "Mei", 6: "Jun", 7: "Julai", 8: "Ogos",
    9: "September", 10: "Oktober", 11: "November", 12: "Disember"
}

ENGLISH_MONTH_NAMES = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3, "mac": 3,
    "apr": 4, "april": 4, "may": 5, "mei": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "ogos": 8, "sep": 9, "september": 9, "oct": 10, "october": 10, "okt": 10, "oktober": 10,
    "nov": 11, "november": 11, "dec": 12, "december": 12, "dis": 12, "disember": 12
}

def extract_with_gemini(user_text, api_key):
    """
    Calls Google Gemini API using structured JSON output.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_PROMPT},
                    {"text": f"Event Description to parse:\n{user_text}"}
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }
    
    headers = {"Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json=payload, timeout=25)
    resp.raise_for_status()
    data = resp.json()
    
    content_text = data["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(content_text)

def fallback_heuristic_extractor(user_text):
    """
    Intelligent heuristic & regex extractor for offline parsing
    when no Gemini API key is configured.
    """
    result = {
        "tajuk_projek": "",
        "tarikh_projek": "",
        "masa_projek": "",
        "lokasi_projek": "",
        "sasaran_peserta": "30",
        "kaedah_pelaksanaan": "Fizikal",
        "penganjuran": "Dalam Kampus",
        "kutipan_wang": "Tidak",
        "kutipan_rm": "",
        "tujuan_kutipan": "",
        "hebat_flagship": "Ya" if re.search(r"\bhebat\b", user_text, re.IGNORECASE) else "Tidak",
        "ringkasan_projek": "",
        "peringkat": "D",
        "mycsd": "06",
        "sdg": ["03"]
    }
    
    # 1. Extract Participant Count
    # e.g. "for 30 people", "30 pax", "30 orang", "peserta 50"
    pax_match = re.search(r"(\d+)\s*(?:people|pax|orang|peserta|participants)", user_text, re.IGNORECASE)
    if not pax_match:
        pax_match = re.search(r"(?:for|untuk|peserta)\s*(\d+)", user_text, re.IGNORECASE)
    if pax_match:
        result["sasaran_peserta"] = pax_match.group(1)
        
    # 2. Extract Date
    # e.g. "23 Oct 2026", "23/10/2026", "23 October 2026", "23hb Oktober 2026"
    date_dmy = re.search(r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})", user_text)
    if date_dmy:
        day = int(date_dmy.group(1))
        month = int(date_dmy.group(2))
        year = int(date_dmy.group(3))
        month_name = MALAY_MONTHS.get(month, "Oktober")
        result["tarikh_projek"] = f"{day} {month_name} {year}"
    else:
        date_word = re.search(r"(\d{1,2})(?:st|nd|rd|th|hb)?\s+([A-Za-z]+)\s+(\d{4})", user_text)
        if date_word:
            day = int(date_word.group(1))
            m_str = date_word.group(2).lower()
            year = int(date_word.group(3))
            m_num = ENGLISH_MONTH_NAMES.get(m_str, 10)
            month_name = MALAY_MONTHS.get(m_num, "Oktober")
            result["tarikh_projek"] = f"{day} {month_name} {year}"
        else:
            now = datetime.now()
            result["tarikh_projek"] = f"23 Oktober {now.year}"
            
    # 3. Extract Time
    # e.g. "from 11:30am to 2pm", "11:30 AM - 14:00 PM", "8.00 pagi - 12.00 tgh"
    def normalize_single_time(t_raw):
        t_clean = t_raw.strip().lower()
        is_pm = "pm" in t_clean or "ptg" in t_clean or "petang" in t_clean or "malam" in t_clean
        is_am = "am" in t_clean or "pagi" in t_clean
        # remove letters
        nums = re.sub(r"[^\d:]", "", t_clean)
        if not nums:
            return t_raw.upper()
        if ":" in nums:
            parts = nums.split(":")
            h, m = int(parts[0]), int(parts[1])
        else:
            h, m = int(nums), 0
        if is_pm and h < 12:
            h_24 = h + 12
        elif is_am and h == 12:
            h_24 = 0
        else:
            h_24 = h
        ampm = "PM" if is_pm or h_24 >= 12 else "AM"
        return f"{h_24:02d}:{m:02d} {ampm}"

    time_range = re.search(r"(?:from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|pagi|ptg|petang)?)\s*(?:to|-|hingga)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|pagi|ptg|petang)?)", user_text, re.IGNORECASE)
    if time_range:
        t1 = normalize_single_time(time_range.group(1))
        t2 = normalize_single_time(time_range.group(2))
        result["masa_projek"] = f"{t1} - {t2}"
    else:
        result["masa_projek"] = "11:30 AM - 14:00 PM"

    # 4. Extract Venue / Location
    # e.g. "at Bilik Tutorial 150 for 30 people", "di Bilik Kuliah 3", "at DK G"
    venue_match = re.search(r"(?:at|di|venue|lokasi:?)\s+([A-Za-z0-9\s\-]+?)(?=\s+(?:for|on|from|pada|dari|untuk)\b|$)", user_text, re.IGNORECASE)
    if venue_match:
        venue = venue_match.group(1).strip()
        # Clean up any trailing words
        venue = re.sub(r"\s+(?:for|on|from|untuk)$", "", venue, flags=re.IGNORECASE).strip()
        result["lokasi_projek"] = venue
    else:
        result["lokasi_projek"] = "Bilik Tutorial 150"

    # 5. Extract Title
    # Look for "Prayer meeting 1 Intentional Prayer" or everything before "on <date>" or "at <venue>"
    clean_text = user_text.strip()
    title_match = re.search(r"^(.*?)(?=\s+(?:on\s+\d|at\s+[A-Z]|from\s+\d|pada\s+\d|di\s+[A-Z]))", clean_text, re.IGNORECASE)
    if title_match and len(title_match.group(1).strip()) > 5:
        raw_title = title_match.group(1).strip()
        # Format title e.g. "Prayer meeting 1 Intentional Prayer" -> "Perjumpaan Berdoa 1 - \"Intentional Prayer\""
        if "prayer meeting" in raw_title.lower():
            num = re.search(r"prayer meeting\s*(\d*)", raw_title, re.IGNORECASE)
            num_str = f" {num.group(1)}" if num and num.group(1) else " 1"
            sub = re.sub(r"prayer meeting\s*\d*", "", raw_title, flags=re.IGNORECASE).strip()
            sub_formatted = f" - \"{sub}\"" if sub else ""
            result["tajuk_projek"] = f"Perjumpaan Berdoa{num_str}{sub_formatted}"
        else:
            result["tajuk_projek"] = raw_title
    else:
        result["tajuk_projek"] = "Perjumpaan Berdoa 1 - \"Intentional Prayer\""

    # 6. Method & Hosting
    if "online" in user_text.lower() or "webex" in user_text.lower() or "zoom" in user_text.lower() or "talian" in user_text.lower():
        result["kaedah_pelaksanaan"] = "Atas Talian"
    elif "hybrid" in user_text.lower() or "hibrid" in user_text.lower():
        result["kaedah_pelaksanaan"] = "Hibrid"
    else:
        result["kaedah_pelaksanaan"] = "Fizikal"

    if "luar kampus" in user_text.lower() or "off-campus" in user_text.lower():
        result["penganjuran"] = "Luar Kampus"
    else:
        result["penganjuran"] = "Dalam Kampus"

    # 7. Generate formal Bahasa Melayu Ringkasan Projek (25-40 words)
    title_lower = result["tajuk_projek"].lower()
    if "berdoa" in title_lower or "prayer" in title_lower or "agape" in title_lower:
        result["ringkasan_projek"] = (
            "Program ini bertujuan untuk mengajar pelajar USM cara berdoa yang terarah dan bererti, "
            "serta mengajak peserta untuk tidak hanya menjadikan doa sebagai rutin, "
            "malah sebagai landasan pembentukan karakter dan gaya hidup."
        )
        result["mycsd"] = "06"  # Kepimpinan
        result["sdg"] = ["03"]  # Good Health & Well-being
    elif "bengkel" in title_lower or "workshop" in title_lower or "seminar" in title_lower:
        result["ringkasan_projek"] = (
            f"Program ini bertujuan untuk memperkasakan kemahiran kepimpinan dan praktikal para pelajar USM, "
            f"di samping memupuk semangat kerjasama berpasukan dan daya saing dalam kalangan peserta demi kemenjadian graduan holistik."
        )
        result["mycsd"] = "06"
        result["sdg"] = ["04"]  # Quality Education
    elif "sukan" in title_lower or "sport" in title_lower or "futsal" in title_lower:
        result["ringkasan_projek"] = (
            f"Program ini dianjurkan untuk memupuk gaya hidup sihat dan kecergasan fizikal dalam kalangan mahasiswa USM, "
            f"serta memperkukuhkan semangat kesukanan dan perpaduan silang budaya antara komuniti kampus."
        )
        result["mycsd"] = "08"  # Sukan
        result["sdg"] = ["03"]
    elif "khidmat" in title_lower or "charity" in title_lower or "sukarelawan" in title_lower:
        result["ringkasan_projek"] = (
            f"Program ini bermatlamat menanam semangat kesukarelawanan dan empati sosial dalam kalangan pelajar USM, "
            f"serta memberi sumbangan bermakna secara langsung kepada kebajikan masyarakat setempat yang memerlukan sokongan."
        )
        result["mycsd"] = "02"  # Khidmat Masyarakat
        result["sdg"] = ["01", "10"]
    else:
        result["ringkasan_projek"] = (
            f"Program ini dianjurkan bagi memperkukuhkan jati diri, kepimpinan serta ukhuwah dalam kalangan pelajar USM, "
            f"di samping menyediakan platform interaktif bagi pembangunan kemahiran insaniah yang menyeluruh dan berimpak tinggi."
        )
        result["mycsd"] = "06"
        result["sdg"] = ["03", "04"]

    return result

def extract_event_info(user_text, api_key=None):
    """
    Main extraction interface. Tries Gemini API if key is available,
    otherwise uses the heuristic engine.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY")
    if key and len(key.strip()) > 10:
        try:
            return extract_with_gemini(user_text, key.strip())
        except Exception as e:
            print(f"Gemini API extraction failed ({e}), falling back to heuristic extractor.")
            return fallback_heuristic_extractor(user_text)
    else:
        return fallback_heuristic_extractor(user_text)
