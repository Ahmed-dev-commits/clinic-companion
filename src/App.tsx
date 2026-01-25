import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardPage } from "./pages/Dashboard";
import { PatientsPage } from "./pages/Patients";
import { FeesPage } from "./pages/Fees";
import { StockPage } from "./pages/Stock";
import { PrescriptionsPage } from "./pages/Prescriptions";
import { LabResultsPage } from "./pages/LabResults";
import { SettingsPage } from "./pages/Settings";
import { LoginPage } from "./pages/Login";
import { UnauthorizedPage } from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    {/* Dashboard - All roles */}
                    <Route path="/" element={<DashboardPage />} />
                    
                    {/* Patients - Receptionist, Doctor */}
                    <Route
                      path="/patients"
                      element={
                        <ProtectedRoute allowedRoles={['Receptionist', 'Doctor', 'Admin']}>
                          <PatientsPage />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Fees - Receptionist */}
                    <Route
                      path="/fees"
                      element={
                        <ProtectedRoute allowedRoles={['Receptionist', 'Admin']}>
                          <FeesPage />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Stock - Receptionist, Doctor */}
                    <Route
                      path="/stock"
                      element={
                        <ProtectedRoute allowedRoles={['Receptionist', 'Doctor', 'Admin']}>
                          <StockPage />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Prescriptions - Doctor */}
                    <Route
                      path="/prescriptions"
                      element={
                        <ProtectedRoute allowedRoles={['Doctor', 'Admin']}>
                          <PrescriptionsPage />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Lab Results - Lab Technician, Doctor */}
                    <Route
                      path="/lab-results"
                      element={
                        <ProtectedRoute allowedRoles={['LabTechnician', 'Doctor', 'Admin']}>
                          <LabResultsPage />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* Settings - Admin only */}
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Receptionist']}>
                          <SettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
