"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/client";
import { formatPassCode, formatDateTime } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Camera,
  RefreshCw,
  KeyRound,
  Delete,
  User,
  Car,
  Home,
  Phone,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";

type VerificationResult = {
  valid: boolean;
  reason: string;
  gatePass: {
    id: string;
    code: string;
    formattedCode: string;
    passType: string;
    direction: "ENTRY" | "EXIT";
    status: string;
    expiresAt: string;
    visitorName?: string | null;
    visitorPhone?: string | null;
    visitorType?: string | null;
    vehiclePlate?: string | null;
    purpose?: string | null;
    resident: {
      id: string;
      name: string;
      unitNumber: string;
      phone?: string | null;
    };
  } | null;
};

type ShiftStats = {
  enteredToday: number;
  exitedToday: number;
  deniedToday: number;
};

export default function OfficerTerminalPage() {
  const [codeInput, setCodeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<ShiftStats>({ enteredToday: 0, exitedToday: 0, deniedToday: 0 });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [camOn, setCamOn] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch<{ stats: ShiftStats; recentLogs: any[] }>("/api/gate/shift-stats");
      setStats(res.stats);
      setRecentLogs(res.recentLogs || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Handle keypad number press
  function pressKey(key: string) {
    if (codeInput.length < 6) {
      setCodeInput((prev) => prev + key);
    }
  }

  function handleBackspace() {
    setCodeInput((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    setCodeInput("");
    setResult(null);
    setActionSuccess(null);
  }

  // Verify Code
  async function handleVerify(raw?: string) {
    const code = (raw || codeInput).trim();
    if (!code) return;

    setLoading(true);
    setResult(null);
    setActionSuccess(null);

    try {
      const res = await apiFetch<VerificationResult>("/api/gate/verify-code", {
        method: "POST",
        body: { code },
      });
      setResult(res);
    } catch (e: any) {
      setResult({
        valid: false,
        reason: e.message || "Failed to verify code.",
        gatePass: null,
      });
    } finally {
      setLoading(false);
    }
  }

  // Confirm Access (Grant)
  async function handleGrantAccess(actionOverride?: "ENTRY" | "EXIT") {
    if (!result?.gatePass) return;
    setActionBusy(true);

    try {
      const action = actionOverride || result.gatePass.direction || "ENTRY";
      await apiFetch("/api/gate/confirm-access", {
        method: "POST",
        body: {
          code: result.gatePass.code,
          action,
        },
      });

      setActionSuccess(`Access Granted (${action})! Gate cleared.`);
      setResult(null);
      setCodeInput("");
      await fetchStats();
    } catch (e: any) {
      alert(e.message || "Failed to record access.");
    } finally {
      setActionBusy(false);
    }
  }

  // Deny Access
  async function handleDenyAccess() {
    const reason = prompt("Enter denial reason:", result?.reason || "Security officer denial");
    if (!reason) return;

    setActionBusy(true);
    try {
      await apiFetch("/api/gate/deny-access", {
        method: "POST",
        body: {
          code: codeInput || result?.gatePass?.code,
          reason,
        },
      });

      setActionSuccess("Access Denied and logged.");
      setResult(null);
      setCodeInput("");
      await fetchStats();
    } catch (e: any) {
      alert(e.message || "Failed to log denial.");
    } finally {
      setActionBusy(false);
    }
  }

  // Formatted display of the 6 digits: e.g. [ 8 4 9 - 2 0 1 ]
  const displayCode = () => {
    const padded = (codeInput + "______").slice(0, 6);
    return `${padded.slice(0, 3)} - ${padded.slice(3, 6)}`;
  };

  return (
    <div className="space-y-4">
      {/* Shift Live Counter Badges */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-800/80 border border-slate-700/80 p-2.5 text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Entered
          </span>
          <span className="text-xl font-black text-emerald-400">{stats.enteredToday}</span>
        </div>
        <div className="rounded-xl bg-slate-800/80 border border-slate-700/80 p-2.5 text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Exited
          </span>
          <span className="text-xl font-black text-blue-400">{stats.exitedToday}</span>
        </div>
        <div className="rounded-xl bg-slate-800/80 border border-slate-700/80 p-2.5 text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Denied
          </span>
          <span className="text-xl font-black text-rose-400">{stats.deniedToday}</span>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="rounded-2xl bg-emerald-950 border-2 border-emerald-500 p-4 text-center text-emerald-200 animate-in fade-in duration-200">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-1" />
          <p className="font-bold text-sm">{actionSuccess}</p>
        </div>
      )}

      {/* Verification Result Card */}
      {result && (
        <div
          className={`rounded-2xl border-2 p-4 text-white shadow-xl animate-in zoom-in-95 duration-150 ${
            result.valid
              ? "bg-gradient-to-b from-emerald-950 to-slate-900 border-emerald-500"
              : "bg-gradient-to-b from-rose-950 to-slate-900 border-rose-500"
          }`}
        >
          {/* Header Status */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              {result.valid ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <XCircle className="h-6 w-6 text-rose-400" />
              )}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  {result.valid ? "CODE VERIFIED" : "VERIFICATION FAILED"}
                </span>
                <div className="text-base font-black">
                  {result.valid ? "VALID ACCESS PASS" : "DENIED / INVALID"}
                </div>
              </div>
            </div>
            {result.gatePass && (
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-mono font-bold">
                {result.gatePass.formattedCode}
              </span>
            )}
          </div>

          {/* Details if pass exists */}
          {result.gatePass ? (
            <div className="mt-3 space-y-2 text-xs">
              <div className="rounded-xl bg-black/30 p-3 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <User className="h-3.5 w-3.5" /> Person / Visitor:
                  </span>
                  <span className="font-bold text-sm text-white">
                    {result.gatePass.visitorName || "Resident Self-Pass"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Home className="h-3.5 w-3.5" /> Resident Unit:
                  </span>
                  <span className="font-bold text-amber-300">
                    Unit {result.gatePass.resident.unitNumber} ({result.gatePass.resident.name})
                  </span>
                </div>

                {result.gatePass.resident.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Phone className="h-3.5 w-3.5" /> Resident Phone:
                    </span>
                    <a
                      href={`tel:${result.gatePass.resident.phone}`}
                      className="font-mono text-blue-400 underline font-bold"
                    >
                      {result.gatePass.resident.phone}
                    </a>
                  </div>
                )}

                {result.gatePass.vehiclePlate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Car className="h-3.5 w-3.5" /> Vehicle:
                    </span>
                    <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                      {result.gatePass.vehiclePlate}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                    <Clock className="h-3.5 w-3.5" /> Direction:
                  </span>
                  <span className="font-bold text-emerald-300 uppercase">
                    {result.gatePass.direction}
                  </span>
                </div>
              </div>

              {!result.valid && (
                <div className="rounded-xl bg-rose-900/60 border border-rose-700 p-2.5 text-center text-xs font-bold text-rose-200">
                  {result.reason}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-black/30 p-3 text-center text-xs text-rose-300 font-semibold">
              {result.reason || "This code does not exist in the estate database."}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            {result.valid ? (
              <>
                <button
                  onClick={() => handleGrantAccess(result.gatePass?.direction)}
                  disabled={actionBusy}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" /> GRANT ACCESS
                </button>
                <button
                  onClick={handleDenyAccess}
                  disabled={actionBusy}
                  className="rounded-xl bg-rose-900/60 border border-rose-700 px-4 text-xs font-bold text-rose-300 hover:bg-rose-900 active:scale-95 transition-all"
                >
                  DENY
                </button>
              </>
            ) : (
              <button
                onClick={handleDenyAccess}
                disabled={actionBusy}
                className="w-full rounded-xl bg-rose-600 py-3 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 active:scale-95 transition-all"
              >
                LOG DENIED ATTEMPT
              </button>
            )}
          </div>
        </div>
      )}

      {/* Code Entry Terminal */}
      <div className="rounded-3xl bg-slate-800/90 border border-slate-700 p-4 shadow-xl">
        <div className="text-center">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Enter 6-Digit Pass Code
          </label>
          <div className="mt-2 flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 border border-slate-700 shadow-inner">
            <span className="font-mono text-3xl font-black tracking-widest text-blue-400">
              {displayCode()}
            </span>
          </div>
        </div>

        {/* On-Screen Numeric Keypad */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              onClick={() => pressKey(num)}
              className="h-13 rounded-2xl bg-slate-700/60 text-xl font-bold text-white hover:bg-slate-700 active:bg-blue-600 active:text-white transition-all shadow-xs"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-800 text-xs font-bold text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
          >
            CLEAR
          </button>
          <button
            onClick={() => pressKey("0")}
            className="h-13 rounded-2xl bg-slate-700/60 text-xl font-bold text-white hover:bg-slate-700 active:bg-blue-600 active:text-white transition-all shadow-xs"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-13 rounded-2xl bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-rose-400 flex items-center justify-center transition-all"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Verify Action Button */}
        <button
          onClick={() => handleVerify()}
          disabled={loading || codeInput.length === 0}
          className="w-full mt-4 rounded-xl bg-blue-600 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <ShieldCheck className="h-5 w-5" /> VERIFY PASS CODE
            </>
          )}
        </button>
      </div>

      {/* Shift Activity Log */}
      <div className="border-t border-slate-800 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Recent Gate Log Today
          </span>
          <button onClick={fetchStats} className="text-[10px] text-blue-400 font-bold hover:underline">
            Refresh
          </button>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {recentLogs.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-3">No activity logged yet today.</p>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl bg-slate-800/60 border border-slate-700/50 p-2 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-200">
                    {log.visitor?.fullName || log.resident?.firstName || "Resident"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Unit {log.resident?.property?.unitNumber || "N/A"} • {formatDateTime(log.createdAt)}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    log.action === "ENTRY"
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : log.action === "EXIT"
                      ? "bg-blue-950 text-blue-400 border border-blue-800"
                      : "bg-rose-950 text-rose-400 border border-rose-800"
                  }`}
                >
                  {log.action}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
