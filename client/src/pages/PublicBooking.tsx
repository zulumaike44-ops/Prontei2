/**
 * PublicBooking — Página pública de agendamento online
 *
 * Mobile-first, componentizada, com cores do tenant.
 * Fluxo: Serviço → Profissional → Data/Hora → Dados → Confirmação → Sucesso
 */

import { useState, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { BookingHeroCard } from "@/components/booking/BookingHeroCard";
import { ServiceSelector } from "@/components/booking/ServiceSelector";
import { ProfessionalSelector } from "@/components/booking/ProfessionalSelector";
import { QuickSlotsSection } from "@/components/booking/QuickSlotsSection";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { DaySlotsGrid } from "@/components/booking/DaySlotsGrid";
import { CustomerForm, isValidPhone } from "@/components/booking/CustomerForm";
import { BookingSummaryCard } from "@/components/booking/BookingSummaryCard";
import { BookingSuccess } from "@/components/booking/BookingSuccess";

// ============================================================
// TYPES
// ============================================================

interface Establishment {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressNeighborhood: string | null;
  timezone: string;
  primaryColor: string | null;
  secondaryColor: string | null;
}

interface Professional {
  id: number;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  serviceIds: number[];
}

interface Service {
  id: number;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: string;
  category: string | null;
}

interface BookingResult {
  success: boolean;
  appointment: {
    id: number;
    manageToken: string;
    professionalName: string;
    serviceName: string;
    date: string;
    time: string;
    durationMinutes: number;
    price: string;
    status: string;
    establishmentName: string;
    establishmentPhone: string | null;
  };
}

// ============================================================
// STEP INDICATOR
// ============================================================

function StepIndicator({
  currentStep,
  totalSteps,
  primaryColor,
}: {
  currentStep: number;
  totalSteps: number;
  primaryColor: string;
}) {
  const steps = ["Serviço", "Profissional", "Data/Hora", "Dados", "Confirmar"];
  return (
    <div className="flex items-center justify-center gap-0.5 mb-5">
      {steps.slice(0, totalSteps).map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                style={
                  isActive
                    ? { backgroundColor: primaryColor, color: "#fff" }
                    : isCompleted
                    ? { backgroundColor: `${primaryColor}25`, color: primaryColor }
                    : { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }
                }
              >
                {isCompleted ? "\u2713" : stepNum}
              </div>
              <span
                className="text-[9px] mt-0.5 font-medium"
                style={{
                  color: isActive ? primaryColor : "var(--muted-foreground)",
                }}
              >
                {label}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div
                className="w-6 h-0.5 mx-0.5 mb-3"
                style={{
                  backgroundColor:
                    stepNum < currentStep ? `${primaryColor}40` : "var(--muted)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PublicBooking() {
  const [, params] = useRoute("/agendar/:slug");
  const slug = params?.slug ?? "";

  // Data
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Steps
  const [step, setStep] = useState(1);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Effective values (from availability API)
  const [effectiveDuration, setEffectiveDuration] = useState(0);
  const [effectivePrice, setEffectivePrice] = useState("0");

  // Customer form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Success
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Colors
  const primaryColor = establishment?.primaryColor || "#6C3483";
  const secondaryColor = establishment?.secondaryColor || "#FFFFFF";

  // ============================================================
  // LOAD ESTABLISHMENT DATA
  // ============================================================

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`/api/public/booking/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Estabelecimento não encontrado");
        return r.json();
      })
      .then((data) => {
        setEstablishment(data.establishment);
        setProfessionals(
          data.professionals.map((p: any) => ({
            ...p,
            photoUrl: p.avatarUrl,
          }))
        );
        setServices(data.services);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  // ============================================================
  // DERIVED STATE
  // ============================================================

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === selectedProfessionalId) ?? null,
    [professionals, selectedProfessionalId]
  );

  const filteredProfessionals = useMemo(() => {
    if (!selectedServiceId) return [];
    return professionals.filter((p) => p.serviceIds.includes(selectedServiceId));
  }, [selectedServiceId, professionals]);

  // Auto-select professional if only one available
  useEffect(() => {
    if (step === 2 && filteredProfessionals.length === 1) {
      setSelectedProfessionalId(filteredProfessionals[0].id);
      setStep(3);
    }
  }, [step, filteredProfessionals]);

  // Build address string
  const addressStr = useMemo(() => {
    if (!establishment) return null;
    const parts = [
      establishment.addressStreet,
      establishment.addressNumber,
      establishment.addressNeighborhood,
      establishment.addressCity,
      establishment.addressState,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }, [establishment]);

  // ============================================================
  // QUICK SLOT HANDLER
  // ============================================================

  function handleQuickSlot(date: string, time: string, professionalId: number) {
    setSelectedDate(date);
    setSelectedTime(time);
    setSelectedProfessionalId(professionalId);
    setStep(4); // Go directly to customer form
  }

  // ============================================================
  // SUBMIT BOOKING
  // ============================================================

  async function handleSubmit() {
    const profId = selectedProfessionalId;
    if (!selectedServiceId || !profId || !selectedDate || !selectedTime) return;
    if (!customerName.trim() || !isValidPhone(customerPhone)) {
      toast.error("Preencha seu nome e telefone corretamente.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          professionalId: profId,
          serviceId: selectedServiceId,
          date: selectedDate,
          time: selectedTime,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.error || "Erro ao agendar.");
      }

      const data: BookingResult = await r.json();
      setBookingResult(data);
      toast.success("Agendamento confirmado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar agendamento.");
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================================
  // RESET
  // ============================================================

  function resetBooking() {
    setBookingResult(null);
    setStep(1);
    setSelectedServiceId(null);
    setSelectedProfessionalId(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setEffectiveDuration(0);
    setEffectivePrice("0");
  }

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  function formatPrice(price: string): string {
    const num = parseFloat(price);
    if (isNaN(num) || num === 0) return "Grátis";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  }

  function formatDateBR(dateStr: string): string {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  // ============================================================
  // LOADING / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (error || !establishment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">Estabelecimento não encontrado</h2>
          <p className="text-sm text-muted-foreground">
            Verifique se o link está correto ou entre em contato com o estabelecimento.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUCCESS STATE
  // ============================================================

  if (bookingResult) {
    const appt = bookingResult.appointment;
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 py-6">
          <BookingSuccess
            summary={{
              serviceName: appt.serviceName,
              professionalName: appt.professionalName,
              date: formatDateBR(appt.date),
              time: appt.time,
              price: formatPrice(appt.price),
              duration: `${appt.durationMinutes} min`,
              establishmentName: appt.establishmentName,
              establishmentPhone: appt.establishmentPhone,
            }}
            manageToken={appt.manageToken}
            slug={slug}
            primaryColor={primaryColor}
            onBookAgain={resetBooking}
          />
          <div className="text-center mt-8 text-xs text-muted-foreground">
            Agendamento online por <span className="font-medium">Prontei</span>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // BOOKING FLOW
  // ============================================================

  // Determine the actual professional ID for calendar/slots
  // If "any professional" is selected (null), use the first filtered one
  const calendarProfId = selectedProfessionalId ?? filteredProfessionals[0]?.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Hero */}
        <BookingHeroCard
          name={establishment.name}
          description={establishment.description}
          logoUrl={establishment.logoUrl}
          phone={establishment.phone}
          address={addressStr}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />

        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={5} primaryColor={primaryColor} />

        {/* STEP 1: Service */}
        {step === 1 && (
          <div className="space-y-4">
            <ServiceSelector
              services={services.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description,
                durationMinutes: s.durationMinutes,
                price: s.price,
                category: s.category,
              }))}
              selectedServiceId={selectedServiceId}
              onSelect={(id) => {
                setSelectedServiceId(id);
                setSelectedProfessionalId(null);
                setSelectedDate(null);
                setSelectedTime(null);
              }}
              primaryColor={primaryColor}
            />
            {selectedServiceId && (
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Continuar <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
            )}
          </div>
        )}

        {/* STEP 2: Professional */}
        {step === 2 && (
          <div className="space-y-4">
            <ProfessionalSelector
              professionals={filteredProfessionals.map((p) => ({
                id: p.id,
                name: p.name,
                photoUrl: p.avatarUrl,
                bio: p.bio,
                serviceIds: p.serviceIds,
              }))}
              selectedProfessionalId={selectedProfessionalId}
              onSelect={(id) => setSelectedProfessionalId(id)}
              serviceId={selectedServiceId}
              primaryColor={primaryColor}
              showAnyOption={filteredProfessionals.length > 1}
            />

            {/* QuickSlots appear after selecting professional */}
            {selectedServiceId && (selectedProfessionalId !== undefined) && (
              <QuickSlotsSection
                slug={slug}
                serviceId={selectedServiceId}
                professionalId={selectedProfessionalId}
                onSelectSlot={handleQuickSlot}
                primaryColor={primaryColor}
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4 inline mr-1" /> Voltar
              </button>
              {(selectedProfessionalId !== undefined) && (
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Date & Time */}
        {step === 3 && calendarProfId && selectedServiceId && (
          <div className="space-y-4">
            <BookingCalendar
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              slug={slug}
              professionalId={calendarProfId}
              serviceId={selectedServiceId}
              primaryColor={primaryColor}
            />

            {selectedDate && (
              <DaySlotsGrid
                slug={slug}
                professionalId={calendarProfId}
                serviceId={selectedServiceId}
                date={selectedDate}
                selectedTime={selectedTime}
                onSelectTime={setSelectedTime}
                primaryColor={primaryColor}
                onAvailabilityLoaded={(dur, price) => {
                  setEffectiveDuration(dur);
                  setEffectivePrice(price);
                }}
              />
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep(2);
                  setSelectedDate(null);
                  setSelectedTime(null);
                }}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4 inline mr-1" /> Voltar
              </button>
              {selectedTime && (
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Customer Data */}
        {step === 4 && (
          <div className="space-y-4">
            <CustomerForm
              customerName={customerName}
              customerPhone={customerPhone}
              notes={notes}
              onChangeName={setCustomerName}
              onChangePhone={setCustomerPhone}
              onChangeNotes={setNotes}
              primaryColor={primaryColor}
              slug={slug}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground bg-card hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4 inline mr-1" /> Voltar
              </button>
              {customerName.trim().length >= 2 && isValidPhone(customerPhone) && (
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Revisar <ChevronRight className="w-4 h-4 inline ml-1" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Summary & Confirm */}
        {step === 5 && selectedService && selectedDate && selectedTime && (
          <BookingSummaryCard
            serviceName={selectedService.name}
            professionalName={
              selectedProfessional?.name ??
              filteredProfessionals.find((p) => p.id === calendarProfId)?.name ??
              "Profissional"
            }
            date={selectedDate}
            time={selectedTime}
            durationMinutes={effectiveDuration || selectedService.durationMinutes}
            price={effectivePrice !== "0" ? effectivePrice : selectedService.price}
            customerName={customerName}
            customerPhone={customerPhone}
            notes={notes}
            onConfirm={handleSubmit}
            onBack={() => setStep(4)}
            loading={submitting}
            primaryColor={primaryColor}
          />
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-6 text-xs text-muted-foreground">
          Agendamento online por <span className="font-medium">Prontei</span>
        </div>
      </div>
    </div>
  );
}
