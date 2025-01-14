import { createContext, useContext, useState } from 'react';

interface DevelopmentContextType {
  showLabels: boolean;
  toggleLabels: () => void;
}

const DevelopmentContext = createContext<DevelopmentContextType>({
  showLabels: true,
  toggleLabels: () => {}
});

export function DevelopmentProvider({ children }: { children: React.ReactNode }) {
  const [showLabels, setShowLabels] = useState(true);

  const toggleLabels = () => {
    setShowLabels(prev => !prev);
  };

  return (
    <DevelopmentContext.Provider value={{ showLabels, toggleLabels }}>
      {children}
    </DevelopmentContext.Provider>
  );
}

export const useDevelopment = () => useContext(DevelopmentContext); 