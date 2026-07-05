import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface UploadedPhoto {
  id: string;
  url: string;
  path: string;
}

interface UsePhotoUploadOptions {
  module: string;
  maxPhotos?: number;
  maxSizeKB?: number;
  quality?: number;
}

export function usePhotoUpload({ module, maxPhotos = 5, maxSizeKB = 800, quality = 0.85 }: UsePhotoUploadOptions) {
  const { tenant } = useAuth();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Comprime uma imagem usando Canvas API
   */
  const compressImage = useCallback(async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Redimensionar se muito grande (max 1920px de largura)
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Erro ao criar contexto de canvas"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Tentar WebP primeiro, fallback para JPEG
          const supportsWebP = canvas.toDataURL("image/webp").startsWith("data:image/webp");
          const mimeType = supportsWebP ? "image/webp" : "image/jpeg";

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Erro ao comprimir imagem"));
                return;
              }

              // Se ainda muito grande, reduzir mais a qualidade
              if (blob.size > maxSizeKB * 1024) {
                canvas.toBlob(
                  (smallerBlob) => {
                    resolve(smallerBlob || blob);
                  },
                  mimeType,
                  0.6
                );
              } else {
                resolve(blob);
              }
            },
            mimeType,
            quality
          );
        };
        img.onerror = () => reject(new Error("Erro ao carregar imagem"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsDataURL(file);
    });
  }, [maxSizeKB, quality]);

  /**
   * Faz upload de uma foto para Supabase Storage
   */
  const uploadPhoto = useCallback(async (file: File): Promise<UploadedPhoto | null> => {
    if (!tenant) {
      setError("Tenant não encontrado");
      return null;
    }

    if (photos.length >= maxPhotos) {
      setError(`Máximo de ${maxPhotos} fotos`);
      return null;
    }

    // Validar tamanho (5MB max antes da compressão)
    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo: 5MB");
      return null;
    }

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são aceitas");
      return null;
    }

    try {
      setUploading(true);
      setError(null);
      setProgress(20);

      // Comprimir
      const compressed = await compressImage(file);
      setProgress(50);

      // Gerar path
      const uuid = crypto.randomUUID();
      const ext = compressed.type === "image/webp" ? "webp" : "jpg";
      const storagePath = `${tenant.id}/${module}/${uuid}.${ext}`;

      // Upload
      const { error: uploadError } = await supabase.storage
        .from("Photo")
        .upload(storagePath, compressed, {
          contentType: compressed.type,
          cacheControl: "3600",
        });

      setProgress(80);

      if (uploadError) throw uploadError;

      // URL pública
      const { data: urlData } = supabase.storage
        .from("Photo")
        .getPublicUrl(storagePath);

      setProgress(100);

      const photo: UploadedPhoto = {
        id: uuid,
        url: urlData.publicUrl,
        path: storagePath,
      };

      setPhotos(prev => [...prev, photo]);
      return photo;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao fazer upload";
      setError(message);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [tenant, module, photos.length, maxPhotos, compressImage]);

  /**
   * Remove uma foto do storage e da lista
   */
  const removePhoto = useCallback(async (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    try {
      await supabase.storage.from("Photo").remove([photo.path]);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (err) {
      console.error("Erro ao remover foto:", err);
    }
  }, [photos]);

  /**
   * Limpa todas as fotos
   */
  const clearPhotos = useCallback(() => {
    setPhotos([]);
    setError(null);
  }, []);

  /**
   * Carrega fotos existentes (para edição de registros)
   */
  const loadExistingPhotos = useCallback((urls: string[]) => {
    const existing: UploadedPhoto[] = urls.map((url, i) => ({
      id: `existing-${i}`,
      url,
      path: "",
    }));
    setPhotos(existing);
  }, []);

  return {
    photos,
    uploading,
    progress,
    error,
    uploadPhoto,
    removePhoto,
    clearPhotos,
    loadExistingPhotos,
    canAddMore: photos.length < maxPhotos,
  };
}
