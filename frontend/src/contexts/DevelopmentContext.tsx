import { createContext, useContext, useState, ReactNode } from 'react';

interface DevelopmentContextType {
  showLabels: boolean;
  toggleLabels: () => void;
}

const DevelopmentContext = createContext<DevelopmentContextType | undefined>(undefined);

export function DevelopmentProvider({ children }: { children: ReactNode }) {
  // Load initial state from localStorage
  const initialState = localStorage.getItem('showDevelopmentLabels') === 'true';
  const [showLabels, setShowLabels] = useState(initialState);

  const toggleLabels = () => {
    setShowLabels(prev => {
      const newValue = !prev;
      // Save to localStorage when toggled
      localStorage.setItem('showDevelopmentLabels', String(newValue));
      return newValue;
    });
  };

  return (
    <DevelopmentContext.Provider value={{ showLabels, toggleLabels }}>
      {children}
    </DevelopmentContext.Provider>
  );
}

export function useDevelopment() {
  const context = useContext(DevelopmentContext);
  if (context === undefined) {
    throw new Error('useDevelopment must be used within a DevelopmentProvider');
  }
  return context;
} 