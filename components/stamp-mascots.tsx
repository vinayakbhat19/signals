import type { StampMascot } from '@/lib/types';
import { cn } from '@/lib/utils';

export const STAMP_MASCOT_COLOR: Record<StampMascot, string> = {
  zap: '#22D3EE',
  beat: '#FF4FA3',
  spark: '#C6FF3D',
  kick: '#FF9F43',
  doodle: '#A78BFA',
  buzz: '#FFE14D',
};

/** Bouncing stamp tool mascot in Hunt header (22-hunt.html) */
export function StampHeaderMascot({
  size = 64,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={cn('stamping shrink-0', className)}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      <path d="M26 8h20v16l9 9v9H17v-9l9-9z" fill="#A78BFA" />
      <rect x="12" y="46" width="48" height="10" rx="3" fill="#FF4FA3" />
      <g className="m-blink">
        <circle cx="31" cy="34" r="3" fill="#0B0A12" />
        <circle cx="41" cy="34" r="3" fill="#0B0A12" />
      </g>
      <path
        d="M32 40c2.5 2 5.5 2 8 0"
        stroke="#0B0A12"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Individual collectible stamp mascot SVG matching 22-hunt.html & 21-stamp-collected.html */
export function StampMascotSvg({
  mascot,
  size = 40,
  celebrating = false,
  className,
}: {
  mascot: StampMascot;
  size?: number;
  celebrating?: boolean;
  className?: string;
}) {
  const color = STAMP_MASCOT_COLOR[mascot] ?? '#C6FF3D';

  return (
    <svg
      className={cn(celebrating && 'jump', className)}
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      {celebrating && (
        <>
          <path
            className="m-wave"
            d="M57 40c7-3 10-10 8-17"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M15 40c-7-3-10-10-8-17"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {mascot === 'zap' && (
        <>
          <path
            d="M18 26l5-6 5 6 5-6 5 6 5-6 5 6 5-6"
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeLinejoin="round"
          />
          <path
            d="M13 48c0-15 10-24 23-24s23 9 23 24c0 9-7 12-23 12S13 57 13 48z"
            fill={color}
          />
          <g className="m-blink">
            <rect x="24" y="38" width="8" height="8" rx="2" fill="#0B0A12" />
            <rect x="40" y="38" width="8" height="8" rx="2" fill="#0B0A12" />
          </g>
          {celebrating && (
            <path d="M29 49c3 5 11 5 14 0z" fill="#0B0A12" />
          )}
        </>
      )}

      {mascot === 'beat' && (
        <>
          <path
            d="M14 48c0-16 9-28 22-28s22 12 22 28c0 9-7 12-22 12S14 57 14 48z"
            fill={color}
          />
          <g className="m-blink">
            <path
              d="M25 42q4-5 8 0M39 42q4-5 8 0"
              stroke="#0B0A12"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </g>
          {celebrating && (
            <ellipse cx="36" cy="51" rx="4.5" ry="3.5" fill="#0B0A12" />
          )}
        </>
      )}

      {mascot === 'spark' && (
        <>
          <path
            d="M13 48c0-15 10-24 23-24s23 9 23 24c0 9-7 12-23 12S13 57 13 48z"
            fill={color}
          />
          <g className="m-blink">
            <circle cx="29" cy="42" r="4" fill="#0B0A12" />
            <circle cx="43" cy="42" r="4" fill="#0B0A12" />
          </g>
          <path
            d="M31 50c3 3 7 3 10 0"
            stroke="#0B0A12"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {mascot === 'kick' && (
        <>
          <rect x="14" y="22" width="44" height="38" rx="12" fill={color} />
          <g className="m-blink">
            <circle
              cx="28"
              cy="40"
              r="5"
              fill="none"
              stroke="#0B0A12"
              strokeWidth="2.6"
            />
            <circle
              cx="44"
              cy="40"
              r="5"
              fill="none"
              stroke="#0B0A12"
              strokeWidth="2.6"
            />
          </g>
          <path
            d="M31 51c3 2.5 7 2.5 10 0"
            stroke="#0B0A12"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {mascot === 'doodle' && (
        <>
          <path d="M36 17V9" stroke={color} strokeWidth="4" strokeLinecap="round" />
          <circle cx="36" cy="8" r="4.5" fill="#C6FF3D" />
          <path
            d="M13 47c0-17 10-30 23-30s23 13 23 30c0 9-7 13-23 13S13 56 13 47z"
            fill={color}
          />
          <g className="m-blink">
            <ellipse cx="29" cy="40" rx="4" ry="5" fill="#0B0A12" />
            <ellipse cx="43" cy="40" rx="4" ry="5" fill="#0B0A12" />
          </g>
          <path
            d="M31 49c3 3.5 7 3.5 10 0"
            stroke="#0B0A12"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}

      {mascot === 'buzz' && (
        <>
          <path
            d="M14 48c0-16 9-28 22-28s22 12 22 28c0 9-7 12-22 12S14 57 14 48z"
            fill={color}
          />
          <g className="m-blink">
            <circle cx="28" cy="41" r="4" fill="#0B0A12" />
            <circle cx="44" cy="41" r="4" fill="#0B0A12" />
          </g>
          <path
            d="M30 50h12"
            stroke="#0B0A12"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
