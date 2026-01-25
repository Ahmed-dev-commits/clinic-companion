import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '@/types/services';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const API_BASE_URL = 'http://localhost:3001/api';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        try {
          const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            return false;
          }

          const data = await response.json();
          if (data.success && data.user) {
            set({
              user: {
                id: data.user.ID,
                username: data.user.Username,
                name: data.user.Name,
                role: data.user.Role as UserRole,
              },
              isAuthenticated: true,
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      hasRole: (roles: UserRole[]) => {
        const user = get().user;
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'hospital-auth',
    }
  )
);
