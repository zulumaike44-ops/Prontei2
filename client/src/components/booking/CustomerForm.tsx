/**
 * CustomerForm — Formulário de dados do cliente
 *
 * Campos: nome, telefone, observações (opcional).
 * Máscara de telefone brasileiro.
 */

import { User, Phone, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";

interface CustomerFormProps {
  customerName: string;
  customerPhone: string;
  notes: string;
  onChangeName: (name: string) => void;
  onChangePhone: (phone: string) => void;
  onChangeNotes: (notes: string) => void;
  primaryColor: string;
  /** Pre-fill from rebook */
  prefillName?: string;
  prefillPhone?: string;
}

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

export function CustomerForm({
  customerName,
  customerPhone,
  notes,
  onChangeName,
  onChangePhone,
  onChangeNotes,
  primaryColor,
  prefillName,
  prefillPhone,
}: CustomerFormProps) {
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  // Prefill
  useEffect(() => {
    if (prefillName && !customerName) onChangeName(prefillName);
    if (prefillPhone && !customerPhone) onChangePhone(prefillPhone);
  }, [prefillName, prefillPhone]);

  const phoneValid = !phoneTouched || isValidPhone(customerPhone);
  const nameValid = !nameTouched || customerName.trim().length >= 2;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base font-semibold text-foreground">Seus dados</span>
      </div>

      {/* Nome */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
          <User className="w-3.5 h-3.5" />
          Nome completo
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onChangeName(e.target.value)}
          onBlur={() => setNameTouched(true)}
          placeholder="Seu nome"
          className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
            !nameValid
              ? "border-destructive focus:ring-destructive/30"
              : "border-border focus:ring-primary/30"
          }`}
          style={
            nameValid
              ? { "--tw-ring-color": `${primaryColor}40` } as any
              : undefined
          }
        />
        {!nameValid && (
          <p className="text-xs text-destructive mt-1">Nome deve ter pelo menos 2 caracteres.</p>
        )}
      </div>

      {/* Telefone */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
          <Phone className="w-3.5 h-3.5" />
          Telefone (WhatsApp)
        </label>
        <input
          type="tel"
          value={formatPhoneBR(customerPhone)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
            onChangePhone(digits);
          }}
          onBlur={() => setPhoneTouched(true)}
          placeholder="(11) 99999-9999"
          className={`w-full px-3 py-2.5 rounded-lg border text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors ${
            !phoneValid
              ? "border-destructive focus:ring-destructive/30"
              : "border-border focus:ring-primary/30"
          }`}
          style={
            phoneValid
              ? { "--tw-ring-color": `${primaryColor}40` } as any
              : undefined
          }
        />
        {!phoneValid && (
          <p className="text-xs text-destructive mt-1">Informe um telefone válido com DDD.</p>
        )}
      </div>

      {/* Observações */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Observações
          <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="Alguma preferência ou observação?"
          rows={2}
          className="w-full px-3 py-2.5 rounded-lg border border-border text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors resize-none"
          style={{ "--tw-ring-color": `${primaryColor}40` } as any}
        />
      </div>
    </div>
  );
}

export { isValidPhone };
