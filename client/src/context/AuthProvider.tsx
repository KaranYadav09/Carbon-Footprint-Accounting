import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react'; // type-only import for ReactNode
import { jwtDecode } from 'jwt-decode';

// This import will now work correctly
import { AuthContext } from './AuthContext';
import type { AuthContextType, CustomJwtPayload } from './AuthContext';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [decodedToken, setDecodedToken] = useState<CustomJwtPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (token) {
        const decoded = jwtDecode<CustomJwtPayload>(token);
        // Check if token is expired
        if (decoded.exp! * 1000 < Date.now()) {
          logout();
        } else {
          setDecodedToken(decoded);
        }
      }
    } catch (error) {
      console.error("Invalid token:", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    // Set session start time on login if not already set (or reset it)
    localStorage.setItem('sessionStart', new Date().toISOString());
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionStart');
    setToken(null);
    setDecodedToken(null);
  };

  const value: AuthContextType = {
    token,
    decodedToken,
    isLoading,
    login,
    logout,

  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};