import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Scissors, Loader2, Play, Plus, Trash2 } from 'lucide-react';
import { trimVideo } from '../utils/videoTrimmer';
import { loadSettings } from '../models/settings';

export interface TrimOutput {
  blob: Blob;
  mediaType: 'video' | 'image';
  duration: number;
}

interface TrimRange {
  id: number;
  start: number;
  end: number;
}

interface VideoTrimmerProps {
  isOpen: boolean;
  videoFile: File | null;
  onComplete: (results: TrimOutput[]) => void;
  onClose: () => void;
}

const COLORS = [
  { border: 'border-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-400', label: 'bg-yellow-500' },
  { border: 'border-cyan-400', bg: 'bg-cyan-400', text: 'text-cyan-400', label: 'bg-cyan-500' },
  { border: 'border-pink-400', bg: 'bg-pink-400', text: 'text-pink-400', label: 'bg-pink-500' },
  { border: 'border-green-400', bg: 'bg-green-400', text: 'text-green-400', label: 'bg-green-500' },
  { border: 'border-orange-400', bg: 'bg-orange-400', text: 'text-orange-400', label: 'bg-orange-500' },
];

let nextRangeId = 1;

export function VideoTrimmer({ isOpen, videoFile, onComplete, onClose }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const filmstripCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [ranges, setRanges] = useState<TrimRange[]>([]);
  const [activeRangeId, setActiveRangeId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [dragging, setDragging] = useState<{ rangeId: number; edge: 'start' | 'end' } | 'playhead' | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!videoFile) { setVideoUrl(null); setReady(false); return; }
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    setReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setRanges([]);
    setActiveRangeId(null);
    setDuration(0);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  const handleMetadataLoaded = useCallback(async () => {
    const video = videoRef.current;
    if (!video || ready) return;

    // iOS Safari: play→pause でデータロードを強制
    try {
      await video.play();
      video.pause();
      video.currentTime = 0;
    } catch { /* autoplay blocked - metadata is still available */ }

    let dur = video.duration;
    if (!dur || !isFinite(dur)) {
      // duration取得のフォールバック: durationchangeを待つ
      await new Promise<void>((resolve) => {
        const handler = () => {
          if (isFinite(video.duration)) {
            video.removeEventListener('durationchange', handler);
            resolve();
          }
        };
        video.addEventListener('durationchange', handler);
        setTimeout(resolve, 3000);
      });
      dur = video.duration;
      if (!dur || !isFinite(dur)) dur = 30;
    }

    const settings = loadSettings();
    const maxDur = Math.min(dur, settings.videoMaxDuration);
    setDuration(dur);
    const id = nextRangeId++;
    setRanges([{ id, start: 0, end: maxDur }]);
    setActiveRangeId(id);
    setReady(true);
    generateFilmstrip(video, dur);
  }, [ready]);

  const generateFilmstrip = useCallback(async (video: HTMLVideoElement, dur: number) => {
    const canvas = filmstripCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const frameCount = 12;
    const fw = canvas.width / frameCount;
    const fh = canvas.height;
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const seekTo = (t: number): Promise<void> =>
      new Promise((r) => {
        const h = () => { video.removeEventListener('seeked', h); r(); };
        video.addEventListener('seeked', h);
        video.currentTime = t;
      });
    for (let i = 0; i < frameCount; i++) {
      try { await seekTo((i / frameCount) * dur); ctx.drawImage(video, i * fw, 0, fw, fh); } catch { break; }
    }
    video.currentTime = 0;
  }, []);

  const activeRange = ranges.find((r) => r.id === activeRangeId);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying || !activeRange) return;
    const id = setInterval(() => {
      if (video.currentTime >= activeRange.end) {
        video.pause();
        video.currentTime = activeRange.start;
        setIsPlaying(false);
      }
      setCurrentTime(video.currentTime);
    }, 50);
    return () => clearInterval(id);
  }, [isPlaying, activeRange]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video || !ready || !activeRange) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime < activeRange.start || video.currentTime >= activeRange.end) {
        video.currentTime = activeRange.start;
      }
      video.play();
      setIsPlaying(true);
    }
  };

  const timeToPercent = (t: number) => duration > 0 ? (t / duration) * 100 : 0;
  const percentToTime = (pct: number) => (pct / 100) * duration;

  const handlePointerDown = (type: { rangeId: number; edge: 'start' | 'end' } | 'playhead') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof type !== 'string') setActiveRangeId(type.rangeId);
    setDragging(type);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const time = percentToTime(pct);

    if (dragging === 'playhead') {
      const clamped = Math.max(0, Math.min(time, duration));
      setCurrentTime(clamped);
      if (videoRef.current) videoRef.current.currentTime = clamped;
      return;
    }

    const { rangeId, edge } = dragging;
    setRanges((prev) => prev.map((r) => {
      if (r.id !== rangeId) return r;
      if (edge === 'start') {
        return { ...r, start: Math.max(0, Math.min(time, r.end - 0.5)) };
      } else {
        const settings = loadSettings();
        const maxEnd = Math.min(duration, r.start + settings.videoMaxDuration);
        return { ...r, end: Math.max(r.start + 0.5, Math.min(time, maxEnd)) };
      }
    }));
  }, [dragging, duration]);

  const handlePointerUp = useCallback(() => setDragging(null), []);

  const addRange = () => {
    const lastEnd = ranges.length > 0 ? Math.max(...ranges.map((r) => r.end)) : 0;
    const newStart = Math.min(lastEnd, duration - 1);
    const newEnd = Math.min(newStart + 5, duration);
    if (newEnd - newStart < 0.5) return;
    const id = nextRangeId++;
    setRanges((prev) => [...prev, { id, start: newStart, end: newEnd }]);
    setActiveRangeId(id);
  };

  const removeRange = (id: number) => {
    setRanges((prev) => prev.filter((r) => r.id !== id));
    if (activeRangeId === id) {
      setActiveRangeId(ranges.find((r) => r.id !== id)?.id ?? null);
    }
  };

  const handleTrim = async () => {
    if (!videoFile || ranges.length === 0) return;
    setIsProcessing(true);
    const results: TrimOutput[] = [];
    try {
      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        setProgressLabel(`${i + 1}/${ranges.length}`);
        setProgress(0);
        const result = await trimVideo(videoFile, range.start, range.end, setProgress);
        results.push({ blob: result.blob, mediaType: 'video', duration: result.duration });
      }
      onComplete(results);
    } catch (err) {
      console.error('Trim failed:', err);
      if (confirm('トリミング処理に失敗しました。元の動画をそのまま使用しますか？')) {
        onComplete([{ blob: videoFile, mediaType: 'video', duration }]);
      }
    } finally {
      setIsProcessing(false);
      setProgressLabel('');
    }
  };

  const handleSkipTrim = () => {
    if (!videoFile) return;
    onComplete([{ blob: videoFile, mediaType: 'video', duration }]);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 10);
    return `${m}:${String(s).padStart(2, '0')}.${ms}`;
  };

  if (!isOpen || !videoFile) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <button onClick={onClose} className="text-white/80 hover:text-white p-2 touch-manipulation">
          <X size={24} />
        </button>
        <h2 className="text-white font-medium text-sm">動画をトリミング</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSkipTrim}
            disabled={isProcessing || !ready}
            className="px-3 py-1.5 text-sm text-white/70 hover:text-white border border-white/30 rounded-lg touch-manipulation disabled:opacity-40"
          >
            スキップ
          </button>
          <button
            onClick={handleTrim}
            disabled={isProcessing || !ready || ranges.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 touch-manipulation font-medium disabled:opacity-40"
          >
            {isProcessing ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {progressLabel} {Math.round(progress * 100)}%
              </>
            ) : (
              <>
                <Scissors size={15} />
                確定{ranges.length > 1 ? ` (${ranges.length}本)` : ''}
              </>
            )}
          </button>
        </div>
      </div>

      {/* 動画プレビュー */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleMetadataLoaded}
            preload="metadata"
            playsInline
            muted
            className="rounded-lg"
            style={{ maxWidth: '90%', maxHeight: '100%', objectFit: 'contain' }}
          />
        )}
        <button
          onClick={handlePlayPause}
          className="absolute inset-0 flex items-center justify-center touch-manipulation"
        >
          {!isPlaying && ready && (
            <div className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Play size={32} className="text-white ml-1" />
            </div>
          )}
        </button>
        {!ready && videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={32} className="text-white animate-spin" />
          </div>
        )}
      </div>

      {/* 範囲リスト + 追加ボタン */}
      <div className="px-4 pt-2 pb-1 shrink-0 flex items-center gap-2 overflow-x-auto">
        {ranges.map((range, i) => {
          const color = COLORS[i % COLORS.length];
          const isActive = range.id === activeRangeId;
          return (
            <button
              key={range.id}
              onClick={() => setActiveRangeId(range.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs shrink-0 border transition-colors ${
                isActive
                  ? `${color.border} bg-white/10 text-white`
                  : 'border-white/20 text-white/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${color.label}`} />
              <span>{formatTime(range.start)} - {formatTime(range.end)}</span>
              {ranges.length > 1 && (
                <span
                  onClick={(e) => { e.stopPropagation(); removeRange(range.id); }}
                  className="ml-0.5 text-white/40 hover:text-red-400"
                >
                  <Trash2 size={10} />
                </span>
              )}
            </button>
          );
        })}
        {ranges.length < 5 && (
          <button
            onClick={addRange}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs border border-dashed border-white/30 text-white/50 hover:text-white hover:border-white/60 shrink-0 touch-manipulation"
          >
            <Plus size={12} />
            範囲追加
          </button>
        )}
      </div>

      {/* フィルムストリップ + トリムハンドル */}
      <div className="px-4 pb-6 shrink-0" style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
        <div
          ref={containerRef}
          className="relative h-14 select-none touch-manipulation"
          style={{ touchAction: 'none' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* フィルムストリップ */}
          <canvas
            ref={filmstripCanvasRef}
            width={720}
            height={56}
            className="absolute inset-0 w-full h-full rounded-lg bg-gray-700"
          />

          {/* 各範囲をレンダリング */}
          {ranges.map((range, i) => {
            const color = COLORS[i % COLORS.length];
            const isActive = range.id === activeRangeId;
            const leftPct = timeToPercent(range.start);
            const widthPct = timeToPercent(range.end) - leftPct;

            return (
              <div key={range.id}>
                {/* 範囲枠 */}
                <div
                  className={`absolute top-0 bottom-0 ${color.border} ${isActive ? 'border-y-2 z-[5]' : 'border-y cursor-pointer'}`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, opacity: isActive ? 1 : 0.7 }}
                  onClick={isActive ? undefined : () => setActiveRangeId(range.id)}
                />

                {/* 番号ラベル */}
                <div
                  className={`absolute top-0 ${color.label} text-[9px] text-white font-bold px-1 rounded-br pointer-events-none`}
                  style={{ left: `${leftPct}%` }}
                >
                  {i + 1}
                </div>

                {/* 左ハンドル */}
                {isActive && (
                  <div
                    className={`absolute top-0 bottom-0 w-6 ${color.bg} rounded-l-lg cursor-col-resize flex items-center justify-center touch-manipulation z-10`}
                    style={{ left: `calc(${leftPct}% - 12px)` }}
                    onPointerDown={handlePointerDown({ rangeId: range.id, edge: 'start' })}
                  >
                    <div className="w-0.5 h-5 bg-gray-800 rounded-full" />
                  </div>
                )}

                {/* 右ハンドル */}
                {isActive && (
                  <div
                    className={`absolute top-0 bottom-0 w-6 ${color.bg} rounded-r-lg cursor-col-resize flex items-center justify-center touch-manipulation z-10`}
                    style={{ left: `calc(${timeToPercent(range.end)}% - 12px)` }}
                    onPointerDown={handlePointerDown({ rangeId: range.id, edge: 'end' })}
                  >
                    <div className="w-0.5 h-5 bg-gray-800 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}

          {/* どの範囲にも属さないエリアを薄く暗くする */}
          <RangeGaps ranges={ranges} duration={duration} timeToPercent={timeToPercent} />

          {/* プレイヘッド */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-20"
            style={{ left: `calc(${timeToPercent(currentTime)}% - 2px)` }}
            onPointerDown={handlePointerDown('playhead')}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow touch-manipulation" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RangeGaps({
  ranges,
  duration,
  timeToPercent,
}: {
  ranges: TrimRange[];
  duration: number;
  timeToPercent: (t: number) => number;
}) {
  if (ranges.length === 0 || duration === 0) return null;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const gaps: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const r of sorted) {
    if (r.start > cursor) gaps.push({ start: cursor, end: r.start });
    cursor = Math.max(cursor, r.end);
  }
  if (cursor < duration) gaps.push({ start: cursor, end: duration });
  return (
    <>
      {gaps.map((g, i) => (
        <div
          key={i}
          className="absolute top-0 bottom-0 bg-black/50 pointer-events-none"
          style={{
            left: `${timeToPercent(g.start)}%`,
            width: `${timeToPercent(g.end) - timeToPercent(g.start)}%`,
            borderRadius: g.start === 0 ? '0.5rem 0 0 0.5rem' : g.end >= duration ? '0 0.5rem 0.5rem 0' : undefined,
          }}
        />
      ))}
    </>
  );
}
