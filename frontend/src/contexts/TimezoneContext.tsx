import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  refreshTimezone: () => Promise<void>;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const TimezoneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [timezone, setTimezoneState] = useState<string>('Africa/Dar_es_Salaam');

  const fetchTimezone = async () => {
    try {
      const response = await api.get('/settings/timezone');
      if (response.data?.value) {
        setTimezoneState(response.data.value);
        console.log('Timezone loaded:', response.data.value);
      }
    } catch (error) {
      // Silently use default timezone if endpoint doesn't exist
      // Default timezone is 'Africa/Dar_es_Salaam'
    }
  };

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
  };

  const refreshTimezone = async () => {
    await fetchTimezone();
  };

  useEffect(() => {
    fetchTimezone();
  }, []);

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, refreshTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = (): TimezoneContextType => {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};
