import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Box, 
  useTheme,
  alpha,
  Collapse,
  Toolbar
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalculateIcon from '@mui/icons-material/Calculate';
import SettingsIcon from '@mui/icons-material/Settings';
import FactoryIcon from '@mui/icons-material/Factory';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ForestIcon from '@mui/icons-material/Forest';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import colors from '../../styles/colors';

const TRANSITION_DURATION = 250;

interface SidebarProps {
  width: number;
  open: boolean;
}

const Sidebar = ({ width, open }: SidebarProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [factoryOpen, setFactoryOpen] = useState(
    location.pathname.startsWith('/factory')
  );
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/settings')
  );
  const [managementOpen, setManagementOpen] = useState(
    location.pathname.startsWith('/management')
  );

  const handleMenuClick = (setter: (state: boolean) => void) => () => {
    setter(prev => !prev);
  };

  const commonButtonStyles = {
    mx: 0.5,
    my: 0.2,
    borderRadius: 1,
    color: colors.grey.dark,
    '&.Mui-selected': {
      backgroundColor: alpha(colors.primary, 0.1),
      color: colors.primary,
      '&:hover': {
        backgroundColor: alpha(colors.primary, 0.15),
      },
      '& .MuiListItemIcon-root': {
        color: colors.primary,
      },
    },
    '&:hover': {
      backgroundColor: colors.grey.light,
      '& .MuiListItemIcon-root': {
        color: colors.primary,
      },
    },
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: width,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        position: 'fixed',
        '& .MuiDrawer-paper': {
          width: width,
          boxSizing: 'border-box',
          borderRight: `1px solid ${colors.grey.light}`,
          backgroundColor: colors.white,
          mt: '64px',
          height: 'calc(100% - 64px)',
          transition: theme.transitions.create('transform', {
            easing: theme.transitions.easing.sharp,
            duration: TRANSITION_DURATION,
          }),
          transform: open ? 'none' : `translateX(-${width}px)`,
          overflowX: 'hidden',
          '& .MuiList-root': {
            pt: 0
          }
        },
      }}
    >
      <Box sx={{ 
        overflowY: 'auto', 
        overflowX: 'hidden',
        height: '100%',
        opacity: open ? 1 : 0,
        transition: theme.transitions.create('opacity', {
          easing: theme.transitions.easing.sharp,
          duration: TRANSITION_DURATION / 2,
        }),
      }}>
        <List>
          {/* Dashboard */}
          <ListItem
            button
            onClick={() => navigate('/dashboard')}
            selected={location.pathname === '/dashboard'}
            sx={commonButtonStyles}
          >
            <ListItemIcon sx={{ color: location.pathname === '/dashboard' ? colors.primary : colors.grey.main }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>

          {/* Factory Section */}
          <ListItem button onClick={handleMenuClick(setFactoryOpen)} sx={commonButtonStyles}>
            <ListItemIcon sx={{ color: factoryOpen ? colors.primary : colors.grey.main }}>
              <FactoryIcon />
            </ListItemIcon>
            <ListItemText primary="Factory" />
            {factoryOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>
          
          <Collapse in={factoryOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem
                button
                sx={{ ...commonButtonStyles, pl: 4 }}
                onClick={() => navigate('/factory/calculator')}
                selected={location.pathname === '/factory/calculator'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/factory/calculator' ? colors.primary : colors.grey.main }}>
                  <CalculateIcon />
                </ListItemIcon>
                <ListItemText primary="Wood Calculator" />
              </ListItem>

              <ListItem
                button
                sx={{ ...commonButtonStyles, pl: 4 }}
                onClick={() => navigate('/factory/slicer')}
                selected={location.pathname === '/factory/slicer'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/factory/slicer' ? colors.primary : colors.grey.main }}>
                  <ContentCutIcon />
                </ListItemIcon>
                <ListItemText primary="Wood Slicer" />
              </ListItem>
            </List>
          </Collapse>

          {/* Management Section */}
          <ListItem button onClick={handleMenuClick(setManagementOpen)} sx={commonButtonStyles}>
            <ListItemIcon sx={{ color: managementOpen ? colors.primary : colors.grey.main }}>
              <ManageAccountsIcon />
            </ListItemIcon>
            <ListItemText primary="Management" />
            {managementOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>

          <Collapse in={managementOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem
                button
                sx={{ ...commonButtonStyles, pl: 4 }}
                onClick={() => navigate('/management/wood-types')}
                selected={location.pathname === '/management/wood-types'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/management/wood-types' ? colors.primary : colors.grey.main }}>
                  <ForestIcon />
                </ListItemIcon>
                <ListItemText primary="Wood Types" />
              </ListItem>
            </List>
          </Collapse>

          {/* Settings Section */}
          <ListItem button onClick={handleMenuClick(setSettingsOpen)} sx={commonButtonStyles}>
            <ListItemIcon sx={{ color: settingsOpen ? colors.primary : colors.grey.main }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
            {settingsOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItem>

          <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem
                button
                sx={{ ...commonButtonStyles, pl: 4 }}
                onClick={() => navigate('/settings/user')}
                selected={location.pathname === '/settings/user'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/settings/user' ? colors.primary : colors.grey.main }}>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="User Settings" />
              </ListItem>

              <ListItem
                button
                sx={{ ...commonButtonStyles, pl: 4 }}
                onClick={() => navigate('/settings/admin')}
                selected={location.pathname === '/settings/admin'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/settings/admin' ? colors.primary : colors.grey.main }}>
                  <AdminPanelSettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Admin Settings" />
              </ListItem>
            </List>
          </Collapse>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 