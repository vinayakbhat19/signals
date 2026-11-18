import Image from 'next/image';
import type { EventCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

interface EventCoverProps {
  title: string;
  category: EventCategory;
  coverUrl?: string | null;
  variant?: 'thumb' | 'hero';
  className?: string;
}

const CATEGORY_BG: Record<EventCategory, string> = {
  cultural: '#FF4FD8',
  tech: '#22D3EE',
  workshop: '#FF9F43',
  talk: '#9B6CFF',
  sports: '#FFD60A',
  fun: '#FFE14D',
  official: '#3A3549',
};

function CategoryThumbSvg({
  category,
  title,
}: {
  category: EventCategory;
  title: string;
}) {
  const bg = CATEGORY_BG[category];

  return (
    <svg
      width="82"
      height="82"
      viewBox="0 0 82 82"
      role="img"
      aria-label={`Cover art: ${title}`}
      className="size-full"
    >
      <rect width="82" height="82" rx="16" fill={bg} />
      {category === 'cultural' && (
        <>
          <path d="M20 0L8 70h24z" fill="#FFE14D" opacity="0.55" />
          <path d="M62 0L50 70h24z" fill="#FFE14D" opacity="0.55" />
          <rect x="0" y="66" width="82" height="16" fill="#12091E" />
          <path d="M30 64l8-30 4 1-6 29z" fill="#12091E" />
          <circle cx="36" cy="30" r="6" fill="#12091E" />
        </>
      )}
      {category === 'tech' && (
        <>
          <rect x="16" y="22" width="50" height="32" rx="4" fill="#12091E" />
          <rect x="10" y="56" width="62" height="6" rx="3" fill="#12091E" />
          <path
            d="M30 32l-5 6 5 6M52 32l5 6-5 6M44 30l-6 16"
            stroke="#FFD60A"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {category === 'workshop' && (
        <>
          <path d="M48 16L26 38l8 8 22-22z" fill="#12091E" />
          <path d="M34 46l14 14 8-8-14-14z" fill="#22D3EE" />
          <circle cx="58" cy="58" r="6" fill="#12091E" />
        </>
      )}
      {category === 'talk' && (
        <>
          <circle cx="41" cy="26" r="11" fill="#12091E" />
          <path d="M34 26h14M34 22h14M34 30h14" stroke="#9B6CFF" strokeWidth="1.5" />
          <rect x="38" y="36" width="6" height="16" rx="2" fill="#12091E" />
          <path d="M30 50c0 8 22 8 22 0" stroke="#12091E" strokeWidth="3" fill="none" />
          <path d="M41 58v10M32 68h18" stroke="#12091E" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {category === 'sports' && (
        <>
          <path d="M24 20h34v14c0 10-7 17-17 17s-17-7-17-17V20z" fill="#12091E" />
          <path d="M24 26h-8c0 9 4 14 8 14M58 26h8c0 9-4 14-8 14" stroke="#12091E" strokeWidth="4" fill="none" />
          <path d="M41 51v10M30 61h22" stroke="#12091E" strokeWidth="4.5" strokeLinecap="round" />
        </>
      )}
      {category === 'fun' && (
        <>
          <path
            d="M41 16l6 15 16 2-12 11 3 16-13-8-13 8 3-16-12-11 16-2z"
            fill="#12091E"
          />
          <circle cx="41" cy="40" r="6" fill="#FF4FD8" />
        </>
      )}
      {category === 'official' && (
        <>
          <path
            d="M16 60h50M22 60V34M60 60V34M41 20l26 14H15z"
            stroke="#BDB8CF"
            strokeWidth="4"
            fill="none"
            strokeLinejoin="round"
          />
          <path d="M34 60V42h14v18" stroke="#BDB8CF" strokeWidth="4" fill="none" />
        </>
      )}
    </svg>
  );
}

function CategoryHeroSvg({
  category,
  title,
}: {
  category: EventCategory;
  title: string;
}) {
  const bg = CATEGORY_BG[category];

  return (
    <svg
      viewBox="0 0 390 260"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Cover photo: ${title}`}
      className="h-full w-full block"
    >
      <rect width="390" height="260" fill={bg} />
      <path className="beam" d="M90 0L40 225h100z" fill="#FFE14D" opacity="0.4" />
      <path
        className="beam"
        d="M300 0L250 225h100z"
        fill="#FFFFFF"
        opacity="0.25"
        style={{ animationDelay: '0.8s' }}
      />
      <circle className="twinkle" cx="44" cy="42" r="3" fill="#F4F2FA" />
      <circle
        className="twinkle"
        cx="346"
        cy="58"
        r="3"
        fill="#F4F2FA"
        style={{ animationDelay: '0.6s' }}
      />
      <circle
        className="twinkle"
        cx="196"
        cy="30"
        r="2.5"
        fill="#F4F2FA"
        style={{ animationDelay: '1.2s' }}
      />
      <circle cx="195" cy="108" r="26" fill="#12091E" />
      <path d="M181 108h28M181 100h28M181 116h28" stroke={bg} strokeWidth="2" />
      <rect x="189" y="132" width="12" height="34" rx="4" fill="#12091E" />
      <path d="M176 160c0 18 38 18 38 0" stroke="#12091E" strokeWidth="5" fill="none" />
      <path d="M195 178v24" stroke="#12091E" strokeWidth="5" />
      <rect y="210" width="390" height="50" fill="#12091E" />
      <circle cx="30" cy="218" r="14" fill="#3B2758" />
      <circle cx="80" cy="222" r="14" fill="#3B2758" />
      <circle cx="130" cy="218" r="14" fill="#3B2758" />
      <circle cx="260" cy="220" r="14" fill="#3B2758" />
      <circle cx="310" cy="218" r="14" fill="#3B2758" />
      <circle cx="360" cy="222" r="14" fill="#3B2758" />
    </svg>
  );
}

export function EventCover({
  title,
  category,
  coverUrl,
  variant = 'thumb',
  className,
}: EventCoverProps) {
  const hasRealCover =
    typeof coverUrl === 'string' &&
    (coverUrl.startsWith('https://') || coverUrl.startsWith('/'));

  if (variant === 'hero') {
    return (
      <div
        className={cn(
          'relative h-[250px] sm:h-[280px] w-full overflow-hidden bg-[#1F1230]',
          className
        )}
      >
        {hasRealCover ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        ) : (
          <CategoryHeroSvg category={category} title={title} />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative size-[82px] shrink-0 overflow-hidden rounded-[16px] bg-[#2A1840]',
        className
      )}
    >
      {hasRealCover ? (
        <Image
          src={coverUrl}
          alt={title}
          fill
          sizes="82px"
          className="object-cover"
        />
      ) : (
        <CategoryThumbSvg category={category} title={title} />
      )}
    </div>
  );
}
