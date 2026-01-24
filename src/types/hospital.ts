// Hospital Management System Types

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  address: string;
  visitDate: string;
  symptoms: string;
  createdAt: string;
}

export interface PaymentMedicine {
  stockId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Payment {
  id: string;
  patientId: string;
  patientName: string;
  consultationFee: number;
  labFee: number;
  medicineFee: number;
  totalAmount: number;
  paymentMode: 'Cash' | 'Card';
  createdAt: string;
  medicines: PaymentMedicine[];
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  lowStockThreshold: number;
  createdAt: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  diagnosis: string;
  medicines: PrescriptionMedicine[];
  labTests: string[];
  doctorNotes: string;
  precautions: string;
  generatedText: string;
  createdAt: string;
}

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}
