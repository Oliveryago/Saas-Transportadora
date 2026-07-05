import React, { useRef, useState } from "react";
import { Camera, ImagePlus, X, Upload, AlertCircle } from "lucide-react";

interface PhotoUploadProps {
  module: string;
  photos: { id: string; url: string }[];
  uploading: boolean;
  progress: number;
  error: string | null;
  canAddMore: boolean;
  maxPhotos?: number;
  onUpload: (file: File) => Promise<any>;
  onRemove: (photoId: string) => Promise<void>;
  label?: string;
  className?: string;
}

export function PhotoUpload({
  photos,
  uploading,
  progress,
  error,
  canAddMore,
  maxPhotos = 5,
  onUpload,
  onRemove,
  label = "Fotos",
  className = "",
}: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    await onUpload(file);

    // Reset input para permitir selecionar mesmo arquivo novamente
    e.target.value = "";
  }

  async function handleRemove(photoId: string) {
    if (confirmRemove === photoId) {
      await onRemove(photoId);
      setConfirmRemove(null);
    } else {
      setConfirmRemove(photoId);
      // Auto-cancel depois de 3 segundos
      setTimeout(() => setConfirmRemove(null), 3000);
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label} ({photos.length}/{maxPhotos})
      </label>

      {/* Barra de progresso */}
      {uploading && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Upload className="w-4 h-4 animate-bounce" />
            <span>Enviando foto...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de fotos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
              <img
                src={photo.url}
                alt="Foto"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(photo.id)}
                className={`absolute top-1 right-1 p-1 rounded-full transition-all ${
                  confirmRemove === photo.id
                    ? "bg-red-600 text-white scale-110"
                    : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                }`}
                title={confirmRemove === photo.id ? "Clique novamente para confirmar" : "Remover foto"}
              >
                <X className="w-3 h-3" />
              </button>
              {confirmRemove === photo.id && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-xs text-center py-1">
                  Clique novamente para remover
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botões de ação */}
      {canAddMore && !uploading && (
        <div className="flex gap-2">
          {/* Input da câmera */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* Input da galeria */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-medium min-h-[44px]"
          >
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">Câmera</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm font-medium min-h-[44px]"
          >
            <ImagePlus className="w-5 h-5" />
            <span className="hidden sm:inline">Galeria</span>
          </button>
        </div>
      )}
    </div>
  );
}
