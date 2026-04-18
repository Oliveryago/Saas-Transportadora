import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { Camera, X, Keyboard, AlertCircle, Loader2 } from "lucide-react";

interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  title?: string;
  placeholder?: string;
}

export function QRCodeScanner({
  onScan,
  onClose,
  title = "Escanear Código",
  placeholder = "Digite o código manualmente",
}: QRCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Beep sound via Web Audio API
  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = 1200;
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio context may not be available
    }
  }, []);

  // Haptic feedback
  const vibrate = useCallback(() => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch {
      // Vibration API may not be available
    }
  }, []);

  useEffect(() => {
    if (!scanning || manualMode) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    // Timeout de 30 segundos
    timeoutRef.current = setTimeout(() => {
      setTimeoutReached(true);
      setScanning(false);
      reader.reset();
    }, 30000);

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
        if (result) {
          playBeep();
          vibrate();
          setScanning(false);
          reader.reset();
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          onScan(result.getText());
        }
        if (err && !(err instanceof NotFoundException)) {
          // Ignore NotFoundException (normal when no code is visible)
          console.warn("QR scan error:", err);
        }
      })
      .catch((err: any) => {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
        setScanning(false);
        console.error("Camera access error:", err);
      });

    return () => {
      reader.reset();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scanning, manualMode, onScan, playBeep, vibrate]);

  function handleManualSubmit() {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  }

  function handleRetry() {
    setTimeoutReached(false);
    setError(null);
    setScanning(true);
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Camera className="w-5 h-5" />
          {title}
        </h3>
        <button
          onClick={onClose}
          className="p-2 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera view */}
      {scanning && !manualMode && (
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
          />
          {/* Scanning overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 relative">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
              {/* Scanning line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-green-400 opacity-75 animate-scan" />
            </div>
          </div>
          {/* Loading indicator */}
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <div className="inline-flex items-center gap-2 bg-black/60 text-white text-sm px-4 py-2 rounded-full">
              <Loader2 className="w-4 h-4 animate-spin" />
              Posicione o código na área verde
            </div>
          </div>
        </div>
      )}

      {/* Error / Timeout state */}
      {(error || timeoutReached) && !manualMode && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-white text-lg font-bold mb-2">
              {error ? "Erro na câmera" : "Tempo esgotado"}
            </h3>
            <p className="text-white/70 text-sm mb-6">
              {error || "Não foi possível detectar um código em 30 segundos."}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => setManualMode(true)}
                className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium text-sm hover:bg-white/30 transition-colors"
              >
                Digitar Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual mode */}
      {manualMode && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="bg-white rounded-xl p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Keyboard className="w-5 h-5 text-gray-600" />
                <h3 className="font-bold text-gray-900">Digitação Manual</h3>
              </div>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[44px] mb-4"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setManualMode(false); handleRetry(); }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors min-h-[44px]"
                >
                  Voltar à Câmera
                </button>
                <button
                  onClick={handleManualSubmit}
                  disabled={!manualCode.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      {scanning && !manualMode && (
        <div className="px-4 py-4 bg-black/50 flex justify-center">
          <button
            onClick={() => { setScanning(false); setManualMode(true); if (readerRef.current) readerRef.current.reset(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg text-sm font-medium hover:bg-white/30 transition-colors min-h-[44px]"
          >
            <Keyboard className="w-4 h-4" />
            Digitar manualmente
          </button>
        </div>
      )}

      {/* CSS for scanning animation */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 8px; }
          50% { top: calc(100% - 8px); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
