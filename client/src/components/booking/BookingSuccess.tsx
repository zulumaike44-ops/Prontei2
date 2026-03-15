/**
 * BookingSuccess — Tela de sucesso após agendamento
 *
 * Exibe resumo, link de gerenciamento, prompt de instalação PWA e opções de ação.
 */

import { CheckCircle2, Copy, ExternalLink, CalendarPlus, Check, Download, ClipboardList } from "lucide-react";
import { useState, useEffect } from "react";

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(manageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const input = document.createElement("input");
      input.value = manageUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="text-center space-y-5">
      {/* Success icon */}
      <div className="flex justify-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}15` }}
        >
          <CheckCircle2
            className="w-10 h-10"
            style={{ color: primaryColor }}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">Agendamento confirmado!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Seu horário está reservado em {summary.establishmentName}.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Serviço</span>
          <span className="font-medium text-foreground">{summary.serviceName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Profissional</span>
          <span className="font-medium text-foreground">{summary.professionalName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Data</span>
          <span className="font-medium text-foreground">{summary.date}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Horário</span>
          <span className="font-medium text-foreground">{summary.time}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Duração</span>
          <span className="font-medium text-foreground">{summary.duration}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Valor</span>
          <span className="font-bold" style={{ color: primaryColor }}>
            {summary.price}
          </span>
        </div>
      </div>

      {/* Manage link */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          Guarde este link para gerenciar seu agendamento:
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={manageUrl}
            className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 text-muted-foreground truncate border-none outline-none"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted transition-colors flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copiar
              </>
            )}
          </button>
        </div>
        <a
          href={manageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs hover:underline"
          style={{ color: primaryColor }}
        >
          <ExternalLink className="w-3 h-3" />
          Abrir página de gerenciamento
        </a>
      </div>

      {/* PWA Install Banner */}
      {showInstallBanner && !installed && (
        <div
          className="rounded-xl border-2 p-4 space-y-3"
          style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <Download className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">
                Instalar Prontei no celular
              </p>
              <p className="text-xs text-muted-foreground">
                Acesse seus agendamentos direto da tela inicial, sem precisar de app store.
              </p>
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <Download className="w-4 h-4" />
            Instalar agora
          </button>
        </div>
      )}

      {/* Installed confirmation */}
      {installed && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-3">
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" />
            Prontei instalado no seu celular!
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <a
          href={myAppointmentsUrl}
          className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
          style={{ backgroundColor: primaryColor }}
        >
          <ClipboardList className="w-4 h-4" />
          Ver meus agendamentos
        </a>
        <button
          onClick={onBookAgain}
          className="w-full py-3 rounded-xl text-sm font-medium border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center gap-2 text-foreground"
        >
          <CalendarPlus className="w-4 h-4" />
          Fazer outro agendamento
        </button>
      </div>
    </div>
  );
}
