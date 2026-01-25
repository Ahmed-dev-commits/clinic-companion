import { useState, useEffect, useCallback } from 'react';
import { patientsApi, PatientDTO } from '@/services/accessApi';
import { supabasePatientsApi, PatientRow } from '@/services/supabaseApi';
import { isCloudEnvironment } from '@/lib/environment';
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

// Convert Supabase row to local Patient type
function rowToPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    name: row.name,
    age: row.age || 0,
    gender: (row.gender as 'Male' | 'Female' | 'Other') || 'Other',
    phone: row.phone || '',
    address: row.address || '',
    visitDate: row.visit_date || '',
    symptoms: row.symptoms || '',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function useAccessPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isCloud, setIsCloud] = useState(false);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if running in cloud environment
      if (isCloudEnvironment()) {
        setIsCloud(true);
        const data = await supabasePatientsApi.getAll();
        setPatients(data.map(rowToPatient));
        setIsDemoMode(false);
      } else {
        // Try local SQLite backend
        setIsCloud(false);
        try {
          const data = await patientsApi.getAll();
          setPatients(data.map(dtoToPatient));
          setIsDemoMode(false);
        } catch {
          // Fallback to demo mode
          console.log('Backend unavailable, using demo mode for patients');
          setPatients(getDemoPatients());
          setIsDemoMode(true);
        }
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      setPatients(getDemoPatients());
      setIsDemoMode(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    const id = `PAT-${Date.now().toString(36).toUpperCase()}`;
    
    if (isCloud) {
      // Use Supabase
      await supabasePatientsApi.create({
        id,
        name: patientData.name,
        age: patientData.age,
        gender: patientData.gender,
        phone: patientData.phone,
        address: patientData.address,
        visit_date: patientData.visitDate,
        symptoms: patientData.symptoms,
      });
      await fetchPatients();
      return id;
    }
    
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

    // SQLite backend
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
      await fetchPatients();
      return id;
    } catch {
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
    if (isCloud) {
      await supabasePatientsApi.update(id, {
        name: patientData.name,
        age: patientData.age,
        gender: patientData.gender,
        phone: patientData.phone,
        address: patientData.address,
        visit_date: patientData.visitDate,
        symptoms: patientData.symptoms,
      });
      await fetchPatients();
      return;
    }
    
    if (isDemoMode) {
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
      await fetchPatients();
    } catch {
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
    if (isCloud) {
      await supabasePatientsApi.delete(id);
      await fetchPatients();
      return;
    }
    
    if (isDemoMode) {
      const updatedPatients = patients.filter(p => p.id !== id);
      setPatients(updatedPatients);
      saveDemoPatients(updatedPatients);
      return;
    }

    try {
      await patientsApi.delete(id);
      await fetchPatients();
    } catch {
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
    isCloud,
    addPatient,
    updatePatient,
    deletePatient,
    refetch: fetchPatients,
  };
}
