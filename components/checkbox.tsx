'use client';

import React, { useEffect, useState } from 'react';

interface CheckboxProps {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

export function Checkbox({
  id,
  name,
  value,
  checked,
  defaultChecked,
  disabled,
  onChange,
  className = '',
}: CheckboxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [internalChecked, setInternalChecked] = useState<boolean>(() => !!defaultChecked);

  useEffect(() => {
    if (typeof checked === 'boolean') {
      setInternalChecked(checked);
    }
  }, [checked]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof checked !== 'boolean') {
      setInternalChecked(e.target.checked);
    }
    onChange?.(e);
  };

  const baseClasses =
    'inline-flex items-center justify-center align-middle select-none';
  const focusClasses = isFocused
    ? 'ring-2 ring-offset-2 ring-offset-background ring-primary'
    : '';
  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  const isChecked = internalChecked;

  return (
    <span
      className={`${baseClasses} ${focusClasses} ${disabledClasses} ${className}`}
      style={{ lineHeight: 1 }}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        value={value}
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      <svg
        viewBox="0 0 64 64"
        height="1.25em"
        width="1.25em"
        aria-hidden="true"
        focusable="false"
        className="block shrink-0"
      >
        <path
          d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16"
          pathLength={575.0541381835938}
          style={{
            fill: 'none',
            stroke: isChecked ? 'rgb(59, 130, 246)' : 'rgb(71, 85, 105)',
            strokeWidth: 6,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease',
            strokeDasharray: isChecked
              ? '70.5096664428711 9999999'
              : '241 9999999',
            strokeDashoffset: isChecked ? -262.2723388671875 : 0,
          }}
        />
      </svg>
    </span>
  );
}