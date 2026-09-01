"use client";

export default function QrImage({ dataUrl, size = 200, className }: { dataUrl: string; size?: number; className?: string }) {
  return (
    <div className={className ?? ""} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Visitor QR pass" width={size} height={size} className="rounded-lg border border-slate-200" />
    </div>
  );
}
