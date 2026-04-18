import React, { useRef, useState } from "react";
import { Camera, ImagePlus, X, Upload, AlertCircle, Check } from "lucide-react";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview antes de confirmar
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewFile(file);

    // Reset input para permitir selecionar mesmo arquivo novamente
    e.target.value = "";
  }

  async function confirmUpload() {
    if (!previewFile) return;
    await onUpload(previewFile);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewFile(null);
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

      {/* Preview de confirmação */}
      {previewUrl && (
        <div className="relative rounded-lg overflow-hidden border-2 border-blue-500 bg-black/5">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-48 object-contain bg-gray-50"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 p-3 flex items-center justify-between">
            <span className="text-white text-sm font-medium">Confirmar upload?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelPreview}
                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={confirmUpload}
                disabled={uploading}
                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
      {canAddMore && !previewUrl && !uploading && (
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
