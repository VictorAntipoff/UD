import { useRoutes } from 'react-router-dom';
import { routes } from './routes';

export const AppRoutes = () => {
  const routing = useRoutes(routes);
  return routing;
}; 