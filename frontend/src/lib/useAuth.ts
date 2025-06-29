import { useState, useEffect } from 'react';

interface UserProfile {
  id: number;
  auth_id: string;
  nome: string;
  email: string;
  cpf: string;
  departamento: string;
  ramal: string;
  perfil: 'ADMINISTRADOR' | 'SUPERVISOR' | 'ORCAMENTISTA' | 'OPERACIONAL' | string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const useAuthProfile = (): UserProfile | null => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const userData = JSON.parse(userString);
        setUserProfile(userData);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      setUserProfile(null);
    }
  }, []);

  return userProfile;
}; 