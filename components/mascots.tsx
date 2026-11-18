import { cn } from '@/lib/utils';

interface MascotProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

/** Violet bobbing alien mascot with lime antenna (Header & Add-to-Home bar) */
export function AlienMascot({
  size = 40,
  className,
  animate = true,
}: MascotProps) {
  return (
    <svg
      className={cn(animate && 'm-bob', className)}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      <path
        className={animate ? 'm-wave' : undefined}
        d="M56 42c6-3 9-9 8-15"
        stroke="#A78BFA"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M36 17V9"
        stroke="#A78BFA"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="36" cy="8" r="4.5" fill="#C6FF3D" />
      <path
        d="M13 47c0-17 10-30 23-30s23 13 23 30c0 9-7 13-23 13S13 56 13 47z"
        fill="#A78BFA"
      />
      <g className={animate ? 'm-blink' : undefined}>
        <ellipse cx="29" cy="40" rx="4.2" ry="5.2" fill="#0B0A12" />
        <ellipse cx="43" cy="40" rx="4.2" ry="5.2" fill="#0B0A12" />
      </g>
      <path
        d="M31 49c3 3.5 7 3.5 10 0"
        stroke="#0B0A12"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Yellow headphone music mascot (Featured Live Cultural card) */
export function MusicMascot({
  size = 112,
  className,
  animate = true,
}: MascotProps) {
  return (
    <svg
      className={cn(animate && 'm-wiggle', className)}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      <path d="M15 34a21 21 0 0 1 42 0" stroke="#0B0A12" strokeWidth="4" fill="none" />
      <rect x="10" y="32" width="9" height="14" rx="4" fill="#0B0A12" />
      <rect x="53" y="32" width="9" height="14" rx="4" fill="#0B0A12" />
      <path
        d="M14 48c0-16 9-28 22-28s22 12 22 28c0 9-7 12-22 12S14 57 14 48z"
        fill="#FFE14D"
      />
      <g className={animate ? 'm-blink' : undefined}>
        <path
          d="M25 42q4-5 8 0M39 42q4-5 8 0"
          stroke="#0B0A12"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
      <ellipse cx="36" cy="51" rx="4" ry="3" fill="#0B0A12" />
      <path
        d="M62 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"
        fill="#0B0A12"
      />
    </svg>
  );
}

/** Cyan spiky-hair coding mascot (Secondary Live cards) */
export function TechMascot({
  size = 52,
  className,
  animate = true,
}: MascotProps) {
  return (
    <svg
      className={cn(animate && 'm-bob', className)}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      <path
        d="M18 26l5-6 5 6 5-6 5 6 5-6 5 6 5-6"
        stroke="#22D3EE"
        strokeWidth="3"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M13 48c0-15 10-24 23-24s23 9 23 24c0 9-7 12-23 12S13 57 13 48z"
        fill="#22D3EE"
      />
      <g className={animate ? 'm-blink' : undefined}>
        <rect x="24" y="38" width="8" height="8" rx="2" fill="#0B0A12" />
        <rect x="40" y="38" width="8" height="8" rx="2" fill="#0B0A12" />
      </g>
      <path
        d="M30 52h12"
        stroke="#0B0A12"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Lime + Orange duo mascots (Stamp Hunt card) */
export function HuntMascots({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center shrink-0', className)} aria-hidden="true">
      <svg className="m-bob" width="44" height="44" viewBox="0 0 72 72">
        <path
          d="M13 48c0-15 10-24 23-24s23 9 23 24c0 9-7 12-23 12S13 57 13 48z"
          fill="#C6FF3D"
        />
        <g className="m-blink">
          <circle cx="29" cy="42" r="4" fill="#0B0A12" />
          <circle cx="43" cy="42" r="4" fill="#0B0A12" />
        </g>
        <path
          d="M31 51c3 3 7 3 10 0"
          stroke="#0B0A12"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="m-bob -ml-3.5"
        style={{ animationDelay: '0.5s' }}
        width="44"
        height="44"
        viewBox="0 0 72 72"
      >
        <rect x="14" y="22" width="44" height="38" rx="12" fill="#FF9F43" />
        <g className="m-blink">
          <circle cx="28" cy="40" r="4" fill="#0B0A12" />
          <circle cx="44" cy="40" r="4" fill="#0B0A12" />
        </g>
        <path
          d="M31 50c3 2.5 7 2.5 10 0"
          stroke="#0B0A12"
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
