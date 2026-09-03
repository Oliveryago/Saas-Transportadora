import React from "react";
import { AttachedDocumentCard } from "../shared/AttachedDocumentCard";

interface CnhDocumentCardProps {
  storagePath: string;
  fileName?: string;
  signedUrlLoader: (path: string) => Promise<string | null>;
  onRemove: () => Promise<void> | void;
}

export const CnhDocumentCard: React.FC<CnhDocumentCardProps> = (props) => (
  <AttachedDocumentCard
    title="Documento da CNH"
    removeConfirmMessage="Remover o arquivo da CNH? Você poderá enviar outro."
    {...props}
  />
);
