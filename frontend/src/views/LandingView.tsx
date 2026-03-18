import { Link } from 'react-router-dom';

function StepIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <rect x="1"  y="24" width="10" height="11" rx="2" fill="currentColor"/>
      <rect x="14" y="15" width="10" height="20" rx="2" fill="currentColor"/>
      <rect x="27" y="6"  width="8"  height="29" rx="2" fill="currentColor"/>
    </svg>
  );
}

const FEATURES = [
  {
    icon: '📋',
    title: '工程ごとに整理',
    body: '作業の手順をステップに分解して記録。並べ替えや途中挿入も自由自在。',
  },
  {
    icon: '📷',
    title: '写真で伝える',
    body: '現場写真を追加し、トリミング・矢印注釈で見どころをピンポイントに伝える。',
  },
  {
    icon: '💡',
    title: 'ポイントを強調',
    body: '「！注意」「Point!」「メモ」のハイライトで、読み飛ばしてほしくない箇所を目立たせる。',
  },
  {
    icon: '🔍',
    title: 'すぐに見つける',
    body: 'カテゴリ・タグ・キーワード検索で、必要なマニュアルをいつでもすぐに参照。',
  },
];

const USER_TYPES = [
  {
    role: 'つくる人へ',
    desc: 'できるだけ手間をかけずに、社員に伝わる手順書を作りたい方のために。写真を撮って、工程を並べるだけで、プロらしいマニュアルが完成します。',
  },
  {
    role: '使う人へ',
    desc: '作業中に確認したいとき、ヒントが欲しいとき、すぐに開いて読める。現場で見やすいレイアウトで、ミスを防ぐサポートをします。',
  },
];

export function LandingView() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f172a', color: 'white' }}>

      {/* ナビゲーション */}
      <header className="flex items-center justify-between px-8 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <StepIcon className="w-8 h-8 text-blue-400" />
          <span className="text-lg font-bold tracking-tight">SETSU-MAKER</span>
        </div>
        <Link
          to="/app"
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: '#2563eb', color: 'white' }}
        >
          アプリを開く →
        </Link>
      </header>

      {/* ヒーロー */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 flex-1" style={{ minHeight: '70vh' }}>
        <div className="mb-8 flex items-center justify-center">
          <StepIcon className="w-20 h-20 text-blue-400" />
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-4 leading-tight">
          SETSU-MAKER
        </h1>
        <p className="text-2xl font-light mb-3" style={{ color: '#93c5fd' }}>
          現場の知識を、かたちにする。
        </p>
        <p className="text-base max-w-xl mb-10 leading-relaxed" style={{ color: '#94a3b8' }}>
          写真と工程で、伝わる作業マニュアルをすばやく作成。<br />
          製造現場で使われる手順書を、誰でも簡単に作れます。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/app"
            className="px-8 py-3.5 rounded-xl text-base font-bold transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#2563eb', color: 'white' }}
          >
            アプリを開く
          </Link>
          <a
            href="#features"
            className="px-8 py-3.5 rounded-xl text-base font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            機能を見る ↓
          </a>
        </div>
      </section>

      {/* 機能紹介 */}
      <section id="features" style={{ background: '#f8fafc', color: '#0f172a' }} className="px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2" style={{ color: '#1e293b' }}>主な機能</h2>
          <p className="text-center text-sm mb-12" style={{ color: '#64748b' }}>
            現場の声から生まれた、シンプルで使いやすい機能セット。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6"
                style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="text-base font-bold mb-1.5" style={{ color: '#1e293b' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 対象ユーザー */}
      <section style={{ background: 'white', color: '#0f172a' }} className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12" style={{ color: '#1e293b' }}>こんな方へ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {USER_TYPES.map((u) => (
              <div
                key={u.role}
                className="rounded-2xl p-6"
                style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
              >
                <div
                  className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4"
                  style={{ background: '#dbeafe', color: '#1d4ed8' }}
                >
                  {u.role}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: '#1e3a5f', color: 'white' }}
      >
        <StepIcon className="w-12 h-12 text-blue-300 mx-auto mb-5" />
        <h2 className="text-2xl font-bold mb-3">さっそく使ってみる</h2>
        <p className="text-sm mb-8" style={{ color: '#93c5fd' }}>
          ログイン不要・すぐに始められます
        </p>
        <Link
          to="/app"
          className="inline-block px-10 py-3.5 rounded-xl text-base font-bold transition-all hover:opacity-90 active:scale-95"
          style={{ background: '#2563eb', color: 'white' }}
        >
          アプリを開く →
        </Link>
      </section>

      {/* フッター */}
      <footer
        className="text-center text-xs py-6"
        style={{ background: '#0f172a', color: '#475569', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        © 2026 藤田建具店　|　SETSU-MAKER
      </footer>
    </div>
  );
}
