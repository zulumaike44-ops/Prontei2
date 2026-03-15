import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Professionals from "./pages/Professionals";
import Services from "./pages/Services";
import WorkingHours from "./pages/WorkingHours";
import BlockedTimes from "./pages/BlockedTimes";
import Customers from "./pages/Customers";
import Appointments from "./pages/Appointments";
import Agenda from "./pages/Agenda";
import WhatsAppSettings from "./pages/WhatsAppSettings";
import WhatsAppConversations from "./pages/WhatsAppConversations";
import WhatsAppConversationDetail from "./pages/WhatsAppConversationDetail";
import PublicBooking from "./pages/PublicBooking";
import PublicAppointmentManage from "./pages/PublicAppointmentManage";
import MyAppointments from "./pages/MyAppointments";
import RescheduleAppointment from "./pages/RescheduleAppointment";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/settings" component={Settings} />
      <Route path="/professionals" component={Professionals} />
      <Route path="/services" component={Services} />
      <Route path="/working-hours/:id" component={WorkingHours} />
      <Route path="/blocked-times" component={BlockedTimes} />
      <Route path="/customers" component={Customers} />
      <Route path="/appointments" component={Appointments} />
      <Route path="/dashboard/agenda" component={Agenda} />
      <Route path="/dashboard/whatsapp" component={WhatsAppSettings} />
      <Route path="/dashboard/whatsapp/conversations" component={WhatsAppConversations} />
      <Route path="/dashboard/whatsapp/conversations/:id" component={WhatsAppConversationDetail} />
      <Route path="/agendar/:slug" component={PublicBooking} />
      <Route path="/agendamento/:token" component={PublicAppointmentManage} />
      <Route path="/meus-agendamentos" component={MyAppointments} />
      <Route path="/reagendar/:token" component={RescheduleAppointment} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
