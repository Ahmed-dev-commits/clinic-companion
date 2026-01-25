import { useState, useEffect, useCallback } from 'react';
import { patientsApi, PatientDTO } from '@/services/accessApi';
import { Patient } from '@/types/hospital';

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

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientsApi.getAll();
      setPatients(data.map(dtoToPatient));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patients');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const addPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    const id = `PAT-${Date.now().toString(36).toUpperCase()}`;
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
      throw new Error(err instanceof Error ? err.message : 'Failed to add patient');
    }
  };

  const updatePatient = async (id: string, patientData: Partial<Patient>) => {
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
      throw new Error(err instanceof Error ? err.message : 'Failed to update patient');
    }
  };

  const deletePatient = async (id: string) => {
    try {
      await patientsApi.delete(id);
      await fetchPatients(); // Refresh list
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete patient');
    }
  };

  return {
    patients,
    loading,
    error,
    addPatient,
    updatePatient,
    deletePatient,
    refetch: fetchPatients,
  };
}
