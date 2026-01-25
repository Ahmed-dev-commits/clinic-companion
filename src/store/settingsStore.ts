import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ClinicSettings {
  clinicName: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  doctorName: string;
  doctorQualification: string;
  doctorRegNo: string;
  consultationHours: string;
  logo: string | null; // Base64 string for logo
}

const defaultSettings: ClinicSettings = {
  clinicName: 'MediCare Hospital',
  address: '123 Healthcare Avenue, Medical District',
  city: 'City, State - 400001',
  phone: '+91 98765 43210',
  email: 'care@medicare.com',
  doctorName: 'Dr. Rajesh Kumar',
  doctorQualification: 'MBBS, MD (General Medicine)',
  doctorRegNo: 'MCI-12345-2020',
  consultationHours: '10 AM - 6 PM',
  logo: null,
};

interface SettingsStore {
  settings: ClinicSettings;
  updateSettings: (settings: Partial<ClinicSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },
      resetSettings: () => {
        set({ settings: defaultSettings });
      },
    }),
    {
      name: 'clinic-settings',
    }
  )
);
