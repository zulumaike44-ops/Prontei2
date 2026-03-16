/**
 * BookingSuccess — Tela de sucesso após agendamento
 *
 * Exibe resumo, link de gerenciamento, prompt de instalação PWA e opções de ação.
 * Inclui animação de confetti e celebração visual.
 */

import { CheckCircle2, Copy, ExternalLink, CalendarPlus, Check, Download, ClipboardList, PartyPopper } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface BookingSuccessProps {
  summary: {
    serviceName: string;
    professionalName: string;
    date: string;
    time: string;
    price: string;
    duration: string;
    establishmentName: string;
    establishmentPhone: string | null;
  };
  manageToken: string;
  slug: string;
  primaryColor: string;
  onBookAgain: () => void;
}

// Confetti colors
const CONFETTI_COLORS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316",
];

function createConfetti() {
  const container = document.createElement("div");
  container.id = "prontei-confetti";
  document.body.appendChild(container);

  for (let i = 0; i < 40; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.animationDuration = `${2 + Math.random() * 2}s`;
    piece.style.width = `${6 + Math.random() * 6}px`;
    piece.style.height = `${6 + Math.random() * 6}px`;
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    container.appendChild(piece);
  }

  setTimeout(() => {
    container.remove();
  }, 5000);
}

export function BookingSuccess({
  summary,
  manageToken,
  slug,
  primaryColor,
  onBookAgain,
}: BookingSuccessProps) {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  const manageUrl = `${window.location.origin}/agendamento/${manageToken}`;
  const myAppointmentsUrl = `${window.location.origin}/meus-agendamentos?slug=${slug}`;

  // Trigger confetti on mount
  useEffect(() => {
    createConfetti();
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  }

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(manageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = manageUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [manageUrl]);

  return (
    <div className="text-center space-y-5 page-enter">
      {/* Success icon with pulse ring */}
      <div className="flex justify-center pt-2">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full animate-pulse-ring"
            style={{ backgroundColor: `${primaryColor}20` }}
          />
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center animate-bounce-in relative z-10"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <CheckCircle2
              className="w-12 h-12"
              style={{ color: primaryColor }}
            />
          </div>
        </div>
      </div>

      <div className="animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Prontei!</h2>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Seu horário está reservado em <span className="font-semibold text-foreground">{summary.establishmentName}</span>.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border bg-card p-5 text-left space-y-2.5 shadow-sm animate-fade-in-up" style={{ animationDelay: "0.3s", opacity: 0 }}>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Serviço</span>
          <span className="font-semibold text-foreground">{summary.serviceName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Profissional</span>
          <span className="font-semibold text-foreground">{summary.professionalName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Data</span>
          <span className="font-semibold text-foreground">{summary.date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Horário</span>
          <span className="font-semibold text-foreground">{summary.time}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Duração</span>
          <span className="font-semibold text-foreground">{summary.duration}</span>
        </div>
        <div className="border-t border-border pt-2 mt-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor</span>
            <span className="font-bold text-base" style={{ color: primaryColor }}>
              {summary.price}
            </span>
          </div>
        </div>
      </div>

      {/* Manage link */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-sm animate-fade-in-up" style={{ animationDelay: "0.4s", opacity: 0 }}>
        <p className="text-xs text-muted-foreground font-medium">
          Guarde este link para gerenciar seu agendamento:
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={manageUrl}
            className="flex-1 text-xs bg-muted rounded-lg px-3 py-2.5 text-muted-foreground truncate border-none outline-none"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3.5 py-2.5 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted transition-all tap-feedback flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </>
            )}
          </button>
        </div>
        <a
          href={manageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors"
          style={{ color: primaryColor }}
        >
          <ExternalLink className="w-3 h-3" />
          Abrir página de gerenciamento
        </a>
      </div>

      {/* PWA Install Banner */}
      {showInstallBanner && !installed && (
        <div
          className="rounded-xl border-2 p-4 space-y-3 animate-fade-in-scale"
          style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 animate-float"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Download className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">
                Instalar Prontei no celular
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Acesse seus agendamentos direto da tela inicial, sem app store.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 btn-press shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            <Download className="w-4 h-4" />
            Instalar agora
          </button>
        </div>
      )}

      {/* Installed confirmation */}
      {installed && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-3 animate-fade-in-scale">
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center justify-center gap-2 font-medium">
            <Check className="w-4 h-4" />
            Prontei instalado no seu celular!
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2.5 animate-fade-in-up" style={{ animationDelay: "0.5s", opacity: 0 }}>
        <a
          href={myAppointmentsUrl}
          className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 btn-press shadow-md"
          style={{ backgroundColor: primaryColor }}
        >
          <ClipboardList className="w-4 h-4" />
          Ver meus agendamentos
        </a>
        <button
          onClick={onBookAgain}
          className="w-full py-3.5 rounded-xl text-sm font-semibold border border-border bg-card hover:bg-muted transition-all flex items-center justify-center gap-2 text-foreground tap-feedback"
        >
          <CalendarPlus className="w-4 h-4" />
          Fazer outro agendamento
        </button>
      </div>
    </div>
  );
}
