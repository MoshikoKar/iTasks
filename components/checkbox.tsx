'use client';

import React from 'react';

interface CheckboxProps {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function Checkbox({ id, name, value, checked, defaultChecked, onChange, className = '' }: CheckboxProps) {
  return (
    <span className={`container ${className}`} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', lineHeight: 1, margin: 0, padding: 0 }}>
      <input
        type="checkbox"
        id={id}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        style={{
          display: 'none',
          visibility: 'hidden',
          opacity: 0,
          position: 'absolute',
          width: 0,
          height: 0,
          margin: 0,
          padding: 0,
          pointerEvents: 'none',
        }}
      />
      <svg viewBox="0 0 64 64" height="1.25em" width="1.25em" style={{ overflow: 'visible', display: 'block', flexShrink: 0, margin: 0, padding: 0 }}>
        <path
          d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16"
          pathLength="575.0541381835938"
          className="path"
        />
      </svg>
    </span>
  );
}
