import { useState, useEffect, useMemo, useCallback } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, Clock, MapPin, Phone, ChevronLeft, ChevronRight, Calendar, Scissors, User } from "lucide-react";
import { toast } from "sonner";

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

interface TimeSlot {
  start: string;
  end: string;
}

interface AvailabilityResult {
  slots: TimeSlot[];
  durationMinutes: number;
  effectivePrice: string;
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

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = ["Serviço", "Profissional", "Data e Hora", "Seus Dados"];
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {steps.slice(0, totalSteps).map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isCompleted
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? "✓" : stepNum}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className={`w-8 h-0.5 mx-1 mb-4 ${stepNum < currentStep ? "bg-primary/40" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// DATE PICKER
// ============================================================

function DatePicker({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days: { date: string; day: number; disabled: boolean }[] = [];

    // Empty slots for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: "", day: 0, disabled: true });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isPast = dateStr < today;
      days.push({ date: dateStr, day: d, disabled: isPast });
    }

    return days;
  }, [currentMonth, today]);

  const monthLabel = currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const goToPrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const canGoPrev = useMemo(() => {
    const now = new Date();
    return currentMonth > new Date(now.getFullYear(), now.getMonth(), 1);
  }, [currentMonth]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth} disabled={!canGoPrev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium capitalize">{monthLabel}</span>
        <Button variant="ghost" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {daysInMonth.map((item, i) => (
          <button
            key={i}
            disabled={item.disabled || !item.date}
            onClick={() => item.date && onSelectDate(item.date)}
            className={`h-9 w-full rounded-md text-sm transition-all ${
              !item.date
                ? ""
                : item.disabled
                ? "text-muted-foreground/40 cursor-not-allowed"
                : item.date === selectedDate
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : item.date === today
                ? "bg-primary/10 text-primary font-medium hover:bg-primary/20"
                : "hover:bg-muted text-foreground"
            }`}
          >
            {item.day || ""}
          </button>
        ))}
      </div>
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
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Success
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

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
        setProfessionals(data.professionals);
        setServices(data.services);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  // ============================================================
  // LOAD AVAILABILITY
  // ============================================================

  const loadAvailability = useCallback(async () => {
    if (!selectedProfessional || !selectedService || !selectedDate || !slug) return;
    setLoadingSlots(true);
    setSelectedTime(null);
    try {
      const params = new URLSearchParams({
        slug,
        professionalId: String(selectedProfessional.id),
        serviceId: String(selectedService.id),
        date: selectedDate,
      });
      const r = await fetch(`/api/public/availability?${params}`);
      if (!r.ok) throw new Error("Erro ao carregar horários");
      const data: AvailabilityResult = await r.json();
      setSlots(data.slots ?? []);
    } catch {
      toast.error("Erro ao carregar horários disponíveis.");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [slug, selectedProfessional, selectedService, selectedDate]);

  useEffect(() => {
    if (selectedDate && selectedProfessional && selectedService) {
      loadAvailability();
    }
  }, [selectedDate, loadAvailability]);

  // ============================================================
  // FILTERED PROFESSIONALS (by selected service)
  // ============================================================

  const filteredProfessionals = useMemo(() => {
    if (!selectedService) return [];
    return professionals.filter((p) => p.serviceIds.includes(selectedService.id));
  }, [selectedService, professionals]);

  // Auto-select professional if only one available
  useEffect(() => {
    if (filteredProfessionals.length === 1 && !selectedProfessional) {
      setSelectedProfessional(filteredProfessionals[0]);
      setStep(3);
    }
  }, [filteredProfessionals, selectedProfessional]);

  // ============================================================
  // SUBMIT BOOKING
  // ============================================================

  const handleSubmit = async () => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Preencha seu nome e telefone.");
      return;
    }
    if (customerPhone.replace(/\D/g, "").length < 10) {
      toast.error("Telefone inválido. Use o formato (DDD) + número.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          professionalId: selectedProfessional.id,
          serviceId: selectedService.id,
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
  };

  // ============================================================
  // FORMAT HELPERS
  // ============================================================

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(price));
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // ============================================================
  // LOADING / ERROR STATES
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !establishment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="text-5xl mb-4">😕</div>
            <h2 className="text-xl font-bold mb-2">Estabelecimento não encontrado</h2>
            <p className="text-muted-foreground">
              Verifique se o link está correto ou entre em contato com o estabelecimento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // SUCCESS STATE
  // ============================================================

  if (bookingResult) {
    const appt = bookingResult.appointment;
    const manageUrl = `${window.location.origin}/agendamento/${appt.manageToken}`;
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground mb-6">
              Seu horário foi reservado com sucesso.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary" />
                <span className="font-medium">{appt.serviceName}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span>com {appt.professionalName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="capitalize">{formatDate(appt.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>{appt.time} ({appt.durationMinutes}min)</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-primary">
                <span className="w-4 h-4 text-center">R$</span>
                <span>{formatPrice(appt.price)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Guarde este link para gerenciar seu agendamento:
              </p>
              <div className="bg-white border rounded-md p-2 text-xs break-all text-muted-foreground">
                {manageUrl}
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(manageUrl);
                  toast.success("Link copiado!");
                }}
              >
                Copiar link do agendamento
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setBookingResult(null);
                  setStep(1);
                  setSelectedService(null);
                  setSelectedProfessional(null);
                  setSelectedDate(null);
                  setSelectedTime(null);
                  setCustomerName("");
                  setCustomerPhone("");
                  setNotes("");
                }}
              >
                Fazer outro agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================
  // BOOKING FLOW
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {establishment.logoUrl ? (
              <img src={establishment.logoUrl} alt={establishment.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="w-5 h-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">{establishment.name}</h1>
              {establishment.addressCity && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {establishment.addressCity}{establishment.addressState ? `, ${establishment.addressState}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <StepIndicator currentStep={step} totalSteps={4} />

        {/* STEP 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-1">Escolha o serviço</h2>
            <p className="text-sm text-muted-foreground mb-4">Selecione o serviço que deseja agendar.</p>
            <div className="space-y-2">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service);
                    setSelectedProfessional(null);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setStep(2);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-sm ${
                    selectedService?.id === service.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{service.name}</div>
                      {service.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">{service.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {service.durationMinutes}min
                      </div>
                    </div>
                    <div className="text-primary font-bold text-sm">
                      {formatPrice(service.price)}
                    </div>
                  </div>
                </button>
              ))}
              {services.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum serviço disponível no momento.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Select Professional */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-1">Escolha o profissional</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Quem você prefere para {selectedService?.name?.toLowerCase()}?
            </p>
            <div className="space-y-2">
              {filteredProfessionals.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => {
                    setSelectedProfessional(prof);
                    setSelectedDate(null);
                    setSelectedTime(null);
                    setStep(3);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-sm ${
                    selectedProfessional?.id === prof.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {prof.avatarUrl ? (
                      <img src={prof.avatarUrl} alt={prof.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{prof.name}</div>
                      {prof.bio && <div className="text-xs text-muted-foreground">{prof.bio}</div>}
                    </div>
                  </div>
                </button>
              ))}
              {filteredProfessionals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum profissional disponível para este serviço.</p>
                </div>
              )}
            </div>
            <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          </div>
        )}

        {/* STEP 3: Select Date & Time */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold mb-1">Escolha a data e horário</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedService?.name} com {selectedProfessional?.name}
            </p>

            <Card className="mb-4">
              <CardContent className="pt-4 pb-4">
                <DatePicker selectedDate={selectedDate} onSelectDate={setSelectedDate} />
              </CardContent>
            </Card>

            {selectedDate && (
              <div>
                <h3 className="text-sm font-medium mb-2 capitalize">
                  Horários para {formatDate(selectedDate)}
                </h3>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Carregando horários...</span>
                  </div>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => setSelectedTime(slot.start)}
                          className={`py-2.5 px-2 rounded-md text-sm font-medium transition-all ${
                            selectedTime === slot.start
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-white border hover:border-primary/40 hover:bg-primary/5"
                          }`}
                        >
                          {slot.start}
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhum horário disponível nesta data.</p>
                    <p className="text-xs mt-1">Tente outra data.</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="ghost" onClick={() => { setStep(2); setSelectedProfessional(null); }}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              {selectedTime && (
                <Button className="flex-1" onClick={() => setStep(4)}>
                  Continuar <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Customer Data */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold mb-1">Seus dados</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Preencha seus dados para confirmar o agendamento.
            </p>

            {/* Summary */}
            <Card className="mb-4 bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-4">
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">{selectedService?.name}</span>
                    <span className="text-primary font-bold ml-auto">{selectedService && formatPrice(selectedService.price)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>{selectedProfessional?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="capitalize">{selectedDate && formatDate(selectedDate)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>{selectedTime} ({selectedService?.durationMinutes}min)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(formatPhone(e.target.value))}
                  maxLength={16}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Alguma preferência ou informação adicional?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="ghost" onClick={() => setStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting || !customerName.trim() || !customerPhone.trim()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  "Confirmar Agendamento"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground">
        Agendamento online por <span className="font-medium">Prontei</span>
      </div>
    </div>
  );
}
