import React, { useState, useRef, useCallback } from 'react';
import type { BackgroundOption } from '../utils/canvas';

interface BackgroundPickerProps {
  value: BackgroundOption;
  onChange: (bg: BackgroundOption) => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'White', color: '#ffffff' },
  { label: 'Black', color: '#000000' },
  { label: 'Gray', color: '#9ca3af' },
  { label: 'Blue', color: '#3b82f6' },
  { label: 'Green', color: '#22c55e' },
  { label: 'Red', color: '#ef4444' },
];

const BackgroundPicker: React.FC<BackgroundPickerProps> = ({ value, onChange, disabled = false }) => {
  const [customColor, setCustomColor] = useState('#6366f1');
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageBg = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const imageUrl = URL.createObjectURL(file);
      onChange({ type: 'image', file, imageUrl });
      e.target.value = '';
    },
    [onChange],
  );

  const isActive = (bg: BackgroundOption): boolean => {
    if (bg.type === 'transparent' && value.type === 'transparent') return true;
    if (bg.type === 'color' && value.type === 'color' && bg.value === value.value) return true;
    return false;
  };

  return (
    <div className="bg-picker">
      <span className="bg-picker-label">Background:</span>

      {/* Transparent swatch */}
      <button
        className={`bg-swatch transparent ${isActive({ type: 'transparent' }) ? 'active' : ''}`}
        title="Transparent"
        onClick={() => onChange({ type: 'transparent' })}
        disabled={disabled}
      />

      {/* Preset color swatches */}
      {PRESET_COLORS.filter((c): c is { label: string; color: string } => !!c.color).map(({ color, label }) => (
        <button
          key={color}
          className={`bg-swatch ${isActive({ type: 'color', value: color }) ? 'active' : ''}`}
          style={{ backgroundColor: color }}
          title={label}
          onClick={() => onChange({ type: 'color', value: color })}
          disabled={disabled}
        />
      ))}

      {/* Custom color input */}
      <input
        className="bg-color-input"
        type="color"
        value={value.type === 'color' ? value.value : customColor}
        onChange={(e) => {
          setCustomColor(e.target.value);
          onChange({ type: 'color', value: e.target.value });
        }}
        disabled={disabled}
        title="Custom color"
      />

      {/* Background image upload */}
      <button
        className="bg-image-btn"
        onClick={() => imageInputRef.current?.click()}
        disabled={disabled}
      >
        🏞 Image
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageBg}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default BackgroundPicker;
