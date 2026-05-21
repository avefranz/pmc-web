import { useRef, useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface SignatureCanvasProps {
  onChange: (file: File | null) => void;
  className?: string;
}

export function SignatureCanvas({ onChange, className }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  // Resize canvas to match display size once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

  const getPos = (canvas: HTMLCanvasElement, e: MouseEvent | Touch) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const emitFile = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) { onChange(null); return; }
      const file = new File([blob], "signature.png", { type: "image/png" });
      onChange(file);
    }, "image/png");
  }, [onChange]);

  // ── Mouse events ─────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    const pos = getPos(canvas, e.nativeEvent);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(canvas, e.nativeEvent);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setHasDrawing(true);
    emitFile();
  }, [emitFile]);

  // ── Touch events ─────────────────────────────────────────────────────────────

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawingRef.current = true;
    const touch = e.touches[0];
    const pos = getPos(canvas, touch as unknown as Touch);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const touch = e.touches[0];
    const pos = getPos(canvas, touch as unknown as Touch);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setHasDrawing(true);
    emitFile();
  }, [emitFile]);

  // ── Clear ─────────────────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    setHasDrawing(false);
    onChange(null);
  }, [onChange]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={cn(
            "w-full h-14 rounded-lg bg-white touch-none cursor-crosshair",
            hasDrawing
              ? "border-2 border-fg/30"
              : "border-2 border-dashed border-border",
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {!hasDrawing && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-fg-muted pointer-events-none select-none">
            Draw your signature here
          </p>
        )}
      </div>
      {hasDrawing && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-fg-muted hover:text-fg transition-colors underline underline-offset-2"
        >
          Clear signature
        </button>
      )}
    </div>
  );
}
