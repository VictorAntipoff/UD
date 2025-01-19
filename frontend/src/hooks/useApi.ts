import { useState, useEffect } from 'react';
import { checkApiHealth } from '../utils/api';

export const useApiStatus = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const isHealthy = await checkApiHealth();
      setIsOnline(isHealthy);
    };

    // Check immediately
    checkStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  return isOnline;
}; 