import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Detect iOS
    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;

    if (isStandalone) {
      return; // Already installed
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show custom prompt for iOS if not installed (since iOS doesn't fire beforeinstallprompt)
    if (isIosDevice && !isStandalone) {
      // Only show after a short delay so it's not too aggressive
      const timer = setTimeout(() => {
        const hasDismissed = localStorage.getItem("pwa-prompt-dismissed");
        if (!hasDismissed) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
      // Just hide the banner, the user has to manually use the share menu
      alert('Para instalar no iOS: toque em "Compartilhar" (ícone do meio na barra inferior) e depois em "Adicionar à Tela de Início".');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", "true");
  };

  // Se não estiver logado ou não for driver, ou se já dispensou, não mostra
  if (!showPrompt || !user || user.role !== "driver") {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-indigo-600 text-white rounded-xl shadow-lg p-4 flex items-center justify-between animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm">Instalar App</p>
          <p className="text-xs text-indigo-100">
            Acesso rápido e offline
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="text-indigo-200 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
