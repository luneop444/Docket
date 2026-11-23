import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { DocFile } from '../state/readDoc';

export interface Shot {
  file: DocFile;
  preview: string;
}
export type CamState = 'starting' | 'live' | 'off';
export interface Viewfinder {
  /** A still from the live camera, shrunk for reading (1600px, JPEG). Null when it isn't live. */
  capture: () => Promise<Shot | null>;
}

/**
 * The live camera, full bleed: the back camera on a phone, the webcam on a laptop. Asks for
 * the camera once; if that's refused or there isn't one, it says so through onState and the
 * scanner falls back to the phone's own camera or a file.
 */
export const ScanViewfinder = forwardRef<Viewfinder, { onState: (s: CamState) => void }>(function ScanViewfinder({ onState }, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const live = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let gone = false;
    onState('starting');
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      onState('off');
      return;
    }
    media
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(async (s) => {
        if (gone) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = video.current;
        if (!v) return;
        v.srcObject = s;
        await v.play().catch(() => {});
        live.current = true;
        onState('live');
      })
      .catch(() => onState('off'));
    return () => {
      gone = true;
      live.current = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // Once per scanner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    async capture() {
      const v = video.current;
      if (!v || !live.current || !v.videoWidth) return null;
      const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * k);
      c.height = Math.round(v.videoHeight * k);
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', 0.75);
      return { file: { base64: url.replace(/^data:[^,]+,/, ''), mediaType: 'image/jpeg' }, preview: url };
    },
  }));

  return (
    <video
      ref={video}
      playsInline
      muted
      autoPlay
      aria-label="Camera"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#0B0B0C' }}
    />
  );
});
