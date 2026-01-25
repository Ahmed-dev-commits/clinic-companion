/**
 * MS Access Database API Service
 * This service connects the React frontend to the Node.js backend
 * which communicates with Microsoft Access database
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// ============ PATIENTS API ============

export interface PatientDTO {
  ID: string;
  Name: string;
  Age: number;
  Gender: string;
  Phone: string;
  Address: string;
  VisitDate: string;
  Symptoms: string;
  CreatedAt: string;
}

export const patientsApi = {
  getAll: () => apiCall<PatientDTO[]>('/patients'),
  
  getById: (id: string) => apiCall<PatientDTO | null>(`/patients/${id}`),
  
  create: (patient: Omit<PatientDTO, 'CreatedAt'>) =>
    apiCall<{ success: boolean; id: string }>('/patients', {
      method: 'POST',
      body: JSON.stringify({
        id: patient.ID,
        name: patient.Name,
        age: patient.Age,
        gender: patient.Gender,
        phone: patient.Phone,
        address: patient.Address,
        visitDate: patient.VisitDate,
        symptoms: patient.Symptoms,
      }),
    }),
  
  update: (id: string, patient: Partial<PatientDTO>) =>
    apiCall<{ success: boolean }>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: patient.Name,
        age: patient.Age,
        gender: patient.Gender,
        phone: patient.Phone,
        address: patient.Address,
        visitDate: patient.VisitDate,
        symptoms: patient.Symptoms,
      }),
    }),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/patients/${id}`, { method: 'DELETE' }),
};

// ============ STOCK API ============

export interface StockDTO {
  ID: string;
  Name: string;
  Category: string;
  Quantity: number;
  Price: number;
  LowStockThreshold: number;
  CreatedAt: string;
}

export const stockApi = {
  getAll: () => apiCall<StockDTO[]>('/stock'),
  
  create: (item: Omit<StockDTO, 'CreatedAt'>) =>
    apiCall<{ success: boolean; id: string }>('/stock', {
      method: 'POST',
      body: JSON.stringify({
        id: item.ID,
        name: item.Name,
        category: item.Category,
        quantity: item.Quantity,
        price: item.Price,
        lowStockThreshold: item.LowStockThreshold,
      }),
    }),
  
  update: (id: string, item: Partial<StockDTO>) =>
    apiCall<{ success: boolean }>(`/stock/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: item.Name,
        category: item.Category,
        quantity: item.Quantity,
        price: item.Price,
        lowStockThreshold: item.LowStockThreshold,
      }),
    }),
  
  delete: (id: string) =>
    apiCall<{ success: boolean }>(`/stock/${id}`, { method: 'DELETE' }),
};

// ============ PAYMENTS API ============

export interface PaymentMedicineDTO {
  stockId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PaymentDTO {
  ID: string;
  PatientID: string;
  PatientName: string;
  ConsultationFee: number;
  LabFee: number;
  MedicineFee: number;
  TotalAmount: number;
  PaymentMode: string;
  Medicines: string; // JSON string
  CreatedAt: string;
}

export const paymentsApi = {
  getAll: () => apiCall<PaymentDTO[]>('/payments'),
  
  create: (payment: {
    id: string;
    patientId: string;
    patientName: string;
    consultationFee: number;
    labFee: number;
    medicineFee: number;
    totalAmount: number;
    paymentMode: string;
    medicines: PaymentMedicineDTO[];
  }) =>
    apiCall<{ success: boolean; id: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    }),
};

// ============ PRESCRIPTIONS API ============

export interface PrescriptionMedicineDTO {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionDTO {
  ID: string;
  PatientID: string;
  PatientName: string;
  PatientAge: number;
  Diagnosis: string;
  Medicines: string; // JSON string
  LabTests: string; // JSON string
  DoctorNotes: string;
  Precautions: string;
  GeneratedText: string;
  FollowUpDate: string;
  CreatedAt: string;
}

export const prescriptionsApi = {
  getAll: () => apiCall<PrescriptionDTO[]>('/prescriptions'),
  
  create: (prescription: {
    id: string;
    patientId: string;
    patientName: string;
    patientAge: number;
    diagnosis: string;
    medicines: PrescriptionMedicineDTO[];
    labTests: string[];
    doctorNotes: string;
    precautions: string;
    generatedText: string;
    followUpDate: string;
  }) =>
    apiCall<{ success: boolean; id: string }>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescription),
    }),
};

// ============ LAB RESULTS API ============

export interface LabTestResultDTO {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  status: string;
}

export interface LabResultDTO {
  ID: string;
  PatientID: string;
  PatientName: string;
  PatientAge: number;
  TestDate: string;
  ReportDate: string;
  Tests: string; // JSON string
  Notes: string;
  Technician: string;
  Status: string;
  NotifiedAt?: string;
  CollectedAt?: string;
  CreatedAt: string;
}

export const labResultsApi = {
  getAll: () => apiCall<LabResultDTO[]>('/lab-results'),
  
  create: (labResult: {
    id: string;
    patientId: string;
    patientName: string;
    patientAge: number;
    testDate: string;
    reportDate: string;
    tests: LabTestResultDTO[];
    notes: string;
    technician: string;
    status: string;
  }) =>
    apiCall<{ success: boolean; id: string }>('/lab-results', {
      method: 'POST',
      body: JSON.stringify(labResult),
    }),
  
  updateStatus: (id: string, status: string, notifiedAt?: string, collectedAt?: string) =>
    apiCall<{ success: boolean }>(`/lab-results/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notifiedAt, collectedAt }),
    }),
};

// ============ HEALTH CHECK ============

export const healthCheck = () => 
  apiCall<{ status: string; database: string; timestamp: string }>('/health');

// Export all APIs
export const accessDatabase = {
  patients: patientsApi,
  stock: stockApi,
  payments: paymentsApi,
  prescriptions: prescriptionsApi,
  labResults: labResultsApi,
  healthCheck,
};

export default accessDatabase;
