'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          background: '#f7f7f5',
          color: '#261a14',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>一時的な問題が発生しました</h1>
        <p style={{ fontSize: '14px', margin: 0, opacity: 0.8 }}>
          お手数ですが、再読み込みしてください。入力中のデータは保存されている場合があります。
        </p>
        {/* eslint-disable-next-line local/no-raw-button -- global-error は globals.css 未読込のため UI コンポーネント使用不可 */}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            minHeight: '44px',
            padding: '0 20px',
            borderRadius: '12px',
            border: 'none',
            background: '#e48003',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          再読み込み
        </button>
      </body>
    </html>
  );
}
