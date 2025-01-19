import { Box, AppBar, Toolbar } from '@mui/material';
import { ApiStatus } from '../ApiStatus';

export const Header = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        {/* Your existing header content */}
        <Box sx={{ flexGrow: 1 }} />
        <ApiStatus />
      </Toolbar>
    </AppBar>
  );
};

export default Header; 