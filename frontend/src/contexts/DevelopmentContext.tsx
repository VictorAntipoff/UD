import { createContext, useContext, useState, useCallback } from 'react';

interface DevelopmentContextType {
  showLabels: boolean;
  toggleLabels: () => void;
}

const DevelopmentContext = createContext<DevelopmentContextType>({
  showLabels: true,
  toggleLabels: () => {}
});

export const DevelopmentProvider = ({ children }: { children: React.ReactNode }) => {
  // Initialize state from localStorage
  const [showLabels, setShowLabels] = useState(() => {
    const saved = localStorage.getItem('developmentLabels');
    return saved ? JSON.parse(saved) : true;
  });

  const toggleLabels = useCallback(() => {
    setShowLabels((prev: boolean) => {
      const newValue = !prev;
      localStorage.setItem('developmentLabels', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  return (
    <DevelopmentContext.Provider value={{ showLabels, toggleLabels }}>
      {children}
    </DevelopmentContext.Provider>
  );
};

export const useDevelopment = () => useContext(DevelopmentContext); 