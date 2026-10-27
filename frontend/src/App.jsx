import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  FileDown,
  Settings,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  Layers,
  Edit3,
  Calendar,
  Clock,
  MapPin,
  Users,
  Compass,
  Award,
  Upload,
  Trash2,
  Move,
  Target,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import SettingsModal from './components/SettingsModal';
import CalibrateModal from './components/CalibrateModal';

const API_BASE = 'http://localhost:8000';
const PDF_WIDTH_PTS = 595.44;
const PDF_HEIGHT_PTS = 841.68;

const SAMPLE_PROMPTS = [
  {
    title: '🙏 Prayer Meeting 1 (Agape)',
    prompt: 'Prayer meeting 1 Intentional Prayer on 23 Oct 2026 from 11:30am to 2pm at Bilik Tutorial 150 for 30 people'
  },
  {
    title: '🌟 Leadership Workshop',
    prompt: 'Bengkel Kepimpinan Mahasiswa Berimpak on 15 November 2026 from 9:00am to 4:30pm at Dewan Budaya for 80 participants'
  },
  {
    title: '🤝 Community Charity',
    prompt: 'Program Khidmat Masyarakat Bersama Komuniti Gelugor on 5 December 2026 from 8:00am to 1:00pm at Komuniti Gelugor for 50 people'
  },
  {
    title: '⚽ Friendly Sports Day',
    prompt: 'Hari Sukaneka Persatuan Agape on 18 October 2026 from 8:00am to 12:00pm at Padang Kawad USM for 45 participants'
  }
];

const MYCSD_LIST = [
  { code: '01', label: 'Reka Cipta & Inovasi' },
  { code: '02', label: 'Khidmat Masyarakat' },
  { code: '03', label: 'Pengucapan Awam' },
  { code: '04', label: 'Kesukarelawanan' },
  { code: '05', label: 'Keusahawanan' },
  { code: '06', label: 'Kepimpinan' },
  { code: '07', label: 'Kebudayaan' },
  { code: '08', label: 'Sukan' }
];

const SDG_LIST = [
  { code: '01', label: '01 No Poverty' },
  { code: '02', label: '02 Zero Hunger' },
  { code: '03', label: '03 Good Health & Well-being' },
  { code: '04', label: '04 Quality Education' },
  { code: '05', label: '05 Gender Equality' },
  { code: '06', label: '06 Clean Water' },
  { code: '07', label: '07 Affordable Energy' },
  { code: '08', label: '08 Decent Work & Economy' },
  { code: '09', label: '09 Industry & Innovation' },
  { code: '10', label: '10 Reduced Inequalities' },
  { code: '11', label: '11 Sustainable Cities' },
  { code: '12', label: '12 Responsible Consumption' },
  { code: '13', label: '13 Climate Action' },
  { code: '14', label: '14 Life Below Water' },
  { code: '15', label: '15 Life on Land' },
  { code: '16', label: '16 Peace & Justice' },
  { code: '17', label: '17 Partnerships' }
];

