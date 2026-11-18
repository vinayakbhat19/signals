import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const festName = process.env.NEXT_PUBLIC_FEST_NAME || "Fiesta'26";
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
          background: '#0B0A12',
          color: '#F4F2FA',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              background: '#C6FF3D',
              color: '#0B0A12',
              padding: '10px 22px',
              borderRadius: 9999,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '0.06em',
            }}
          >
            FEST.LIVE · LIVE CAMPUS GUIDE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 1.0,
              color: '#F4F2FA',
            }}
          >
            {festName}
          </div>
          <div style={{ fontSize: 34, color: '#9C97B0', maxWidth: '920px' }}>
            {collegeName}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '16px',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              background: '#FF4FA3',
              color: '#0B0A12',
              padding: '8px 18px',
              borderRadius: 9999,
            }}
          >
            Happening Now
          </span>
          <span
            style={{
              background: '#22D3EE',
              color: '#0B0A12',
              padding: '8px 18px',
              borderRadius: 9999,
            }}
          >
            Events & Venues
          </span>
          <span
            style={{
              background: '#C6FF3D',
              color: '#0B0A12',
              padding: '8px 18px',
              borderRadius: 9999,
            }}
          >
            Audience Vote
          </span>
          <span
            style={{
              background: '#A78BFA',
              color: '#0B0A12',
              padding: '8px 18px',
              borderRadius: 9999,
            }}
          >
            Stamp Hunt
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
