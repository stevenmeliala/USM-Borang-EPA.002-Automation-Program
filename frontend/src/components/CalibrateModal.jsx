import React, { useState } from 'react';
import { Target, X, Check, Save } from 'lucide-react';

export default function CalibrateModal({ clickPoint, coordinates, onSaveCoordinate, onClose }) {
  const [selectedTarget, setSelectedTarget] = useState('');
  const [targetType, setTargetType] = useState('checkboxes'); // 'checkboxes', 'text_fields', 'widgets'
  const [boxWidth, setBoxWidth] = useState(20);
  const [boxHeight, setBoxHeight] = useState(11);

  if (!clickPoint) return null;

  const currentOptions = coordinates ? Object.keys(coordinates[targetType] || {}) : [];

  const handleApply = () => {
    if (!selectedTarget) return;

    // Calculate [x1, y1, x2, y2]
    // clickPoint.x and clickPoint.y represent bottom-left click point
    const x1 = parseFloat(clickPoint.x.toFixed(2));
    const y1 = parseFloat(clickPoint.y.toFixed(2));
    const x2 = parseFloat((x1 + parseFloat(boxWidth)).toFixed(2));
    const y2 = parseFloat((y1 + parseFloat(boxHeight)).toFixed(2));

    onSaveCoordinate(targetType, selectedTarget, [x1, y1, x2, y2]);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="brand-section">
            <Target size={20} color="#f59e0b" />
            <h2 className="modal-title">Coordinate Calibration Clicker</h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="calibration-banner">
            <div>
              <strong>Captured PDF Coordinate:</strong>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginTop: '2px' }}>
                X: {clickPoint.x.toFixed(2)} pt, Y: {clickPoint.y.toFixed(2)} pt (Bottom-Left)
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="mode-toggle" style={{ width: '100%', display: 'flex' }}>
              <button
                type="button"
                className={`mode-btn ${targetType === 'checkboxes' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setTargetType('checkboxes'); setSelectedTarget(''); setBoxWidth(20); setBoxHeight(11); }}
              >
                Checkbox
              </button>
              <button
                type="button"
                className={`mode-btn ${targetType === 'text_fields' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setTargetType('text_fields'); setSelectedTarget(''); setBoxWidth(150); setBoxHeight(14); }}
              >
                Text Field
              </button>
              <button
                type="button"
                className={`mode-btn ${targetType === 'widgets' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setTargetType('widgets'); setSelectedTarget(''); setBoxWidth(90); setBoxHeight(32); }}
              >
                Signature
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Map to Item</label>
            <select
              className="form-select"
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
            >
              <option value="">-- Choose item to calibrate --</option>
              {currentOptions.map((key) => {
                const item = coordinates[targetType][key];
                return (
                  <option key={key} value={key}>
                    {item.label || key}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Width (points)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={boxWidth}
                onChange={(e) => setBoxWidth(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Height (points)</label>
              <input
                type="number"
                step="0.5"
                className="form-input"
                value={boxHeight}
                onChange={(e) => setBoxHeight(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-gold"
            disabled={!selectedTarget}
            onClick={handleApply}
          >
            <Save size={16} /> Apply & Save Coordinate
          </button>
        </div>
      </div>
    </div>
  );
}
