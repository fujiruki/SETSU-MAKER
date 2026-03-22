import {
  Conversion,
  Input,
  Output,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  ALL_FORMATS,
} from 'mediabunny';

export interface TrimResult {
  blob: Blob;
  duration: number;
}

export async function trimVideo(
  source: Blob,
  startTime: number,
  endTime: number,
  onProgress?: (ratio: number) => void,
): Promise<TrimResult> {
  const input = new Input({
    source: new BlobSource(source),
    formats: ALL_FORMATS,
  });

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });

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

  if (onProgress) {
    conversion.onProgress = onProgress;
  }

  await conversion.execute();

  const buffer = target.buffer;
  if (!buffer) throw new Error('変換結果が空です');

  const blob = new Blob([buffer], { type: 'video/mp4' });
  return { blob, duration: endTime - startTime };
}
