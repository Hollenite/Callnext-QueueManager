"use client";

import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "@/components/toaster";

const DESK_SIZE = 280;
const WALL_SIZE = 128;

type Props = {
  queueId: string;
  variant?: "desk" | "wall";
};

export function JoinQr({ queueId, variant = "desk" }: Props) {
  const size = variant === "wall" ? WALL_SIZE : DESK_SIZE;
  const [qr, setQr] = useState<{ link: string; src: string } | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/q/${queueId}`;
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: "#12263A", light: "#FFFFFF" },
    }).then((src) => {
      if (!cancelled) setQr({ link: url, src });
    });
    return () => {
      cancelled = true;
    };
  }, [queueId, size]);

  async function copy() {
    if (!qr?.link) return;
    toast("Copy join link");
    try {
      await navigator.clipboard.writeText(qr.link);
    } catch {
      // Clipboard can be blocked in some browsers; still confirm the action.
    }
  }

  const compact = variant === "wall";
  const max = compact ? "max-w-[8rem]" : "max-w-[280px]";

  return (
    <div>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr.src}
          alt="Join queue QR code"
          width={size}
          height={size}
          className={`h-auto w-full ${max}`}
        />
      ) : (
        <div className={`aspect-square w-full bg-paper ${max}`} />
      )}
      {compact ? (
        <p className="mt-2 text-sm text-slate">Scan to join</p>
      ) : (
        <>
          <p className="mt-3 break-all text-sm text-slate">{qr?.link}</p>
          <button
            className="btn btn-ghost mt-3 w-full"
            type="button"
            onClick={() => void copy()}
          >
            <Copy className="size-4" aria-hidden="true" />
            Copy join link
          </button>
        </>
      )}
    </div>
  );
}
