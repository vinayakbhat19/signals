import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const festName = process.env.NEXT_PUBLIC_FEST_NAME || 'Fiest 2026';
const collegeName =
  process.env.NEXT_PUBLIC_COLLEGE_NAME ||
  'SDM College of Engineering & Technology, Dharwad';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background:
            'linear-gradient(135deg, #4C1D95 0%, #6D28D9 55%, #7C3AED 100%)',
          color: '#FFFFFF',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            fontSize: 28,
            fontWeight: 600,
            opacity: 0.92,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 9999,
              background: '#34D399',
            }}
          />
          <span>LIVE CAMPUS GUIDE</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>
            {festName}
          </div>
          <div style={{ fontSize: 34, opacity: 0.9, maxWidth: '920px' }}>
            {collegeName}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '24px',
            fontSize: 24,
            opacity: 0.85,
          }}
        >
          <span>Happening Now</span>
          <span>•</span>
          <span>Schedule & Venues</span>
          <span>•</span>
          <span>Live Results</span>
          <span>•</span>
          <span>Signals</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
