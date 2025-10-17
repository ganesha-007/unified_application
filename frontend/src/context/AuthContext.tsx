import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../config/api';
import io, { Socket } from 'socket.io-client';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  socket: Socket | null;
  login: (email: string, userId: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      // Initialize socket connection
      const socketInstance = io('http://localhost:3001', {
        auth: { token: storedToken },
      });
      
      setSocket(socketInstance);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, userId: string) => {
    try {
      const response = await api.post('/auth/test-token', { email, userId });
      const { token: newToken } = response.data;
      
      setToken(newToken);
      setUser({ id: userId, email });
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('user', JSON.stringify({ id: userId, email }));
      
      // Initialize socket connection
      const socketInstance = io('http://localhost:3001', {
        auth: { token: newToken },
      });
      
      setSocket(socketInstance);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        socket,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

