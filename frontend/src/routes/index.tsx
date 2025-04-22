import { useRoutes } from 'react-router-dom';
import { routes } from './routes';
import WoodReceipt from '../pages/management/WoodReceipt';
import ReceiptProcessing from '../pages/factory/ReceiptProcessing';

export const AppRoutes = () => {
  const routing = useRoutes(routes);
  return routing;
}; 