export default function App() {
  // Config & State
  const [profile, setProfile] = useState({});
  const [coordinates, setCoordinates] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  // Form State
  const [formData, setFormData] = useState({
    nama_pertubuhan: '',
    kategori: 'Persatuan',
    kampus: 'KI',
    hebat_flagship: 'Tidak',
    nama_pemohon: '',
    no_kp: '',
    jawatan_pemohon: 'Setiausaha',
    no_matrik: '',
    emel_pemohon: '',
    no_telefon: '',
    tajuk_projek: '',
    ringkasan_projek: '',
    cadangan_vip: '',
    tarikh_projek: '',
    masa_projek: '',
    lokasi_projek: '',
    sasaran_peserta: '30',
    kaedah_pelaksanaan: 'Fizikal',
    penganjuran: 'Dalam Kampus',
    nama_pegawai_pengiring: '',
    jawatan_pegawai_pengiring: '',
    ptj_pegawai_pengiring: '',
    kutipan_wang: 'Tidak',
    kutipan_rm: '',
    tujuan_kutipan: '',
    peringkat: 'D',
    mycsd: '06',
    sdg: ['03'],
    tarikh_disediakan: new Date().toLocaleDateString('en-GB'),
    nama_disemak: 'Reuel Rajah',
    tarikh_disemak: new Date().toLocaleDateString('en-GB')
  });

  // Signatures
  const [signatures, setSignatures] = useState({
    signature_pemohon: null,
    signature_disemak: null
  });

  // UI Controls
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [exportMode, setExportMode] = useState('editable'); // 'editable' or 'flattened'
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(0.85);
  const [isCalibrateMode, setIsCalibrateMode] = useState(false);
  const [openSections, setOpenSections] = useState({
    event: true,
    goals: true,
    society: true,
    signatures: true
  });
  const toggleSection = (sec) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };
  const [toasts, setToasts] = useState([]);

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [calibrateClick, setCalibrateClick] = useState(null);

  // Drag state
  const [draggingField, setDraggingField] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const paperRef = useRef(null);
  const renderTimeout = useRef(null);

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // 1. Initial Load: Profile & Coordinates
  useEffect(() => {
    fetch(`${API_BASE}/api/config/profile`)
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setFormData((prev) => ({
          ...prev,
          nama_pertubuhan: data.nama_pertubuhan || prev.nama_pertubuhan,
          kategori: data.kategori || prev.kategori,
          kampus: data.kampus || prev.kampus,
          hebat_flagship: data.hebat_flagship || prev.hebat_flagship,
          nama_pemohon: data.nama_pemohon || prev.nama_pemohon,
          no_kp: data.no_kp || prev.no_kp,
          jawatan_pemohon: data.jawatan_pemohon || prev.jawatan_pemohon,
          no_matrik: data.no_matrik || prev.no_matrik,
          emel_pemohon: data.emel_pemohon || prev.emel_pemohon,
          no_telefon: data.no_telefon || prev.no_telefon,
          nama_disemak: data.nama_disemak || prev.nama_disemak
        }));
      })
      .catch((err) => console.error('Failed to load profile:', err));

    fetch(`${API_BASE}/api/config/coordinates`)
      .then((res) => res.json())
      .then((data) => setCoordinates(data))
      .catch((err) => console.error('Failed to load coordinates:', err));
  }, []);

  // 2. Debounced PDF Preview Rendering
  const updatePdfPreview = useCallback(
    (currentFormData, currentCoords, currentSigs) => {
      if (renderTimeout.current) clearTimeout(renderTimeout.current);
      renderTimeout.current = setTimeout(async () => {
        setIsRendering(true);
        try {
          const resp = await fetch(`${API_BASE}/api/pdf/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              form_data: currentFormData,
              coordinates: currentCoords,
              signatures: currentSigs
            })
          });
          const resJson = await resp.json();
          if (resJson.status === 'success') {
            setPreviewImage(resJson.preview.image_data);
          }
        } catch (err) {
          console.error('Preview error:', err);
        } finally {
          setIsRendering(false);
        }
      }, 250);
    },
    []
  );

  useEffect(() => {
    if (coordinates) {
      updatePdfPreview(formData, coordinates, signatures);
    }
  }, [formData, coordinates, signatures, updatePdfPreview]);

  // Form Field Change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle SDG selection (max 2)
  const toggleSdg = (code) => {
    setFormData((prev) => {
      const exists = prev.sdg.includes(code);
      if (exists) {
        return { ...prev, sdg: prev.sdg.filter((s) => s !== code) };
      }
      if (prev.sdg.length >= 2) {
        addToast('Maximum 2 Sustainable Development Goals allowed by BHEPA', 'error');
        return prev;
      }
      return { ...prev, sdg: [...prev.sdg, code] };
    });
  };

  // AI Extraction Trigger
  const handleAiExtract = async () => {
    if (!aiPrompt.trim()) {
      addToast('Please enter an event description prompt', 'error');
      return;
    }

    setIsAiLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/ai/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          api_key: geminiApiKey || undefined
        })
      });

      const resJson = await resp.json();
      if (resJson.status === 'success' && resJson.data) {
        setFormData((prev) => ({
          ...prev,
          ...resJson.data
        }));
        addToast('Event details extracted & auto-filled successfully!');
      } else {
        addToast('Extraction failed. Check input prompt.', 'error');
      }
    } catch (err) {
      console.error('AI Extraction error:', err);
      addToast('Error communicating with extraction service', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Download PDF
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const resp = await fetch(`${API_BASE}/api/pdf/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_data: formData,
          coordinates: coordinates,
          signatures: signatures,
          mode: exportMode
        })
      });

      if (!resp.ok) throw new Error('PDF export failed');

      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (formData.tajuk_projek || 'PROJEK')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      a.download = `EPA.002_${safeTitle}_${exportMode.toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
      addToast(`Downloaded ${exportMode === 'editable' ? 'Editable' : 'Flattened'} PDF!`);
    } catch (err) {
      console.error(err);
      addToast('Failed to export PDF file', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Signature Upload Handler
  const handleSignatureUpload = (field, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSignatures((prev) => ({
        ...prev,
        [field]: reader.result
      }));
      addToast(`Signature for ${field === 'signature_pemohon' ? 'Pemohon' : 'Disemak'} uploaded!`);
    };
    reader.readAsDataURL(file);
  };

  const handleClearSignature = (field) => {
    setSignatures((prev) => ({
      ...prev,
      [field]: null
    }));
    addToast('Signature cleared');
  };

  // Save Presets
  const handleSaveProfile = async (newProfile) => {
    setProfile(newProfile);
    try {
      await fetch(`${API_BASE}/api/config/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfile)
      });
      addToast('Profile presets saved successfully');
    } catch (err) {
      console.error(err);
      addToast('Failed to save profile on backend', 'error');
    }
  };

  // Save API Key
  const handleSaveApiKey = (key) => {
    setGeminiApiKey(key);
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    addToast('Gemini API Key setting updated');
  };

  // Canvas Click in Calibrate Mode
  const handlePaperClick = (e) => {
    if (!isCalibrateMode || draggingField) return;

    const rect = paperRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel click to bottom-left PDF points
    const pdf_x = clickX / zoom;
    const pdf_y = (PDF_HEIGHT_PTS * zoom - clickY) / zoom;

    setCalibrateClick({ x: pdf_x, y: pdf_y });
  };

  // Save Coordinate from Calibrate Modal
  const handleSaveCoordinate = async (category, key, rect) => {
    const updated = {
      ...coordinates,
      [category]: {
        ...coordinates[category],
        [key]: {
          ...(coordinates[category][key] || {}),
          rect: rect
        }
      }
    };
    setCoordinates(updated);

    try {
      await fetch(`${API_BASE}/api/config/coordinates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      addToast(`Coordinate for '${key}' saved!`);
    } catch (err) {
      console.error(err);
      addToast('Failed to save coordinates to file', 'error');
    }
  };

  // Dragging fields on canvas
  const handleMouseDownOnField = (fieldKey, e) => {
    if (!isCalibrateMode) return;
    e.stopPropagation();

    const fieldCfg = coordinates?.text_fields?.[fieldKey];
    if (!fieldCfg) return;

    const rect = paperRef.current.getBoundingClientRect();
    const [x1, y1] = fieldCfg.rect;

    // Top-left in screen pixels
    const screenLeft = x1 * zoom;
    const screenTop = (PDF_HEIGHT_PTS - Math.max(fieldCfg.rect[1], fieldCfg.rect[3])) * zoom;

    setDraggingField(fieldKey);
    setDragOffset({
      offsetX: e.clientX - rect.left - screenLeft,
      offsetY: e.clientY - rect.top - screenTop
    });
  };

  const handleMouseMove = (e) => {
    if (!draggingField || !isCalibrateMode) return;

    const rect = paperRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScreenLeft = mouseX - dragOffset.offsetX;
    const newScreenTop = mouseY - dragOffset.offsetY;

    // Convert to PDF bottom-left points
    const fieldCfg = coordinates.text_fields[draggingField];
    const width = Math.abs(fieldCfg.rect[2] - fieldCfg.rect[0]);
    const height = Math.abs(fieldCfg.rect[3] - fieldCfg.rect[1]);

    const new_x1 = Math.max(0, newScreenLeft / zoom);
    const new_y2 = Math.min(PDF_HEIGHT_PTS, (PDF_HEIGHT_PTS * zoom - newScreenTop) / zoom);
    const new_x2 = new_x1 + width;
    const new_y1 = new_y2 - height;

    const updatedCoords = {
      ...coordinates,
      text_fields: {
        ...coordinates.text_fields,
        [draggingField]: {
          ...fieldCfg,
          rect: [parseFloat(new_x1.toFixed(2)), parseFloat(new_y1.toFixed(2)), parseFloat(new_x2.toFixed(2)), parseFloat(new_y2.toFixed(2))]
        }
      }
    };
    setCoordinates(updatedCoords);
  };

  const handleMouseUp = async () => {
    if (draggingField) {
      setDraggingField(null);
      // Persist dragged coordinate
      try {
        await fetch(`${API_BASE}/api/config/coordinates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(coordinates)
        });
        addToast(`Repositioned '${draggingField}'`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Calculate words in Ringkasan Projek
  const wordCount = (formData.ringkasan_projek || '').trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 1. App Navigation Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-badge">USM EPA.002</div>
          <div>
            <div className="brand-title">BHEPA Paperwork Automation</div>
            <div className="brand-subtitle">Visual Form Auto-Filler & Calibration Studio</div>
          </div>
        </div>

        <div className="header-actions">
          <button
            id="calibrate-toggle-btn"
            className={`btn ${isCalibrateMode ? 'btn-gold' : 'btn-secondary'} btn-sm`}
            onClick={() => {
              setIsCalibrateMode(!isCalibrateMode);
              addToast(
                !isCalibrateMode
                  ? 'Calibration Mode ON: Click any checkbox or drag text boxes to fine-tune'
                  : 'Calibration Mode OFF'
              );
            }}
          >
            <Target size={14} />
            {isCalibrateMode ? 'Exit Calibrate' : 'Calibrate / Drag'}
          </button>

          <button id="presets-btn" className="btn btn-secondary btn-sm" onClick={() => setShowSettings(true)}>
            <Settings size={14} /> Presets & API
          </button>

          <button
            id="reset-btn"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (window.confirm('Reset form fields to default profile values?')) {
                setFormData((prev) => ({
                  ...prev,
                  ...profile,
                  tajuk_projek: '',
                  ringkasan_projek: '',
                  cadangan_vip: '',
                  tarikh_projek: '',
                  masa_projek: '',
                  lokasi_projek: '',
                  sasaran_peserta: '30'
                }));
                addToast('Form reset to default presets');
              }
            }}
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </header>

      {/* 2. Split Screen View */}
      <div className="split-container">
        {/* Left Side: Form Editor Panel */}
        <aside className="editor-panel">
          <div className="editor-scroll">
            {/* AI Natural Language Intake Card */}
            <div className="ai-intake-card">
              <div className="ai-header">
                <div className="ai-title-wrap">
                  <Sparkles size={16} color="#c084fc" />
                  <strong style={{ fontSize: '0.9rem', color: '#f3e8ff' }}>AI Natural Language Intake</strong>
                </div>
                <button
                  type="button"
                  id="instant-autofill-badge-btn"
                  className="ai-badge"
                  style={{ cursor: 'pointer', border: 'none' }}
                  onClick={handleAiExtract}
                >
                  Instant Auto-Fill ⚡
                </button>
              </div>

              <textarea
                id="ai-prompt-textarea"
                className="ai-textarea"
                placeholder="Describe your event in plain English/Malay (e.g. Prayer meeting 1 Intentional Prayer on 23 Oct 2026 from 11:30am to 2pm at Bilik Tutorial 150 for 30 people)..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />

              <div className="ai-chips-wrap">
                {SAMPLE_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    id={`sample-chip-${idx}`}
                    className="sample-chip"
                    onClick={() => {
                      setAiPrompt(item.prompt);
                    }}
                  >
                    {item.title}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  id="autofill-btn"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px' }}
                  disabled={isAiLoading}
                  onClick={handleAiExtract}
                >
                  {isAiLoading ? (
                    <>
                      <RefreshCw size={16} className="spinner" /> Analyzing & Generating Malay Summary...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Auto-Fill EPA.002 Form
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Accordion Section 1: Event Details */}
            <div className="form-section">
              <div
                className="section-header"
                onClick={() => toggleSection('event')}
              >
                <div className="section-title-wrap">
                  <Calendar size={18} color="#9333ea" />
                  <span className="section-title">1. Butiran Projek (Event Details)</span>
                </div>
                {openSections.event ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.event && (
                <div className="section-body">
                  <div className="form-group">
                    <label className="form-label">Tajuk Projek (Event Title)</label>
                    <input
                      type="text"
                      name="tajuk_projek"
                      className="form-input"
                      placeholder='e.g. Perjumpaan Berdoa 1 - "Intentional Prayer"'
                      value={formData.tajuk_projek}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Ringkasan Projek (25–40 words Malay summary for BHEPA)</span>
                      <span
                        className="label-hint"
                        style={{
                          color: wordCount >= 25 && wordCount <= 40 ? '#10b981' : '#f59e0b'
                        }}
                      >
                        {wordCount} words
                      </span>
                    </label>
                    <textarea
                      name="ringkasan_projek"
                      className="form-textarea"
                      rows={3}
                      value={formData.ringkasan_projek}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tarikh Projek</label>
                      <input
                        type="text"
                        name="tarikh_projek"
                        className="form-input"
                        placeholder="e.g. 23 Oktober 2026"
                        value={formData.tarikh_projek}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Masa</label>
                      <input
                        type="text"
                        name="masa_projek"
                        className="form-input"
                        placeholder="e.g. 11:30 AM - 14:00 PM"
                        value={formData.masa_projek}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Lokasi Projek</label>
                      <input
                        type="text"
                        name="lokasi_projek"
                        className="form-input"
                        placeholder="e.g. Bilik Tutorial 150"
                        value={formData.lokasi_projek}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sasaran Peserta (Pax)</label>
                      <input
                        type="text"
                        name="sasaran_peserta"
                        className="form-input"
                        placeholder="e.g. 30"
                        value={formData.sasaran_peserta}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Kaedah Pelaksanaan</label>
                    <div className="badge-grid badge-grid-3">
                      {['Fizikal', 'Hibrid', 'Atas Talian'].map((m) => (
                        <div
                          key={m}
                          className={`option-badge ${formData.kaedah_pelaksanaan === m ? 'active' : ''}`}
                          onClick={() => setFormData((p) => ({ ...p, kaedah_pelaksanaan: m }))}
                        >
                          <CheckCircle2 size={14} /> {m}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Penganjuran</label>
                    <div className="badge-grid badge-grid-2">
                      {['Dalam Kampus', 'Luar Kampus'].map((p) => (
                        <div
                          key={p}
                          className={`option-badge ${formData.penganjuran === p ? 'active' : ''}`}
                          onClick={() => setFormData((prev) => ({ ...prev, penganjuran: p }))}
                        >
                          <CheckCircle2 size={14} /> {p}
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.penganjuran === 'Luar Kampus' && (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div className="form-group">
                        <label className="form-label">Nama Pegawai Pengiring</label>
                        <input
                          type="text"
                          name="nama_pegawai_pengiring"
                          className="form-input"
                          value={formData.nama_pegawai_pengiring || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Jawatan</label>
                          <input
                            type="text"
                            name="jawatan_pegawai_pengiring"
                            className="form-input"
                            value={formData.jawatan_pegawai_pengiring || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">PTJ</label>
                          <input
                            type="text"
                            name="ptj_pegawai_pengiring"
                            className="form-input"
                            value={formData.ptj_pegawai_pengiring || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Kutipan Wang</label>
                    <div className="badge-grid badge-grid-2">
                      {['Tidak', 'Ya'].map((k) => (
                        <div
                          key={k}
                          className={`option-badge ${formData.kutipan_wang === k ? 'active' : ''}`}
                          onClick={() => setFormData((prev) => ({ ...prev, kutipan_wang: k }))}
                        >
                          <CheckCircle2 size={14} /> {k === 'Tidak' ? 'Tiada Kutipan' : 'Ada Kutipan'}
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.kutipan_wang === 'Ya' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Jumlah Kutipan (RM)</label>
                        <input
                          type="text"
                          name="kutipan_rm"
                          className="form-input"
                          placeholder="e.g. 10.00"
                          value={formData.kutipan_rm || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Tujuan Kutipan</label>
                        <input
                          type="text"
                          name="tujuan_kutipan"
                          className="form-input"
                          placeholder="e.g. Pembelian bahan makanan"
                          value={formData.tujuan_kutipan || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accordion Section 2: Classification, MyCSD & SDG */}
            <div className="form-section">
              <div
                className="section-header"
                onClick={() => toggleSection('goals')}
              >
                <div className="section-title-wrap">
                  <Award size={18} color="#f59e0b" />
                  <span className="section-title">2. Peringkat, MyCSD & SDG (Penentuan BHEPA)</span>
                </div>
                {openSections.goals ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.goals && (
                <div className="section-body">
                  <div className="form-group">
                    <label className="form-label">Penentuan Peringkat (Pilih 1 sahaja)</label>
                    <div className="badge-grid badge-grid-2">
                      {[
                        { code: 'A', name: 'Antarabangsa' },
                        { code: 'B', name: 'Antara Universiti / Kebangsaan' },
                        { code: 'C', name: 'Universiti / Negeri' },
                        { code: 'D', name: 'Pertubuhan / Pusat Pengajian' }
                      ].map((item) => (
                        <div
                          key={item.code}
                          className={`option-badge ${formData.peringkat === item.code ? 'active' : ''}`}
                          onClick={() => setFormData((p) => ({ ...p, peringkat: item.code }))}
                        >
                          <span className="option-code">{item.code}</span>
                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teras Generik MyCSD (Pilih 1 sahaja)</label>
                    <div className="badge-grid badge-grid-2">
                      {MYCSD_LIST.map((item) => (
                        <div
                          key={item.code}
                          className={`option-badge ${formData.mycsd === item.code ? 'active' : ''}`}
                          onClick={() => setFormData((p) => ({ ...p, mycsd: item.code }))}
                        >
                          <span className="option-code">{item.code}</span>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span>Sustainable Development Goals (Pilih maks 2 sahaja)</span>
                      <span className="label-hint">{formData.sdg.length} / 2 selected</span>
                    </label>
                    <div className="badge-grid badge-grid-3">
                      {SDG_LIST.map((item) => (
                        <div
                          key={item.code}
                          className={`option-badge ${formData.sdg.includes(item.code) ? 'active' : ''}`}
                          onClick={() => toggleSdg(item.code)}
                          style={{ padding: '6px 8px' }}
                        >
                          <span className="option-code">{item.code}</span>
                          <span style={{ fontSize: '0.73rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label.replace(/^\d+\s*/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion Section 3: Society & Applicant Presets */}
            <div className="form-section">
              <div
                className="section-header"
                onClick={() => toggleSection('society')}
              >
                <div className="section-title-wrap">
                  <Compass size={18} color="#06b6d4" />
                  <span className="section-title">3. Butiran Pertubuhan & Pemohon</span>
                </div>
                {openSections.society ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.society && (
                <div className="section-body">
                  <div className="form-group">
                    <label className="form-label">Nama Pertubuhan / Persatuan</label>
                    <input
                      type="text"
                      name="nama_pertubuhan"
                      className="form-input"
                      value={formData.nama_pertubuhan}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Kategori</label>
                      <select
                        name="kategori"
                        className="form-select"
                        value={formData.kategori}
                        onChange={handleInputChange}
                      >
                        <option value="Persatuan">Persatuan</option>
                        <option value="Kelab">Kelab</option>
                        <option value="Majlis">Majlis</option>
                        <option value="Desasiswa">Desasiswa</option>
                        <option value="Anak Negeri">Anak Negeri</option>
                        <option value="Badan Beruniform">Badan Beruniform</option>
                        <option value="Sekretariat">Sekretariat</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Kampus</label>
                      <select
                        name="kampus"
                        className="form-select"
                        value={formData.kampus}
                        onChange={handleInputChange}
                      >
                        <option value="KI">KI - Induk (Penang)</option>
                        <option value="KJ">KJ - Kejuruteraan (Nibong Tebal)</option>
                        <option value="KK">KK - Kesihatan (Kubang Kerian)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Nama Pemohon</label>
                      <input
                        type="text"
                        name="nama_pemohon"
                        className="form-input"
                        value={formData.nama_pemohon}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. KP / Passport</label>
                      <input
                        type="text"
                        name="no_kp"
                        className="form-input"
                        value={formData.no_kp}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Jawatan Pemohon</label>
                      <input
                        type="text"
                        name="jawatan_pemohon"
                        className="form-input"
                        value={formData.jawatan_pemohon}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. Matrik</label>
                      <input
                        type="text"
                        name="no_matrik"
                        className="form-input"
                        value={formData.no_matrik}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Emel Pemohon</label>
                      <input
                        type="email"
                        name="emel_pemohon"
                        className="form-input"
                        value={formData.emel_pemohon}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. Telefon</label>
                      <input
                        type="text"
                        name="no_telefon"
                        className="form-input"
                        value={formData.no_telefon}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Nama Disemak (YDP / SU)</label>
                      <input
                        type="text"
                        name="nama_disemak"
                        className="form-input"
                        value={formData.nama_disemak}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tarikh Disemak</label>
                      <input
                        type="text"
                        name="tarikh_disemak"
                        className="form-input"
                        value={formData.tarikh_disemak}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion Section 4: Manual Signatures */}
            <div className="form-section">
              <div
                className="section-header"
                onClick={() => toggleSection('signatures')}
              >
                <div className="section-title-wrap">
                  <Edit3 size={18} color="#10b981" />
                  <span className="section-title">4. Tandatangan Manual (PNG Signature Upload)</span>
                </div>
                {openSections.signatures ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>

              {openSections.signatures && (
                <div className="section-body">
                  <div className="form-row">
                    {/* Pemohon Signature */}
                    <div className="form-group">
                      <label className="form-label">Tandatangan Pemohon</label>
                      <div className="sig-box">
                        {signatures.signature_pemohon ? (
                          <>
                            <img
                              src={signatures.signature_pemohon}
                              alt="Pemohon Signature"
                              className="sig-preview-img"
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleClearSignature('signature_pemohon')}
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </>
                        ) : (
                          <>
                            <Upload size={20} color="#9ca3af" />
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              PNG Signature
                            </span>
                            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                              Browse Image
                              <input
                                type="file"
                                accept="image/png,image/jpeg"
                                style={{ display: 'none' }}
                                onChange={(e) => handleSignatureUpload('signature_pemohon', e)}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Disemak Signature */}
                    <div className="form-group">
                      <label className="form-label">Tandatangan YDP / SU</label>
                      <div className="sig-box">
                        {signatures.signature_disemak ? (
                          <>
                            <img
                              src={signatures.signature_disemak}
                              alt="Disemak Signature"
                              className="sig-preview-img"
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleClearSignature('signature_disemak')}
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </>
                        ) : (
                          <>
                            <Upload size={20} color="#9ca3af" />
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                              PNG Signature
                            </span>
                            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                              Browse Image
                              <input
                                type="file"
                                accept="image/png,image/jpeg"
                                style={{ display: 'none' }}
                                onChange={(e) => handleSignatureUpload('signature_disemak', e)}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Side: PDF Preview Canvas & Controls */}
        <main
          className="preview-panel"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Top PDF Toolbar */}
          <div className="preview-toolbar">
            <div className="toolbar-group">
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Export Mode:
              </span>
              <div className="mode-toggle">
                <button
                  type="button"
                  id="mode-a-btn"
                  className={`mode-btn ${exportMode === 'editable' ? 'active' : ''}`}
                  onClick={() => setExportMode('editable')}
                >
                  <Edit3 size={13} /> Mode A (Editable Annotations)
                </button>
                <button
                  type="button"
                  id="mode-b-btn"
                  className={`mode-btn ${exportMode === 'flattened' ? 'active' : ''}`}
                  onClick={() => setExportMode('flattened')}
                >
                  <Layers size={13} /> Mode B (Flattened Vector)
                </button>
              </div>
            </div>

            <div className="toolbar-group">
              {isRendering && (
                <span style={{ fontSize: '0.75rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={13} className="spinner" /> Live Rendering...
                </span>
              )}

              <button
                type="button"
                id="download-pdf-btn"
                className="btn btn-primary"
                disabled={isExporting}
                onClick={handleExportPdf}
              >
                {isExporting ? (
                  <>
                    <RefreshCw size={15} className="spinner" /> Generating...
                  </>
                ) : (
                  <>
                    <FileDown size={15} /> Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="canvas-viewport">
            <div
              ref={paperRef}
              className={`pdf-paper ${isCalibrateMode ? 'calibrate-cursor' : ''}`}
              style={{
                width: `${PDF_WIDTH_PTS * zoom}px`,
                height: `${PDF_HEIGHT_PTS * zoom}px`
              }}
              onClick={handlePaperClick}
            >
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="EPA.002 Form Preview"
                  className="pdf-render-img"
                />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  Loading EPA.002 Template...
                </div>
              )}

              {/* Draggable Overlays for calibration mode */}
              {isCalibrateMode && coordinates?.text_fields && (
                <div className="overlay-layer">
                  {Object.entries(coordinates.text_fields).map(([key, item]) => {
                    if (!item.rect) return null;
                    const [x1, y1, x2, y2] = item.rect;
                    const left = Math.min(x1, x2) * zoom;
                    const top = (PDF_HEIGHT_PTS - Math.max(y1, y2)) * zoom;
                    const width = Math.abs(x2 - x1) * zoom;
                    const height = Math.abs(y2 - y1) * zoom;

                    return (
                      <div
                        key={key}
                        className={`draggable-box ${draggingField === key ? 'selected' : ''}`}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${height}px`
                        }}
                        onMouseDown={(e) => handleMouseDownOnField(key, e)}
                        title={`Drag to reposition [${x1.toFixed(1)}, ${y1.toFixed(1)}]`}
                      >
                        <span className="box-tag">
                          {item.label || key}: [{x1.toFixed(0)}, {y1.toFixed(0)}]
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Floating Zoom Control Pill */}
          <div className="floating-zoom">
            <button
              type="button"
              className="zoom-btn"
              title="Zoom Out"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            >
              <ZoomOut size={16} />
            </button>
            <span className="zoom-val">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="zoom-btn"
              title="Zoom In"
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              className="zoom-btn"
              title="Reset Fit (100%)"
              onClick={() => setZoom(1.0)}
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          profile={profile}
          apiKey={geminiApiKey}
          onSaveProfile={handleSaveProfile}
          onSaveApiKey={handleSaveApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Calibrate Modal */}
      {calibrateClick && (
        <CalibrateModal
          clickPoint={calibrateClick}
          coordinates={coordinates}
          onSaveCoordinate={handleSaveCoordinate}
          onClose={() => setCalibrateClick(null)}
        />
      )}

      {/* Toast Feedback */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <CheckCircle2 size={16} color={t.type === 'error' ? '#ef4444' : '#10b981'} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
