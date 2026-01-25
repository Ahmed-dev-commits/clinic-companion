import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { DashboardPage } from "./pages/Dashboard";
import { PatientsPage } from "./pages/Patients";
import { FeesPage } from "./pages/Fees";
import { StockPage } from "./pages/Stock";
import { PrescriptionsPage } from "./pages/Prescriptions";
import { LabResultsPage } from "./pages/LabResults";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/fees" element={<FeesPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/prescriptions" element={<PrescriptionsPage />} />
            <Route path="/lab-results" element={<LabResultsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
