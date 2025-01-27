import React, { createContext, useContext, useState, useEffect } from 'react';

interface DevelopmentContextType {
  showLabels: boolean;
  toggleLabels: () => void;
}

const DevelopmentContext = createContext<DevelopmentContextType>({
  showLabels: false,
  toggleLabels: () => {},
});

export const DevelopmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showLabels, setShowLabels] = useState(() => {
    const saved = localStorage.getItem('developmentLabels');
    return saved ? JSON.parse(saved) : false;
  });

  const toggleLabels = () => {
    setShowLabels(prev => !prev);
  };

  useEffect(() => {
    localStorage.setItem('developmentLabels', JSON.stringify(showLabels));
  }, [showLabels]);

  return (
    <DevelopmentContext.Provider value={{ showLabels, toggleLabels }}>
      {children}
    </DevelopmentContext.Provider>
  );
};

export const useDevelopment = () => {
  const context = useContext(DevelopmentContext);
  if (!context) {
    throw new Error('useDevelopment must be used within a DevelopmentProvider');
  }
  return context;
}; 