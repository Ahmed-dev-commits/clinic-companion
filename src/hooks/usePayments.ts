import { useState, useEffect, useCallback } from 'react';
import { paymentsApi, PaymentDTO } from '@/services/accessApi';
import { supabasePaymentsApi, PaymentRow } from '@/services/supabaseApi';
import { isCloudEnvironment } from '@/lib/environment';
import { Payment } from '@/types/hospital';
import type { Json } from '@/integrations/supabase/types';

// Get demo payments from localStorage
function getDemoPayments(): Payment[] {
  try {
    const stored = localStorage.getItem('demo-payments');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log('Failed to parse demo payments');
  }
  return [];
}

// Save demo payments to localStorage
function saveDemoPayments(payments: Payment[]) {
  localStorage.setItem('demo-payments', JSON.stringify(payments));
}

// Convert API DTO to local type
function dtoToPayment(dto: PaymentDTO): Payment {
  return {
    id: dto.ID,
    patientId: dto.PatientID,
    patientName: dto.PatientName,
    consultationFee: dto.ConsultationFee,
    labFee: dto.LabFee,
    medicineFee: dto.MedicineFee,
    totalAmount: dto.TotalAmount,
    paymentMode: dto.PaymentMode as 'Cash' | 'Card',
    medicines: typeof dto.Medicines === 'string' ? JSON.parse(dto.Medicines) : [],
    createdAt: dto.CreatedAt,
  };
}

// Convert Supabase row to local type
function rowToPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    patientId: row.patient_id || '',
    patientName: row.patient_name || '',
    consultationFee: row.consultation_fee || 0,
    labFee: row.lab_fee || 0,
    medicineFee: row.medicine_fee || 0,
    totalAmount: row.total_amount || 0,
    paymentMode: (row.payment_mode as 'Cash' | 'Card') || 'Cash',
    medicines: Array.isArray(row.medicines) ? row.medicines as any[] : [],
    createdAt: row.created_at || new Date().toISOString(),
  };
}

// Generate unique ID
const generateId = (prefix: string) => {
  const num = Math.floor(Math.random() * 9000) + 1000;
  const suffix = Math.random().toString(36).substr(2, 3).toUpperCase();
  return `${prefix}-${num}${suffix}`;
};

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isCloud, setIsCloud] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isCloudEnvironment()) {
        setIsCloud(true);
        const data = await supabasePaymentsApi.getAll();
        setPayments(data.map(rowToPayment));
        setIsDemoMode(false);
      } else {
        setIsCloud(false);
        try {
          const data = await paymentsApi.getAll();
          setPayments(data.map(dtoToPayment));
          setIsDemoMode(false);
        } catch {
          console.log('Backend unavailable, using demo mode for payments');
          setPayments(getDemoPayments());
          setIsDemoMode(true);
        }
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
      setPayments(getDemoPayments());
      setIsDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt'>) => {
    const id = generateId('PAY');
    
    if (isCloud) {
      await supabasePaymentsApi.create({
        id,
        patient_id: paymentData.patientId,
        patient_name: paymentData.patientName,
        consultation_fee: paymentData.consultationFee,
        lab_fee: paymentData.labFee,
        medicine_fee: paymentData.medicineFee,
        total_amount: paymentData.totalAmount,
        payment_mode: paymentData.paymentMode,
        medicines: paymentData.medicines as unknown as Json,
      });
      await fetchPayments();
      return id;
    }

    if (isDemoMode) {
      const newPayment: Payment = { ...paymentData, id, createdAt: new Date().toISOString() };
      const updated = [...payments, newPayment];
      setPayments(updated);
      saveDemoPayments(updated);
      return id;
    }

    try {
      await paymentsApi.create({
        id,
        patientId: paymentData.patientId,
        patientName: paymentData.patientName,
        consultationFee: paymentData.consultationFee,
        labFee: paymentData.labFee,
        medicineFee: paymentData.medicineFee,
        totalAmount: paymentData.totalAmount,
        paymentMode: paymentData.paymentMode,
        medicines: paymentData.medicines,
      });
      await fetchPayments();
      return id;
    } catch {
      const newPayment: Payment = { ...paymentData, id, createdAt: new Date().toISOString() };
      const updated = [...payments, newPayment];
      setPayments(updated);
      saveDemoPayments(updated);
      setIsDemoMode(true);
      return id;
    }
  };

  const getPatientPayments = (patientId: string) => payments.filter(p => p.patientId === patientId);

  const getTodayPayments = () => {
    const today = new Date().toISOString().split('T')[0];
    return payments.filter(p => p.createdAt.split('T')[0] === today);
  };

  const getTodayTotalCollection = () => getTodayPayments().reduce((sum, p) => sum + p.totalAmount, 0);

  return {
    payments,
    loading,
    isDemoMode,
    isCloud,
    addPayment,
    getPatientPayments,
    getTodayPayments,
    getTodayTotalCollection,
    refetch: fetchPayments,
  };
}
