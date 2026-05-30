import { ImageResponse } from 'next/og';

// Next.js picks this up automatically as og:image and twitter:image. Rendered
// at build/request time as a 1200×630 PNG via @vercel/satori.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'RadarRank — collaborative radar-chart evaluations';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 50% 35%, #1C1C2E 0%, #08080C 70%)',
          color: '#F5F5F7',
          fontFamily: 'sans-serif',
        }}>
        <div
          style={{
            fontSize: 64,
            letterSpacing: 8,
            color: '#E8FF6B',
            textTransform: 'uppercase',
          }}>
          RadarRank
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 40,
            maxWidth: 880,
            textAlign: 'center',
            color: '#9C9CAB',
            lineHeight: 1.2,
          }}>
          Score participants for a shared evaluation.
        </div>
      </div>
    ),
    { ...size },
  );
}
