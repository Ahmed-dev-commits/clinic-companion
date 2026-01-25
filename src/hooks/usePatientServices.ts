import { useState, useEffect, useCallback } from 'react';
import { patientServicesApi, PatientServicesDTO } from '@/services/accessApi';
import { ServicesState, PatientServices } from '@/types/services';

// Get demo services from localStorage
function getDemoServices(): PatientServices[] {
  try {
    const stored = localStorage.getItem('demo-services');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log('Failed to parse demo services');
  }
  return [];
}

// Save demo services to localStorage
function saveDemoServices(services: PatientServices[]) {
  localStorage.setItem('demo-services', JSON.stringify(services));
}

// Convert API DTO to local type
function dtoToPatientServices(dto: PatientServicesDTO): PatientServices {
  return {
    id: dto.ID,
    patientId: dto.PatientID,
    services: dto.Services,
    grandTotal: dto.GrandTotal,
    status: dto.Status as 'Draft' | 'Completed',
    createdAt: dto.CreatedAt,
    updatedAt: dto.UpdatedAt,
  };
}

export function usePatientServices() {
  const [services, setServices] = useState<PatientServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await patientServicesApi.getAll();
      setServices(data.map(dtoToPatientServices));
      setIsDemoMode(false);
    } catch (err) {
      console.log('Backend unavailable, using demo mode for services');
      setServices(getDemoServices());
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const addService = async (
    patientId: string,
    servicesState: ServicesState,
    grandTotal: number
  ): Promise<string> => {
    const id = `SRV-${Date.now().toString(36).toUpperCase()}`;
    const now = new Date().toISOString();

    const newService: PatientServices = {
      id,
      patientId,
      services: JSON.stringify(servicesState),
      grandTotal,
      status: 'Completed',
      createdAt: now,
      updatedAt: now,
    };

    if (isDemoMode) {
      const updatedServices = [...services, newService];
      setServices(updatedServices);
      saveDemoServices(updatedServices);
      return id;
    }

    try {
      await patientServicesApi.create({
        id,
        patientId,
        services: servicesState,
        grandTotal,
        status: 'Completed',
      });
      await fetchServices();
      return id;
    } catch (err) {
      console.log('Backend unavailable, saving service in demo mode');
      const updatedServices = [...services, newService];
      setServices(updatedServices);
      saveDemoServices(updatedServices);
      setIsDemoMode(true);
      return id;
    }
  };

  const getServicesByPatientId = (patientId: string): PatientServices[] => {
    return services.filter(s => s.patientId === patientId);
  };

  return {
    services,
    loading,
    isDemoMode,
    addService,
    getServicesByPatientId,
    refetch: fetchServices,
  };
}
