import React, { useState } from 'react';
import { X, Save, Key, User, ShieldCheck } from 'lucide-react';

export default function SettingsModal({ profile, onSaveProfile, apiKey, onSaveApiKey, onClose }) {
  const [formData, setFormData] = useState({ ...profile });
  const [geminiKey, setGeminiKey] = useState(apiKey || '');
  const [showKey, setShowKey] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSaveProfile(formData);
    onSaveApiKey(geminiKey);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="brand-section">
            <User size={20} color="#c084fc" />
            <h2 className="modal-title">Saved Presets & API Config</h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Gemini API Key Section */}
          <div className="form-group" style={{ background: 'rgba(147, 51, 234, 0.08)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(147, 51, 234, 0.2)' }}>
            <label className="form-label" style={{ color: '#e9d5ff' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={14} /> Google Gemini API Key (Optional)
              </span>
              <span className="label-hint">For live Gemini-2.5 Flash</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input
                type={showKey ? 'text' : 'password'}
                className="form-input"
                style={{ flex: 1 }}
                placeholder="AIzaSy... (leave blank to use smart offline extractor)"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '4px' }}>
              Built-in intelligent USM BHEPA heuristic parser operates automatically when no key is provided.
            </div>
          </div>

          <h3 style={{ fontSize: '0.85rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>
            Organization & Applicant Defaults
          </h3>

          <div className="form-group">
            <label className="form-label">Nama Pertubuhan / Kelab</label>
            <input
              type="text"
              name="nama_pertubuhan"
              className="form-input"
              value={formData.nama_pertubuhan || ''}
              onChange={handleChange}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select
                name="kategori"
                className="form-select"
                value={formData.kategori || 'Persatuan'}
                onChange={handleChange}
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
                value={formData.kampus || 'KI'}
                onChange={handleChange}
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
                value={formData.nama_pemohon || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">No. Kad Pengenalan / Pasport</label>
              <input
                type="text"
                name="no_kp"
                className="form-input"
                value={formData.no_kp || ''}
                onChange={handleChange}
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
                value={formData.jawatan_pemohon || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">No. Matrik</label>
              <input
                type="text"
                name="no_matrik"
                className="form-input"
                value={formData.no_matrik || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Emel Rasmi Pemohon</label>
              <input
                type="email"
                name="emel_pemohon"
                className="form-input"
                value={formData.emel_pemohon || ''}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">No. Telefon</label>
              <input
                type="text"
                name="no_telefon"
                className="form-input"
                value={formData.no_telefon || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Nama Disemak (YDP / SU Pertubuhan)</label>
            <input
              type="text"
              name="nama_disemak"
              className="form-input"
              value={formData.nama_disemak || ''}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> Save Presets
          </button>
        </div>
      </div>
    </div>
  );
}
