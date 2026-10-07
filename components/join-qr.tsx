"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function JoinQr({ queueId }: { queueId: string }) {
  const [qr, setQr] = useState<{ link: string; src: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const url = `${window.location.origin}/q/${queueId}`;
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 280,
      margin: 1,
      color: { dark: "#12263A", light: "#F4F6F8" },
    }).then((src) => {
      if (!cancelled) setQr({ link: url, src });
    });
    return () => {
      cancelled = true;
    };
  }, [queueId]);

  async function copy() {
    if (!qr?.link) return;
    await navigator.clipboard.writeText(qr.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-6">
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr.src} alt="Join queue QR code" width={280} height={280} />
      ) : (
        <div className="h-[280px] w-[280px] bg-white" />
      )}
      <p className="mt-3 break-all text-slate">{qr?.link}</p>
      <button className="btn btn-ghost mt-3" type="button" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy join link"}
      </button>
    </div>
  );
}
