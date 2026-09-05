"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client";
import { formatPassCode, getTimeRemaining, formatDateTime } from "@/lib/utils";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import {
  KeyRound,
  UserPlus,
  Car,
  Copy,
  Check,
  Share2,
  QrCode,
  X,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  Bike,
  Wrench,
  Users,
  Send,
  DoorOpen,
} from "lucide-react";

type GatePass = {
  id: string;
  code: string;
  formattedCode: string;
  passType: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  visitorType?: string | null;
  vehiclePlate?: string | null;
  purpose?: string | null;
  direction: string;
  status: string;
  expiresAt: string;
  qrDataUrl?: string | null;
  createdAt: string;
};

export default function ResidentHomePage() {
  const [activePasses, setActivePasses] = useState<GatePass[]>([]);
  const [pastPasses, setPastPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Modals
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showSelfModal, setShowSelfModal] = useState(false);
  const [qrModalPass, setQrModalPass] = useState<GatePass | null>(null);

  // Visitor Form State
  const [visitorName, setVisitorName] = useState("");
  const [visitorCategory, setVisitorCategory] = useState("GUEST");
  const [visitorPlate, setVisitorPlate] = useState("");
  const [visitorPurpose, setVisitorPurpose] = useState("");
  const [visitorDuration, setVisitorDuration] = useState(2); // 2 hours default security window
  const [visitorSubmitting, setVisitorSubmitting] = useState(false);
  const [visitorError, setVisitorError] = useState<string | null>(null);

  // Self Pass Form State
  const [selfDirection, setSelfDirection] = useState<"EXIT" | "ENTRY" | "ROUNDTRIP">("EXIT");
  const [selfPlate, setSelfPlate] = useState("");
  const [selfDuration, setSelfDuration] = useState(2); // 2 hours default security window
  const [selfSubmitting, setSelfSubmitting] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    try {
      setError(null);
      const res = await apiFetch<{ active: GatePass[]; past: GatePass[] }>("/api/resident/codes");
      setActivePasses(res.active || []);
      setPastPasses(res.past || []);
    } catch (e: any) {
      setError(e.message || "Failed to load gate codes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
    const timer = setInterval(fetchCodes, 20000); // refresh every 20s
    return () => clearInterval(timer);
  }, [fetchCodes]);

  // Copy code helper
  function copyCode(pass: GatePass) {
    const formatted = formatPassCode(pass.code);
    navigator.clipboard.writeText(formatted);
    setCopiedId(pass.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // Share via WhatsApp / SMS / Web Share
  async function sharePass(pass: GatePass) {
    const formatted = formatPassCode(pass.code);
    const target = pass.visitorName || "Guest";
    const remaining = getTimeRemaining(pass.expiresAt);
    const passLabel =
      pass.passType === "VISITOR"
        ? `Visitor Pass (${pass.visitorType === "DELIVERY" ? "Dispatch / Delivery" : pass.visitorType === "SERVICE" ? "Technician" : pass.visitorType === "FAMILY" ? "Family" : "Guest"})`
        : "Resident Gate Pass";
    const purposeLine = pass.purpose ? `📋 *Purpose:* ${pass.purpose}` : "";
    const vehicleLine = pass.vehiclePlate ? `🚘 *Vehicle:* ${pass.vehiclePlate}` : "";

    const lines = [
      `🏘️ *SILVERLAND ZONE — TEDO HOUSING ESTATE*`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `Hi *${target}*, you have been granted gate access.`,
      ``,
      `🔑 *Your Access Code:*`,
      `   📟  *${formatted}*`,
      ``,
      `📌 *Pass Type:* ${passLabel}`,
      purposeLine,
      vehicleLine,
      `⏳ *Valid for:* ${remaining.text}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `📍 *How to enter:*`,
      `   1️⃣ Arrive at the main gate`,
      `   2️⃣ Tell the security officer your code: *${formatted}*`,
      `   3️⃣ Present a valid ID if requested`,
      ``,
      `⚠️ This code is single-use and expires after the time above. Do not share it with anyone else.`,
      ``,
      `_Powered by Silverland Estate Access Control_`,
    ].filter(Boolean).join("\n");

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Silverland Estate — Gate Access for ${target}`,
          text: lines,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    navigator.clipboard.writeText(lines);
    setCopiedId(pass.id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // Revoke code
  async function revokeCode(id: string) {
    if (!confirm("Are you sure you want to cancel this gate pass?")) return;
    try {
      await apiFetch(`/api/resident/codes/${id}/revoke`, { method: "POST" });
      await fetchCodes();
    } catch (e: any) {
      alert(e.message || "Could not revoke code.");
    }
  }

  // Handle Visitor Code Generation
  async function handleGenerateVisitor(e: React.FormEvent) {
    e.preventDefault();
    if (!visitorName.trim()) return;
    setVisitorSubmitting(true);
    setVisitorError(null);

    try {
      const res = await apiFetch<any>("/api/resident/codes/visitor", {
        method: "POST",
        body: {
          visitorName: visitorName.trim(),
          visitorType: visitorCategory,
          vehiclePlate: visitorPlate.trim() || null,
          purpose: visitorPurpose.trim() || undefined,
          durationHours: Number(visitorDuration),
          direction: "ENTRY",
        },
      });

      setShowVisitorModal(false);
      setVisitorName("");
      setVisitorPlate("");
      setVisitorPurpose("");
      setVisitorCategory("GUEST");
      await fetchCodes();

      // Show the generated code in active passes immediately
      if (res.gatePass) {
        setCopiedId(res.gatePass.id);
        setTimeout(() => setCopiedId(null), 3000);
      }
    } catch (err: any) {
      setVisitorError(err.message || "Failed to generate visitor pass.");
    } finally {
      setVisitorSubmitting(false);
    }
  }

  // Handle Resident Self Code Generation
  async function handleGenerateSelf(e: React.FormEvent) {
    e.preventDefault();
    setSelfSubmitting(true);
    setSelfError(null);

    try {
      const res = await apiFetch<any>("/api/resident/codes/self", {
        method: "POST",
        body: {
          direction: selfDirection,
          vehiclePlate: selfPlate.trim() || null,
          durationHours: Number(selfDuration),
        },
      });

      setShowSelfModal(false);
      setSelfPlate("");
      setSelfDirection("EXIT");
      await fetchCodes();

      if (res.gatePass) {
        setCopiedId(res.gatePass.id);
        setTimeout(() => setCopiedId(null), 3000);
      }
    } catch (err: any) {
      setSelfError(err.message || "Failed to generate pass.");
    } finally {
      setSelfSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Primary Action Buttons: Generator Hub */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
          Gate Code Generator
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Action 1: Visitor Code */}
          <button
            onClick={() => setShowVisitorModal(true)}
            className="flex flex-col items-start justify-between rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-md shadow-brand-900/15 active:scale-[0.98] transition-transform text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div className="mt-4">
              <span className="block text-sm font-bold leading-tight">Visitor Code</span>
              <span className="block text-[11px] text-brand-100 mt-0.5">Guest & Delivery</span>
            </div>
          </button>

          {/* Action 2: Self Pass (Exit/Entry) */}
          <button
            onClick={() => setShowSelfModal(true)}
            className="flex flex-col items-start justify-between rounded-2xl bg-white border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-transform text-left hover:border-brand-300"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <DoorOpen className="h-5 w-5" />
            </div>
            <div className="mt-4">
              <span className="block text-sm font-bold text-slate-900 leading-tight">
                My Gate Code
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">Going Out / Return</span>
            </div>
          </button>
        </div>
      </div>

      {/* In-App Install Prompt Banner */}
      <InstallAppPrompt />

      {/* Active Passes Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Active Passes
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {activePasses.length}
            </span>
          </div>
          <button
            onClick={fetchCodes}
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-700 active:scale-95"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="card p-6 text-center text-xs text-slate-400">Loading passes...</div>
        ) : error ? (
          <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</div>
        ) : activePasses.length === 0 ? (
          <div className="card p-6 text-center border-dashed">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
              <KeyRound className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">No active codes right now</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] mx-auto">
              Tap &quot;Visitor Code&quot; when a guest arrives at the gate, or &quot;My Gate Code&quot; when going out.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePasses.map((pass) => {
              const remaining = getTimeRemaining(pass.expiresAt);
              const formatted = formatPassCode(pass.code);
              const isCopied = copiedId === pass.id;
              const isVisitor = pass.passType === "VISITOR";

              return (
                <div
                  key={pass.id}
                  className="card p-4 border-2 border-brand-500/20 bg-gradient-to-b from-white to-brand-50/20 relative overflow-hidden"
                >
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`badge text-[11px] font-bold ${
                        isVisitor ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                      }`}
                    >
                      {isVisitor ? "Visitor Pass" : "Resident Pass"} • {pass.direction}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                      <Clock className="h-3 w-3" /> {remaining.text}
                    </span>
                  </div>

                  {/* Big Readable Pass Code Box */}
                  <div className="mt-3 rounded-xl bg-slate-900 px-4 py-3 text-center text-white shadow-inner flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                      Access Code (Call out at gate)
                    </span>
                    <span className="text-3xl font-black font-mono tracking-widest text-emerald-400 mt-0.5 select-all">
                      {formatted}
                    </span>
                  </div>

                  {/* Pass Details */}
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold text-slate-500">For:</span>
                      <span className="font-bold text-slate-900">
                        {pass.visitorName || "Resident Self"}
                      </span>
                    </div>
                    {pass.purpose && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-semibold text-slate-500">Purpose:</span>
                        <span>{pass.purpose}</span>
                      </div>
                    )}
                    {pass.vehiclePlate && (
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="font-semibold text-slate-500">Vehicle:</span>
                        <span className="font-mono font-semibold">{pass.vehiclePlate}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                    {/* Copy Code */}
                    <button
                      onClick={() => copyCode(pass)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy Code
                        </>
                      )}
                    </button>

                    {/* WhatsApp Share */}
                    <button
                      onClick={() => sharePass(pass)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white py-2 text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </button>

                    {/* Show QR */}
                    <button
                      onClick={() => setQrModalPass(pass)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                    >
                      <QrCode className="h-3.5 w-3.5" /> QR Pass
                    </button>
                  </div>

                  <div className="mt-2 text-right">
                    <button
                      onClick={() => revokeCode(pass.id)}
                      className="text-[10px] font-semibold text-rose-500 hover:underline"
                    >
                      Cancel / Revoke Pass
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Accordion */}
      <div className="border-t border-slate-200 pt-4">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex w-full items-center justify-between py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800"
        >
          <span>Past Passes History ({pastPasses.length})</span>
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showHistory && (
          <div className="mt-2 space-y-2">
            {pastPasses.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">No past passes recorded.</p>
            ) : (
              pastPasses.slice(0, 15).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200 text-xs shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {formatPassCode(p.code)}
                      </span>
                      <span className="font-medium text-slate-600">
                        {p.visitorName || "Resident Pass"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {formatDateTime(p.createdAt)}
                    </span>
                  </div>
                  <span
                    className={`badge text-[10px] uppercase font-bold ${
                      p.status === "USED"
                        ? "bg-slate-100 text-slate-600"
                        : p.status === "EXPIRED"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ----------------- MODAL: Generate Visitor Code ----------------- */}
      {showVisitorModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Generate Visitor Code</h2>
              </div>
              <button
                onClick={() => setShowVisitorModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateVisitor} className="mt-4 space-y-4">
              {visitorError && (
                <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                  {visitorError}
                </div>
              )}

              {/* Visitor Name */}
              <div>
                <label className="label">Visitor / Driver Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Michael / Jumia Dispatch"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="input"
                />
              </div>

              {/* Category Pills */}
              <div>
                <label className="label">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "GUEST", label: "Guest / Friend", icon: Users },
                    { id: "DELIVERY", label: "Dispatch / Delivery", icon: Bike },
                    { id: "SERVICE", label: "Technician / Repair", icon: Wrench },
                    { id: "FAMILY", label: "Family Member", icon: ShieldCheck },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const active = visitorCategory === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setVisitorCategory(cat.id)}
                        className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold border transition-all text-left ${
                          active
                            ? "bg-brand-50 border-brand-600 text-brand-800 ring-1 ring-brand-600"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${active ? "text-brand-600" : "text-slate-400"}`} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vehicle Plate (Optional) */}
              <div>
                <label className="label">Vehicle Plate Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. KJA-101-QQ"
                  value={visitorPlate}
                  onChange={(e) => setVisitorPlate(e.target.value)}
                  className="input font-mono uppercase"
                />
              </div>

              {/* Security Window / Duration */}
              <div>
                <label className="label">Pass Validity (Security Duration)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { hours: 2, label: "2 Hours", desc: "Recommended" },
                    { hours: 6, label: "6 Hours", desc: "Half Day" },
                    { hours: 12, label: "12 Hours", desc: "Full Day" },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.hours}
                      onClick={() => setVisitorDuration(item.hours)}
                      className={`rounded-xl p-2 text-center border transition-all ${
                        visitorDuration === item.hours
                          ? "bg-brand-600 text-white border-brand-600 font-bold shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 font-medium"
                      }`}
                    >
                      <div className="text-xs">{item.label}</div>
                      <div
                        className={`text-[9px] ${
                          visitorDuration === item.hours ? "text-brand-100" : "text-slate-400"
                        }`}
                      >
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={visitorSubmitting}
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-md mt-2"
              >
                {visitorSubmitting ? "Generating Code..." : "Create Visitor Pass Code"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: Generate Self Pass ----------------- */}
      {showSelfModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Car className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Resident Gate Pass</h2>
              </div>
              <button
                onClick={() => setShowSelfModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSelf} className="mt-4 space-y-4">
              {selfError && (
                <div className="rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 font-medium">
                  {selfError}
                </div>
              )}

              {/* Direction */}
              <div>
                <label className="label">Access Direction</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "EXIT", label: "Going Out (Exit)" },
                    { id: "ENTRY", label: "Returning (Entry)" },
                    { id: "ROUNDTRIP", label: "Exit & Return" },
                  ].map((dir) => (
                    <button
                      type="button"
                      key={dir.id}
                      onClick={() => setSelfDirection(dir.id as any)}
                      className={`rounded-xl p-2.5 text-xs font-semibold border transition-all text-center ${
                        selfDirection === dir.id
                          ? "bg-brand-600 text-white border-brand-600 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {dir.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle */}
              <div>
                <label className="label">Vehicle Plate (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ABC-123-XZ (Leave blank if on foot/cab)"
                  value={selfPlate}
                  onChange={(e) => setSelfPlate(e.target.value)}
                  className="input font-mono uppercase"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="label">Validity Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelfDuration(2)}
                    className={`rounded-xl p-2.5 text-xs font-semibold border text-center ${
                      selfDuration === 2
                        ? "bg-brand-50 border-brand-600 text-brand-800 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    2 Hours (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelfDuration(6)}
                    className={`rounded-xl p-2.5 text-xs font-semibold border text-center ${
                      selfDuration === 6
                        ? "bg-brand-50 border-brand-600 text-brand-800 font-bold"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    6 Hours (Extended)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={selfSubmitting}
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-md mt-2"
              >
                {selfSubmitting ? "Generating Code..." : "Generate My Gate Pass"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: Fullscreen QR Pass ----------------- */}
      {qrModalPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <div className="flex justify-end">
              <button
                onClick={() => setQrModalPass(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-1">
              <span className="badge bg-brand-50 text-brand-800 text-xs">
                {qrModalPass.passType.replace("_", " ")}
              </span>
              <h3 className="mt-2 text-xl font-black text-slate-900">
                {qrModalPass.visitorName || "Resident Gate Pass"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Show this QR to the gate scanner</p>
            </div>

            {qrModalPass.qrDataUrl ? (
              <div className="my-5 flex justify-center">
                <img
                  src={qrModalPass.qrDataUrl}
                  alt="QR Pass"
                  className="h-52 w-52 rounded-2xl border-4 border-slate-100 shadow-md p-2 bg-white"
                />
              </div>
            ) : (
              <div className="my-8 text-xs text-slate-400">QR code unavailable</div>
            )}

            <div className="rounded-xl bg-slate-100 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Numeric Code</span>
              <div className="text-2xl font-black font-mono tracking-widest text-slate-900">
                {formatPassCode(qrModalPass.code)}
              </div>
            </div>

            <button
              onClick={() => setQrModalPass(null)}
              className="btn-secondary w-full mt-4 py-2.5 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
