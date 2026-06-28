import { createContext, useContext } from 'react';
import type { JwtPayload } from 'jwt-decode';

// Custom payload including the role
export interface CustomJwtPayload extends JwtPayload {
  role: 'admin' | 'student';
  name?: string;
  email?: string;
}

// THE FIX: Add the 'export' keyword here
export interface AuthContextType {
  token: string | null;
  decodedToken: CustomJwtPayload | null;
  isLoading: boolean;
  login: (newToken: string) => void;
  logout: () => void;

}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
