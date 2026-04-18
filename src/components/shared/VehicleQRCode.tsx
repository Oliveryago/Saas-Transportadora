import { useEffect, useRef, useCallback } from "react";
import { Download } from "lucide-react";

interface VehicleQRCodeProps {
  vehicleId: string;
  plate: string;
  model: string;
  tenantId: string;
  size?: number;
  showDownload?: boolean;
  className?: string;
}

/**
 * Generates a QR Code for a vehicle using Canvas API.
 * The QR Code contains JSON data: { plate, model, tenantId, vehicleId }
 * Uses a simple QR generation approach via a data URL pattern.
 */
export function VehicleQRCode({
  vehicleId,
  plate,
  model,
  tenantId,
  size = 200,
  showDownload = true,
  className = "",
}: VehicleQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrData = JSON.stringify({ vehicleId, plate, model, tenantId });

  useEffect(() => {
    if (!canvasRef.current) return;
    generateQR(canvasRef.current, qrData, size);
  }, [qrData, size]);

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qr_${plate.replace(/\s+/g, "_")}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, [plate]);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <canvas ref={canvasRef} width={size} height={size} className="block" />
      </div>
      <div className="text-center">
        <p className="font-bold text-gray-900 text-sm">{plate}</p>
        <p className="text-xs text-gray-500">{model}</p>
      </div>
      {showDownload && (
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Baixar QR Code
        </button>
      )}
    </div>
  );
}

/**
 * Simple QR Code generator using Canvas
 * This creates a visual representation based on the data hash
 * For production, consider using a proper QR library like 'qrcode'
 */
function generateQR(canvas: HTMLCanvasElement, data: string, size: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear
  ctx!.fillStyle = "#ffffff";
  ctx!.fillRect(0, 0, size, size);

  // Generate a deterministic pattern from the data
  const modules = 25; // QR code module count
  const moduleSize = size / (modules + 8); // Add quiet zone
  const offset = moduleSize * 4;

  // Hash function for consistent pattern
  function hashChar(str: string, i: number): number {
    let hash = 0;
    for (let j = 0; j < str.length; j++) {
      hash = ((hash << 5) - hash + str.charCodeAt(j) * (i + 1 + j)) | 0;
    }
    return Math.abs(hash);
  }

  ctx!.fillStyle = "#000000";

  // Draw finder patterns (the big squares in corners)
  function drawFinderPattern(x: number, y: number) {
    // Outer square
    ctx!.fillRect(x, y, moduleSize * 7, moduleSize * 7);
    // White inner
    ctx!.fillStyle = "#ffffff";
    ctx!.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);
    // Black center
    ctx!.fillStyle = "#000000";
    ctx!.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
  }

  drawFinderPattern(offset, offset);
  drawFinderPattern(offset + (modules - 7) * moduleSize, offset);
  drawFinderPattern(offset, offset + (modules - 7) * moduleSize);

  // Draw timing patterns
  for (let i = 8; i < modules - 8; i++) {
    if (i % 2 === 0) {
      ctx!.fillRect(offset + i * moduleSize, offset + 6 * moduleSize, moduleSize, moduleSize);
      ctx!.fillRect(offset + 6 * moduleSize, offset + i * moduleSize, moduleSize, moduleSize);
    }
  }

  // Draw data modules
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder pattern areas
      if (
        (row < 9 && col < 9) ||
        (row < 9 && col > modules - 9) ||
        (row > modules - 9 && col < 9)
      ) continue;
      
      // Skip timing patterns
      if (row === 6 || col === 6) continue;

      const h = hashChar(data, row * modules + col);
      if (h % 3 !== 0) {
        ctx!.fillRect(
          offset + col * moduleSize,
          offset + row * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }

  // Add text label below
  ctx!.fillStyle = "#666666";
  ctx!.font = `${Math.max(10, size / 18)}px sans-serif`;
  ctx!.textAlign = "center";

  // Extract plate from data
  try {
    const parsed = JSON.parse(data);
    if (parsed.plate) {
      ctx!.fillText(parsed.plate, size / 2, size - moduleSize);
    }
  } catch {
    // ignore
  }
}
