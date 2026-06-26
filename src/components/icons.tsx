import type { ReactNode } from 'react';
import { resolveAssetSrc } from '../game/assets';

interface IconButtonProps {
  children: ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}

export function IconButton({ children, className = '', label, onClick }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${className}`.trim()}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface UiImageIconProps {
  alt: string;
  className?: string;
  src: string;
}

export function UiImageIcon({ alt, className = '', src }: UiImageIconProps) {
  return (
    <img
      alt={alt}
      className={`ui-image-icon ${className}`.trim()}
      draggable={false}
      src={resolveAssetSrc(src)}
    />
  );
}

export function BugIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M10 12h12l2 5v5a8 8 0 0 1-16 0v-5l2-5Z"
        fill="#f2dfbf"
        stroke="#6b432e"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
      <path
        d="M11 12 8 7M21 12l3-5M8 17H4M24 17h4M8 22H4M24 22h4M16 13v15M12 20h8"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CupIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 11h15v8a7 7 0 0 1-14 0v-8Z" fill="#fff3dc" stroke="#7a4c31" strokeWidth="2" />
      <path d="M22 13h3a3 3 0 0 1 0 6h-3" fill="none" stroke="#7a4c31" strokeWidth="2" />
      <path d="M8 25h15" stroke="#7a4c31" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 9c-1-2 2-3 1-5" stroke="#d6805e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M10 22h12c-2-2-2-5-2-8a4 4 0 0 0-8 0c0 3 0 6-2 8Z"
        fill="#e8c381"
        stroke="#6b432e"
        strokeWidth="2"
      />
      <path d="M13 25h6" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 8h2" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2" fill="#6b432e" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill="#8fa467" stroke="#5d6b45" strokeWidth="2" />
      <path
        d="M10 16l4 4 8-9"
        fill="none"
        stroke="#fff9ed"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RotateIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M8 11a8 8 0 0 1 13-4l2 2"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M23 4v6h-6"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        fill="#fff3df"
        height="10"
        rx="2"
        stroke="#6b432e"
        strokeWidth="2"
        transform="rotate(-8 16.5 18)"
        width="15"
        x="9"
        y="13"
      />
      <path
        d="M24 21a8 8 0 0 1-13 4l-2-2"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M9 28v-6h6"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PawIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="11" cy="11" r="4" fill="#9f6845" />
      <circle cx="20" cy="10" r="4" fill="#9f6845" />
      <circle cx="7" cy="19" r="4" fill="#9f6845" />
      <circle cx="24" cy="18" r="4" fill="#9f6845" />
      <path d="M10 24c2-6 10-6 12 0 1 4-13 4-12 0Z" fill="#9f6845" />
    </svg>
  );
}

export function BookIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M6 7h8c2 0 3 1 3 3v16c0-2-1-3-3-3H6V7Z"
        fill="#8fa467"
        stroke="#5d6b45"
        strokeWidth="2"
      />
      <path
        d="M26 7h-8c-2 0-3 1-3 3v16c0-2 1-3 3-3h8V7Z"
        fill="#e8cf92"
        stroke="#7a5a30"
        strokeWidth="2"
      />
      <path d="M11 12h3M20 12h3M20 17h3" stroke="#7a5a30" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ShopIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 14h20v13H6V14Z" fill="#d9b07a" stroke="#6b432e" strokeWidth="2" />
      <path d="M4 14 7 6h18l3 8H4Z" fill="#a86b42" stroke="#6b432e" strokeWidth="2" />
      <path d="M13 27v-8h6v8" fill="#6d8544" stroke="#6b432e" strokeWidth="2" />
      <path d="M9 18h3M21 18h3" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LampIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3v7" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 18c1-5 3-8 7-8s6 3 7 8H9Z" fill="#d7a44c" stroke="#6b432e" strokeWidth="2" />
      <path d="M13 20h6" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="24" r="4" fill="#f4d782" opacity="0.8" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="6" fill="#f4be55" />
      <path
        d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l4 4M21 21l4 4M25 7l-4 4M11 21l-4 4"
        stroke="#d89434"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 10h18M7 16h18M7 22h18" stroke="#6b432e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="9" y="7" width="5" height="18" rx="2" fill="#7a4c31" />
      <rect x="18" y="7" width="5" height="18" rx="2" fill="#7a4c31" />
    </svg>
  );
}

export function HeartIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 27S5 20 5 12a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-11 15-11 15Z"
        fill="#df7070"
        stroke="#8b4545"
        strokeWidth="2"
      />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="m16 4 3.4 7 7.7 1.1-5.6 5.4 1.3 7.6L16 21.5l-6.8 3.6 1.3-7.6-5.6-5.4 7.7-1.1L16 4Z"
        fill="#e8bf63"
        stroke="#7a5a30"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function CatHeadIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M7 14 9 5l6 5 6-5 4 9a10 10 0 1 1-18 0Z"
        fill="#f2dfbf"
        stroke="#6b432e"
        strokeWidth="2"
      />
      <circle cx="12" cy="17" r="1.6" fill="#2f231b" />
      <circle cx="20" cy="17" r="1.6" fill="#2f231b" />
      <path d="M13 22q3 3 6 0" stroke="#2f231b" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function LeafIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M6 18c8-9 16-7 20-6-2 8-11 12-20 6Z"
        fill="#8fa467"
        stroke="#5d6b45"
        strokeWidth="2"
      />
      <path d="M8 18c6-1 10-3 15-6" stroke="#5d6b45" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CushionIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <ellipse cx="40" cy="36" rx="30" ry="16" fill="#d97979" stroke="#7a4c31" strokeWidth="4" />
      <path
        d="M15 35c6-11 44-11 50 0"
        fill="none"
        stroke="#e9a0a0"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BedIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <ellipse cx="40" cy="34" rx="30" ry="18" fill="#9a6236" stroke="#593b2b" strokeWidth="4" />
      <ellipse cx="40" cy="34" rx="18" ry="9" fill="#c58b55" />
      <path d="M31 31h18" stroke="#593b2b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function PlantIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <path d="M30 35h22l-4 18H34Z" fill="#a86b42" stroke="#6b432e" strokeWidth="4" />
      <path
        d="M40 36C26 22 23 11 38 15c7 2 7 12 2 21Z"
        fill="#8fa467"
        stroke="#5d6b45"
        strokeWidth="3"
      />
      <path
        d="M42 36c3-18 17-25 22-13-3 11-11 15-22 13Z"
        fill="#6d8544"
        stroke="#5d6b45"
        strokeWidth="3"
      />
    </svg>
  );
}

export function WindowSeatIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <path d="M18 10h44v30H18Z" fill="#f6d996" stroke="#6b432e" strokeWidth="4" />
      <path d="M40 10v30M18 25h44" stroke="#6b432e" strokeWidth="3" />
      <path d="M12 42h56v9H12Z" fill="#9a6236" stroke="#6b432e" strokeWidth="4" />
      <path
        d="M19 43c6-8 36-8 42 0"
        fill="none"
        stroke="#d97979"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HearthIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <path d="M16 24h48v28H16Z" fill="#7a4c31" stroke="#593b2b" strokeWidth="4" />
      <path d="M24 24c2-13 30-13 32 0" fill="#a86b42" stroke="#593b2b" strokeWidth="4" />
      <path
        d="M40 48c-9-8-1-14 0-21 8 7 11 14 0 21Z"
        fill="#f2c66e"
        stroke="#c8793b"
        strokeWidth="3"
      />
      <path d="M30 51h20" stroke="#2f231b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
