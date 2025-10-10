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
  Toolbar,
  Badge
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
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import InventoryIcon from '@mui/icons-material/Inventory';
import DryIcon from '@mui/icons-material/Dry';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import colors from '../../styles/colors';
import api from '../../lib/api';

const TRANSITION_DURATION = 250;

interface SidebarProps {
  width: number;
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const Sidebar = ({ width, open, onClose, isMobile }: SidebarProps) => {
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
  const [pendingCount, setPendingCount] = useState(0);

  const handleMenuClick = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    currentState: boolean
  ) => () => {
    // Close all menus first
    setFactoryOpen(false);
    setSettingsOpen(false);
    setManagementOpen(false);

    // Then open the clicked one if it was closed
    if (!currentState) {
      setter(true);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose(); // Close drawer on mobile after navigation
  };

  const commonButtonStyles = {
    mx: 0.5,
    my: 0.2,
    borderRadius: 1,
    color: colors.grey.dark,
    '&.Mui-selected': {
      backgroundColor: alpha(colors.primary, 0.1),
      color: colors.primary,
      transform: 'translateX(4px)',
      boxShadow: `inset 3px 0 0 ${colors.primary}`,
      '&:hover': {
        backgroundColor: alpha(colors.primary, 0.15),
        transform: 'translateX(6px)',
      },
      '& .MuiListItemIcon-root': {
        color: colors.primary,
        transform: 'scale(1.1)',
      },
    },
    '&:hover': {
      backgroundColor: colors.grey.light,
      transform: 'translateX(2px)',
      '& .MuiListItemIcon-root': {
        color: colors.primary,
        transform: 'scale(1.15)',
      },
    },
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const sectionHeaderStyles = {
    ...commonButtonStyles,
    '& .MuiListItemText-primary': {
      fontWeight: 600,
      fontSize: '0.95rem',
      color: colors.primary,
    },
    '& .MuiListItemIcon-root': {
      color: colors.primary,
    },
    '&:hover': {
      backgroundColor: alpha(colors.primary, 0.05),
      transform: 'translateX(2px)',
      '& .MuiListItemIcon-root': {
        color: colors.primary,
        transform: 'scale(1.15)',
      },
    },
  };

  const submenuStyles = {
    ...commonButtonStyles,
    pl: 4,
    '& .MuiListItemText-primary': {
      fontSize: '0.875rem',
      color: colors.grey.dark,
    },
  };

  useEffect(() => {
    fetchPendingCount();
    // Poll every 5 minutes for updates
    const interval = setInterval(fetchPendingCount, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCount = async () => {
    try {
      const response = await api.get('/management/approvals/pending-count');
      setPendingCount(response.data.count || 0);
    } catch (error) {
      // Endpoint not yet implemented, silently default to 0
      setPendingCount(0);
    }
  };

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        width: width,
        flexShrink: 0,
        position: isMobile ? 'absolute' : 'fixed',
        '& .MuiDrawer-paper': {
          width: width,
          boxSizing: 'border-box',
          borderRight: `1px solid ${colors.grey.light}`,
          backgroundColor: colors.white,
          mt: isMobile ? 0 : '64px',
          height: isMobile ? '100vh' : 'calc(100vh - 64px)',
          transition: theme.transitions.create('transform', {
            easing: theme.transitions.easing.sharp,
            duration: TRANSITION_DURATION,
          }),
          transform: isMobile ? 'none' : (open ? 'none' : `translateX(-${width}px)`),
          overflowX: 'hidden',
          zIndex: isMobile ? theme.zIndex.drawer : 'auto',
        },
      }}
    >
      <Box sx={{
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        pt: isMobile ? '64px' : 0,
      }}>
        <List>
          {/* Dashboard */}
          <ListItem
            button
            onClick={() => handleNavigate('/dashboard')}
            selected={location.pathname === '/dashboard'}
            sx={commonButtonStyles}
          >
            <ListItemIcon sx={{ color: location.pathname === '/dashboard' ? colors.primary : colors.grey.main }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>

          {/* Wood Calculator - Standalone */}
          <ListItem
            button
            onClick={() => handleNavigate('/factory/wood-calculator')}
            selected={location.pathname === '/factory/wood-calculator'}
            sx={commonButtonStyles}
          >
            <ListItemIcon sx={{ color: location.pathname === '/factory/wood-calculator' ? colors.primary : colors.grey.main }}>
              <CalculateIcon />
            </ListItemIcon>
            <ListItemText primary="Wood Calculator" />
          </ListItem>

          {/* Factory Section */}
          <ListItem button onClick={handleMenuClick(setFactoryOpen, factoryOpen)} sx={sectionHeaderStyles}>
            <ListItemIcon sx={{
              color: factoryOpen ? colors.primary : colors.grey.main,
              transition: 'all 0.3s ease'
            }}>
              <FactoryIcon />
            </ListItemIcon>
            <ListItemText primary="Factory" />
            <Box sx={{
              transition: 'transform 0.3s ease',
              transform: factoryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ExpandMore />
            </Box>
          </ListItem>

          <Collapse in={factoryOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/factory/receipt-processing')}
                selected={location.pathname === '/factory/receipt-processing'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/factory/receipt-processing' ? colors.primary : colors.grey.main }}>
                  <InventoryIcon />
                </ListItemIcon>
                <ListItemText primary="Wood Receipt" />
              </ListItem>

              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/factory/wood-slicer')}
                selected={location.pathname === '/factory/wood-slicer'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/factory/wood-slicer' ? colors.primary : colors.grey.main }}>
                  <ContentCutIcon />
                </ListItemIcon>
                <ListItemText primary="Wood Slicing" />
              </ListItem>

              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/factory/drying-process')}
                selected={location.pathname === '/factory/drying-process'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/factory/drying-process' ? colors.primary : colors.grey.main }}>
                  <DryIcon />
                </ListItemIcon>
                <ListItemText primary="Drying Process" />
              </ListItem>
            </List>
          </Collapse>

          {/* Management Section */}
          <ListItem button onClick={handleMenuClick(setManagementOpen, managementOpen)} sx={sectionHeaderStyles}>
            <ListItemIcon sx={{
              color: managementOpen ? colors.primary : colors.grey.main,
              transition: 'all 0.3s ease'
            }}>
              <ManageAccountsIcon />
            </ListItemIcon>
            <ListItemText primary="Management" />
            <Box sx={{
              transition: 'transform 0.3s ease',
              transform: managementOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ExpandMore />
            </Box>
          </ListItem>

          <Collapse in={managementOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/management/wood-types')}
                selected={location.pathname === '/management/wood-types'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/management/wood-types' ? colors.primary : colors.grey.main }}>
                  <ForestIcon />
                </ListItemIcon>
                <ListItemText primary="Wood Types" />
              </ListItem>

              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/management/wood-receipt')}
                selected={location.pathname === '/management/wood-receipt'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/management/wood-receipt' ? colors.primary : colors.grey.main }}>
                  <ReceiptLongIcon />
                </ListItemIcon>
                <ListItemText primary="LOT Creation" />
              </ListItem>

              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/management/approvals')}
                selected={location.pathname === '/management/approvals'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/management/approvals' ? colors.primary : colors.grey.main }}>
                  <Badge badgeContent={pendingCount} color="error" sx={{
                    '& .MuiBadge-badge': {
                      right: -3,
                      top: 3,
                    }
                  }}>
                    <AssignmentTurnedInIcon />
                  </Badge>
                </ListItemIcon>
                <ListItemText primary="Approvals" />
              </ListItem>

              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/management/drying-settings')}
                selected={location.pathname === '/management/drying-settings'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/management/drying-settings' ? colors.primary : colors.grey.main }}>
                  <LocalFireDepartmentIcon />
                </ListItemIcon>
                <ListItemText primary="Drying Settings" />
              </ListItem>
            </List>
          </Collapse>

          {/* Settings Section */}
          <ListItem button onClick={handleMenuClick(setSettingsOpen, settingsOpen)} sx={sectionHeaderStyles}>
            <ListItemIcon sx={{
              color: settingsOpen ? colors.primary : colors.grey.main,
              transition: 'all 0.3s ease'
            }}>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
            <Box sx={{
              transition: 'transform 0.3s ease',
              transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ExpandMore />
            </Box>
          </ListItem>

          <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/settings/user')}
                selected={location.pathname === '/settings/user'}
              >
                <ListItemIcon sx={{ color: location.pathname === '/settings/user' ? colors.primary : colors.grey.main }}>
                  <PersonIcon />
                </ListItemIcon>
                <ListItemText primary="User Settings" />
              </ListItem>

              <ListItem
                button
                sx={submenuStyles}
                onClick={() => handleNavigate('/settings/admin')}
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