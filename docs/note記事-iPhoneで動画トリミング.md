# iPhoneでも動く！ブラウザだけで動画トリミングを実装する方法（Mediabunny）

## はじめに

PWAアプリで「動画をアップロード前にブラウザ内でトリミングしたい」という要件を実装しました。PCではすんなり動いたのですが、**iPhoneで動かすまでに相当苦労した**ので、同じハマりを避けるために記録を残します。

結論から言うと、**Mediabunny**というライブラリを使えば、iPhone（iOS Safari）でも安定して動画トリミングができます。しかもロスレス（再エンコードなし）で高速です。

## 環境

- React + TypeScript + Vite
- ConoHa共有ホスティング（Apache）
- 対象ブラウザ: iOS Safari, Chrome Mobile, PC Chrome

## 試したこと（全部ダメだった）

### ❌ 方法1: FFmpeg.wasm

最初に試したのがFFmpeg.wasmです。PC上のNode.jsでは定番のFFmpegをブラウザで動かせるWASMビルド。

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

**結果: 共有ホスティングでは動かない。**

FFmpeg.wasmは**SharedArrayBuffer**を必要とします。これを使うにはサーバーが以下のHTTPヘッダーを返す必要があります:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

共有ホスティング（ConoHa, さくら, ロリポップ等）ではこのヘッダーを設定できません。そしてiOS Safariは`SharedArrayBuffer`のサポートが限定的です。

**教訓: 共有ホスティング + iPhone を対象にするなら、FFmpeg.wasmは選択肢から外す。**

---

### ❌ 方法2: MediaRecorder + video.captureStream()

次に試したのがブラウザ標準APIだけで完結する方法です。

```typescript
// 動画をvideo要素で再生し、そのストリームをMediaRecorderで録画する
const video = document.createElement('video');
video.src = URL.createObjectURL(file);
const stream = video.captureStream();
const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
```

**結果: PCでは動くが、iPhoneでは先頭0.1秒だけ再生されて残りが静止画になる。**

原因は複数あります:

1. **WebMのキーフレーム問題**: MediaRecorderが出力するWebMは、最初のチャンクにしかキーフレームが入らないことがある。再生時にデコーダーがキーフレーム以降のフレームを復元できない。

2. **captureStream()の不安定さ**: モバイルブラウザでは、video要素のフレームデコードがブラウザの内部スケジューラに依存しており、`captureStream()`が全フレームをキャプチャできない。

3. **DOM外のvideo要素の制約**: `document.createElement('video')`で作ったvideo要素をDOMに追加しないと、モバイルブラウザがフレームデコードを省略する場合がある。

---

### ❌ 方法3: Canvas経由のキャプチャ

captureStream()の問題を回避するため、Canvasに毎フレーム描画してからCanvasのストリームを録画する方法も試しました。

```typescript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const canvasStream = canvas.captureStream(30);
const recorder = new MediaRecorder(canvasStream);

// requestAnimationFrameで毎フレーム描画
function draw() {
  ctx.drawImage(video, 0, 0);
  requestAnimationFrame(draw);
}
```

**結果: 同じ症状。先頭だけ動いて残りは静止画。**

Canvas経由にしても、結局MediaRecorderのWebM出力に構造的な問題があります。パッチを重ねても「あるデバイスでは動くが別のデバイスでは壊れる」状態が続きました。

**教訓: MediaRecorder + captureStream() / canvas.captureStream() は、モバイルでの動画トリミングには使えない。**

---

## ✅ 解決策: Mediabunny

### Mediabunnyとは

