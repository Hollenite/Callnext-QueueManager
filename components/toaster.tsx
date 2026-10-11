"use client";

import { useEffect, useState } from "react";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

const EVENT = "queue-toast";

export function toast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

export function Toaster() {
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    let hide = 0;
    const onToast = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      sonnerToast(message);
      window.setTimeout(() => {
        if (document.querySelector("[data-sonner-toast]")) return;
        setFallback(message);
        window.clearTimeout(hide);
        hide = window.setTimeout(() => setFallback(null), 3500);
      }, 80);
    };
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      window.clearTimeout(hide);
    };
  }, []);

  return (
    <>
      <Sonner
        position="bottom-center"
        theme="light"
        toastOptions={{
          className: "queue-toast",
          duration: 3500,
        }}
      />
      {fallback ? (
        <p className="queue-live-toast" role="status" aria-live="polite">
          {fallback}
        </p>
      ) : null}
    </>
  );
}
