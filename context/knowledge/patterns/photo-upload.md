# Pattern: Upload de Foto (PhotoUpload)

## Description

Padrão para upload de fotos (notas fiscais, CNH, fotos de perfil) via hook `usePhotoUpload` com upload para Supabase Storage, preview local, controle de progresso e múltiplas fotos.

## When to Use

Qualquer módulo que precisa fazer upload de imagem: nota fiscal de abastecimento, nota de manutenção, foto da CNH, foto do motorista.

## Pattern

```tsx
import { usePhotoUpload } from "../hooks/usePhotoUpload";

const {
  photos,         // Array de { id, url, file }
  uploading,      // boolean
  progress,       // 0-100
  error,
  uploadPhoto,    // (file: File) => Promise<void>
  removePhoto,    // (id: string) => void
  clearPhotos,    // () => void
  loadExistingPhotos, // (urls: string[]) => void — para edição
  canAddMore,     // boolean — respeita maxPhotos
} = usePhotoUpload({ module: "fuel_invoices", maxPhotos: 1 });
```

**Para câmera mobile (motorista):**
```tsx
<input
  type="file"
  accept="image/*"
  capture="environment"  // ← abre câmera traseira diretamente
  onChange={(e) => uploadPhoto(e.target.files?.[0])}
/>
```

## Example

Ver `src/components/shared/PhotoUpload.tsx` e `src/pages/DriverFuel.tsx`.

```tsx
// Uso no DriverFuel — câmera direta + preview
{photos.length === 0 ? (
  <label>
    {uploading ? <Loader /> : <ImagePlus />}
    <input type="file" accept="image/*" capture="environment" 
           onChange={handlePhoto} hidden />
  </label>
) : (
  <div className="relative">
    <img src={photos[0].url} />
    <button onClick={() => removePhoto(photos[0].id)}>X</button>
  </div>
)}
```

## Files Using This Pattern

- `src/hooks/usePhotoUpload.ts` — Hook base
- `src/components/shared/PhotoUpload.tsx` — Componente reutilizável (admin)
- `src/pages/DriverFuel.tsx` — Implementação inline para mobile
- `src/components/fuel/FuelModal.tsx` — Uso no modal admin

## Related

- [Decision: Tech Stack](../../decisions/001-tech-stack.md)
- [Feature: Abastecimento](../../intent/feature-abastecimento.md)

## Status

- **Created**: 2026-06-23
- **Status**: Active