[Mediabunny](https://github.com/Vanilagy/mediabunny)は、ブラウザ上で動画ファイルを変換・トリミングするためのライブラリです。有名なmp4-muxer / webm-muxerの後継プロジェクトです。

**特徴:**
- **ロスレスremux**: MP4(H.264) → MP4の場合、再エンコードせずにデータをそのままコピー。画質劣化なし、超高速
- **SharedArrayBuffer不要**: WebCodecsベースだが、SABに依存しない
- **iOS Safari対応**: 確認済み
- **軽量**: tree-shaking込みで16〜30KB gzipped
- **TypeScript製**: 型定義完備

### インストール

```bash
npm install mediabunny
```

### 実装コード（全文）

```typescript
import {
  Conversion,
  Input,
  Output,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  ALL_FORMATS,
} from 'mediabunny';

interface TrimResult {
  blob: Blob;
  duration: number;
}

async function trimVideo(
  source: Blob,
  startTime: number,
  endTime: number,
  onProgress?: (ratio: number) => void,
): Promise<TrimResult> {
  // 入力: BlobSourceでFileやBlobを直接渡せる
  const input = new Input({
    source: new BlobSource(source),
    formats: ALL_FORMATS,
  });

  // 出力: MP4形式、メモリ内バッファに書き出す
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });

  // トリミング設定: start/end を秒数で指定するだけ
  const conversion = await Conversion.init({
    input,
    output,
    trim: { start: startTime, end: endTime },
    showWarnings: false,
  });

  if (!conversion.isValid) {
    const reasons = conversion.discardedTracks.map((t) => t.reason).join(', ');
    throw new Error(`動画の変換に失敗: ${reasons}`);
  }

  // 進捗コールバック
  if (onProgress) {
    conversion.onProgress = onProgress;
  }

  // 実行（ロスレスremuxなので一瞬で完了）
  await conversion.execute();

  const buffer = target.buffer;
  if (!buffer) throw new Error('変換結果が空です');

  return {
    blob: new Blob([buffer], { type: 'video/mp4' }),
    duration: endTime - startTime,
  };
}
```

**たったこれだけ。** MediaRecorderの100行以上のコードが50行になりました。

### なぜこれが安定するのか

MediaRecorder方式との決定的な違い:

| | MediaRecorder方式 | Mediabunny方式 |
|:--|:--|:--|
| 処理内容 | 再生→キャプチャ→再エンコード | ファイル解析→データコピー→再パッケージ |
| 再エンコード | あり（画質劣化） | **なし（ロスレス）** |
| 処理時間 | リアルタイム（30秒動画→30秒） | **一瞬**（数百ミリ秒） |
| 出力形式 | WebM（互換性問題あり） | **MP4**（ネイティブ） |
| ブラウザ依存 | captureStreamのタイミングに依存 | **ファイルI/Oのみ、描画不要** |
| キーフレーム | 壊れる場合あり | **元のキーフレーム構造を保持** |

Mediabunnyは動画を「再生」しません。ファイルをバイト列として解析し、指定範囲のサンプルだけを新しいMP4コンテナに詰め直します。だからブラウザの動画再生エンジンの挙動に一切依存しない。

---

## iOS Safari固有のハマりポイント

Mediabunnyでトリミング処理自体は安定しますが、**トリミングUIのプレビュー再生**でiOS特有の罠があります。

### 罠1: `preload="auto"` が無視される

iOS Safariはデータ通信量を節約するため、`<video preload="auto">` を無視します。`canplay` イベントが永遠に発火しません。

```tsx
// ❌ iPhoneで動かない
<video
  src={videoUrl}
  onCanPlay={handleReady}  // ← 発火しない
  preload="auto"           // ← 無視される
/>

// ✅ 修正版
<video
  src={videoUrl}
  onLoadedMetadata={handleReady}  // ← これは確実に発火する
  preload="metadata"              // ← iOSの挙動に合わせる
/>
```

### 罠2: メタデータだけではシーク不可

`loadedmetadata` が発火してもiOSでは動画データ本体がロードされていません。フィルムストリップ生成のためにシークしても失敗します。

**対処法: play→pause でデータロードを強制する。**

```typescript
const handleMetadataLoaded = async () => {
  const video = videoRef.current;

  // iOS Safari: play→pause でデータロードを強制
  try {
    await video.play();
    video.pause();
    video.currentTime = 0;
  } catch {
    // autoplayがブロックされてもメタデータは利用可能
  }

  // この時点でdurationとシークが使える
  const duration = video.duration;
  // ... フィルムストリップ生成へ
};
```

### 罠3: `duration` が `Infinity` になる

iOSで `duration` が `Infinity` を返す場合があります（ストリーミングと誤判定）。

```typescript
let dur = video.duration;
if (!dur || !isFinite(dur)) {
  // durationchangeイベントを待つ
  await new Promise<void>((resolve) => {
    const handler = () => {
      if (isFinite(video.duration)) {
        video.removeEventListener('durationchange', handler);
        resolve();
      }
    };
    video.addEventListener('durationchange', handler);
    setTimeout(resolve, 3000); // 3秒でタイムアウト
  });
  dur = video.duration;
  if (!dur || !isFinite(dur)) dur = 30; // フォールバック
}
```

---

## まとめ

| やりたいこと | 使うべきもの | 使ってはいけないもの |
|:--|:--|:--|
| ブラウザ内で動画トリミング | **Mediabunny** | FFmpeg.wasm（SAB必須）、MediaRecorder（不安定） |
| iOS対応のvideoプレビュー | `loadedmetadata` + play→pause | `canplay` + `preload="auto"` |
| 共有ホスティングでの動画処理 | クライアントサイド処理 | サーバーサイドFFmpeg（PHP環境では不可） |

**Mediabunnyのおかげで、50行のコードでiPhoneでも安定した動画トリミングが実現できました。** 同じ要件で悩んでいる方の参考になれば幸いです。

---

### 使用技術

- [Mediabunny](https://github.com/Vanilagy/mediabunny) v1.40.0
- React 19 + TypeScript + Vite 8
- ConoHa共有ホスティング（Apache）

### 参考

- [Mediabunny公式ドキュメント](https://mediabunny.dev/)
- [WebCodecs API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
