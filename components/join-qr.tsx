"use client";

import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "@/components/toaster";

export function JoinQr({ queueId }: { queueId: string }) {
  const [qr, setQr] = useState<{ link: string; src: string } | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/q/${queueId}`;
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: { dark: "#12263A", light: "#FFFFFF" },
    }).then((src) => {
      if (!cancelled) setQr({ link: url, src });
    });
    return () => {
      cancelled = true;
    };
  }, [queueId]);

  async function copy() {
    if (!qr?.link) return;
    toast("Copy join link");
    try {
      await navigator.clipboard.writeText(qr.link);
    } catch {
      // Clipboard can be blocked in some browsers; still confirm the action.
    }
  }

  return (
    <div>
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr.src}
          alt="Join queue QR code"
          width={220}
          height={220}
          className="h-auto w-full max-w-[220px]"
        />
      ) : (
        <div className="aspect-square w-full max-w-[220px] bg-paper" />
      )}
      <p className="mt-3 break-all text-sm text-slate">{qr?.link}</p>
      <button className="btn btn-ghost mt-3 w-full" type="button" onClick={() => void copy()}>
        <Copy className="size-4" aria-hidden="true" />
        Copy join link
      </button>
    </div>
  );
}
