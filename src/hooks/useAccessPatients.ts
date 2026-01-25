import { useState, useEffect, useCallback } from 'react';
import { patientsApi, PatientDTO } from '@/services/accessApi';
import { Patient } from '@/types/hospital';

// Demo patients for testing when backend is unavailable
const DEMO_PATIENTS: Patient[] = [
  {
    id: 'PAT-DEMO001',
    name: 'John Smith',
    age: 45,
    gender: 'Male',
    phone: '03001234567',
    address: '123 Main Street',
    visitDate: new Date().toISOString().split('T')[0],
    symptoms: 'Fever, headache',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'PAT-DEMO002',
    name: 'Sarah Johnson',
    age: 32,
    gender: 'Female',
    phone: '03009876543',
    address: '456 Oak Avenue',
    visitDate: new Date().toISOString().split('T')[0],
    symptoms: 'Cough, cold',
    createdAt: new Date().toISOString(),
  },
];

// Get demo patients from localStorage or use defaults
function getDemoPatients(): Patient[] {
  try {
    const stored = localStorage.getItem('demo-patients');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log('Failed to parse demo patients');
  }
  return [...DEMO_PATIENTS];
}

// Save demo patients to localStorage
function saveDemoPatients(patients: Patient[]) {
  localStorage.setItem('demo-patients', JSON.stringify(patients));
}

// Convert API DTO to local Patient type
function dtoToPatient(dto: PatientDTO): Patient {
  return {
    id: dto.ID,
    name: dto.Name,
    age: dto.Age,
    gender: dto.Gender as 'Male' | 'Female' | 'Other',
    phone: dto.Phone,
    address: dto.Address,
    visitDate: dto.VisitDate,
    symptoms: dto.Symptoms,
    createdAt: dto.CreatedAt,
  };
}

export function useAccessPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientsApi.getAll();
      setPatients(data.map(dtoToPatient));
      setIsDemoMode(false);
    } catch (err) {
      console.log('Backend unavailable, using demo mode for patients');
      // Fallback to demo mode
      setPatients(getDemoPatients());
      setIsDemoMode(true);
      setError(null); // Don't show error in demo mode
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    const id = `PAT-${Date.now().toString(36).toUpperCase()}`;
    
    if (isDemoMode) {
      // Demo mode - use local storage
      const newPatient: Patient = {
        ...patientData,
        id,
        createdAt: new Date().toISOString(),
      };
      const updatedPatients = [...patients, newPatient];
      setPatients(updatedPatients);
      saveDemoPatients(updatedPatients);
      return id;
    }

    try {
      await patientsApi.create({
        ID: id,
        Name: patientData.name,
        Age: patientData.age,
        Gender: patientData.gender,
        Phone: patientData.phone,
        Address: patientData.address,
        VisitDate: patientData.visitDate,
        Symptoms: patientData.symptoms,
      });
      await fetchPatients(); // Refresh list
      return id;
    } catch (err) {
      // Fallback to demo mode on error
      console.log('Backend unavailable, adding patient in demo mode');
      const newPatient: Patient = {
        ...patientData,
        id,
        createdAt: new Date().toISOString(),
      };
      const updatedPatients = [...patients, newPatient];
      setPatients(updatedPatients);
      saveDemoPatients(updatedPatients);
      setIsDemoMode(true);
      return id;
    }
  };

  const updatePatient = async (id: string, patientData: Partial<Patient>) => {
    if (isDemoMode) {
      // Demo mode - update local storage
      const updatedPatients = patients.map(p => 
        p.id === id ? { ...p, ...patientData } : p
      );
      setPatients(updatedPatients);
      saveDemoPatients(updatedPatients);
      return;
    }

    try {
      await patientsApi.update(id, {
        Name: patientData.name,
        Age: patientData.age,
        Gender: patientData.gender,
        Phone: patientData.phone,
        Address: patientData.address,
        VisitDate: patientData.visitDate,
        Symptoms: patientData.symptoms,
      });
      await fetchPatients(); // Refresh list
    } catch (err) {
      // Fallback to demo mode
      console.log('Backend unavailable, updating patient in demo mode');
      const updatedPatients = patients.map(p => 
        p.id === id ? { ...p, ...patientData } : p
      );
      setPatients(updatedPatients);
      saveDemoPatients(updatedPatients);
      setIsDemoMode(true);
    }
  };

  const deletePatient = async (id: string) => {
    if (isDemoMode) {
      // Demo mode - delete from local storage
      const updatedPatients = patients.filter(p => p.id !== id);
      setPatients(updatedPatients);
      saveDemoPatients(updatedPatients);
      return;
    }

    try {
      await patientsApi.delete(id);
      await fetchPatients(); // Refresh list
    } catch (err) {
      // Fallback to demo mode
      console.log('Backend unavailable, deleting patient in demo mode');
      const updatedPatients = patients.filter(p => p.id !== id);
      setPatients(updatedPatients);
      saveDemoPatients(updatedPatients);
      setIsDemoMode(true);
    }
  };

  return {
    patients,
    loading,
    error,
    isDemoMode,
    addPatient,
    updatePatient,
    deletePatient,
    refetch: fetchPatients,
  };
}
