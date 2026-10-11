"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import jsQR from "jsqr";
import { joinPathFromQr } from "@/lib/join-url";

type Status = "looking" | "denied" | "unsupported" | "invalid";

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (
    source: CanvasImageSource,
  ) => Promise<Array<{ rawValue: string }>>;
};

export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const foundRef = useRef(false);
  const errorId = useId();
  const [status, setStatus] = useState<Status>("looking");
  const [pasteError, setPasteError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const el = video;

    let cancelled = false;
    let raf = 0;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        el.srcObject = stream;
        await el.play();
      } catch {
        if (!cancelled) setStatus("denied");
        return;
      }

      const Detector = (
        window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
      ).BarcodeDetector;
      const detector = Detector
        ? new Detector({ formats: ["qr_code"] })
        : null;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      async function tick() {
        if (cancelled || foundRef.current) return;
        if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          let raw: string | null = null;
          try {
            if (detector) {
              const codes = await detector.detect(el);
              raw = codes[0]?.rawValue ?? null;
            } else if (ctx && el.videoWidth > 0) {
              canvas.width = el.videoWidth;
              canvas.height = el.videoHeight;
              ctx.drawImage(el, 0, 0);
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              raw = jsQR(image.data, image.width, image.height)?.data ?? null;
            }
          } catch {
            raw = null;
          }

          if (raw) {
            const path = joinPathFromQr(raw, window.location.origin);
            if (!path) {
              setStatus("invalid");
            } else {
              foundRef.current = true;
              streamRef.current?.getTracks().forEach((track) => track.stop());
              router.replace(path);
              return;
            }
          }
        }
        raf = requestAnimationFrame(() => {
          void tick();
        });
      }

      raf = requestAnimationFrame(() => {
        void tick();
      });
    }

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      el.srcObject = null;
    };
  }, [router]);

  function onPaste(formData: FormData) {
    const path = joinPathFromQr(
      String(formData.get("link") ?? ""),
      window.location.origin,
    );
    if (!path) {
      setPasteError("That isn’t a Queue join code.");
      return;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    router.replace(path);
  }

  const showCamera = status === "looking" || status === "invalid";
  const statusText =
    status === "denied"
      ? "Camera access was blocked. Paste the join link instead."
      : status === "unsupported"
        ? "This browser cannot open a camera. Paste the join link instead."
        : status === "invalid"
          ? "That isn’t a Queue join code."
          : "Looking for a QR…";

  return (
    <div className="flex flex-col gap-6">
      {showCamera ? (
        <div className="scan-frame">
          <video
            ref={videoRef}
            className="scan-video"
            autoPlay
            muted
            playsInline
          />
          <div className="scan-reticle" aria-hidden="true" />
        </div>
      ) : (
        <div className="scan-frame scan-frame-empty" />
      )}

      <p className="text-slate" aria-live="polite">
        {statusText}
      </p>

      <form action={onPaste} className="flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span>Join link</span>
          <input
            className="field"
            name="link"
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="/q/…"
            aria-invalid={pasteError ? true : undefined}
            aria-describedby={pasteError ? errorId : undefined}
          />
        </label>
        {pasteError ? (
          <p id={errorId} className="text-ticket" role="alert">
            {pasteError}
          </p>
        ) : null}
        <button className="btn btn-ticket w-fit" type="submit">
          Open join link
        </button>
      </form>
    </div>
  );
}
