export function captureVideoThumbnail(videoBlob: Blob, maxSize = 480): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = url;
    video.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1';
    document.body.appendChild(video);

    const cleanup = () => {
      document.body.removeChild(video);
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = async () => {
      try {
        await video.play();
        video.pause();
        video.currentTime = 0.1;
      } catch { /* ignore */ }
    };

    video.onseeked = () => {
      const scale = Math.min(1, maxSize / Math.max(video.videoWidth, video.videoHeight));
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          cleanup();
          blob ? resolve(blob) : reject(new Error('Failed to capture thumbnail'));
        },
        'image/jpeg',
        0.8,
      );
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video'));
    };
  });
}
