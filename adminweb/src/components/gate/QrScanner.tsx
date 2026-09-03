"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Camera, X } from "lucide-react";

export default function QrScanner({
  onScan,
  onClose,
}: {
  onScan: (raw: string) => void;
  onClose?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!ref.current || started) return;

    const scanner = new Html5QrcodeScanner(
      "silverland-qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );
    scannerRef.current = scanner;
    scanner.render(
      (decodedText: string) => {
        try {
          scanner.clear();
        } catch {}
        if (!cancelled) onScan(decodedText);
      },
      (error: any) => {
        // ignore per-frame scan failures
      }
    );
    setStarted(true);

    return () => {
      cancelled = true;
      try {
        scanner.clear();
      } catch {}
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  return (
    <div className="relative">
      <div id="silverland-qr-reader" ref={ref} />
    </div>
  );
}
