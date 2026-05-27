export default function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 36,
            lineHeight: 1.05,
            letterSpacing: '-1px',
            margin: 0,
          }}>
          RadarRank
        </h1>
        <p
          style={{
            color: 'var(--text-dim)',
            marginTop: 12,
            fontSize: 15,
            lineHeight: 1.4,
          }}>
          Open the share link you were sent to score participants.
        </p>
      </div>
    </main>
  );
}
