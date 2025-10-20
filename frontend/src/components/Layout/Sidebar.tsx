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
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LanguageIcon from '@mui/icons-material/Language';
import ArticleIcon from '@mui/icons-material/Article';
import FolderIcon from '@mui/icons-material/Folder';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import colors from '../../styles/colors';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

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
  const { hasPermission, user } = useAuth();

  const [factoryOpen, setFactoryOpen] = useState(
    location.pathname.startsWith('/dashboard/factory')
  );
  const [assetsOpen, setAssetsOpen] = useState(
    location.pathname.startsWith('/dashboard/assets')
  );
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/dashboard/settings')
  );
  const [managementOpen, setManagementOpen] = useState(
    location.pathname.startsWith('/dashboard/management')
  );
  const [websiteOpen, setWebsiteOpen] = useState(
    location.pathname.startsWith('/dashboard/website')
  );
  const [pendingCount, setPendingCount] = useState(0);

  const handleMenuClick = (
    setter: React.Dispatch<React.SetStateAction<boolean>>,
    currentState: boolean
  ) => () => {
    // Close all menus first
    setFactoryOpen(false);
    setAssetsOpen(false);
    setSettingsOpen(false);
    setManagementOpen(false);
    setWebsiteOpen(false);

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
    if (user) {
      fetchPendingCount();
      // Poll every 5 minutes for updates
      const interval = setInterval(fetchPendingCount, 300000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
          {hasPermission('dashboard') && (
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
          )}

          {/* Wood Calculator - Standalone */}
          {hasPermission('wood-calculator') && (
            <ListItem
              button
              onClick={() => handleNavigate('/dashboard/factory/wood-calculator')}
              selected={location.pathname === '/dashboard/factory/wood-calculator'}
              sx={commonButtonStyles}
            >
              <ListItemIcon sx={{ color: location.pathname === '/dashboard/factory/wood-calculator' ? colors.primary : colors.grey.main }}>
                <CalculateIcon />
              </ListItemIcon>
              <ListItemText primary="Wood Calculator" />
            </ListItem>
          )}

          {/* Assets Section */}
          {hasPermission('assets-items') && (
            <>
              <ListItem button onClick={handleMenuClick(setAssetsOpen, assetsOpen)} sx={sectionHeaderStyles}>
                <ListItemIcon sx={{
                  color: assetsOpen ? colors.primary : colors.grey.main,
                  transition: 'all 0.3s ease'
                }}>
                  <BusinessCenterIcon />
                </ListItemIcon>
                <ListItemText primary="Assets" />
                <Box sx={{
                  transition: 'transform 0.3s ease',
                  transform: assetsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <ExpandMore />
                </Box>
              </ListItem>

              <Collapse in={assetsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItem
                    button
                    sx={submenuStyles}
                    onClick={() => handleNavigate('/dashboard/assets')}
                    selected={location.pathname === '/dashboard/assets'}
                  >
                    <ListItemIcon sx={{ color: location.pathname === '/dashboard/assets' ? colors.primary : colors.grey.main }}>
                      <InventoryIcon />
                    </ListItemIcon>
                    <ListItemText primary="Items" />
                  </ListItem>
                </List>
              </Collapse>
            </>
          )}

          {/* Factory Section */}
          {(hasPermission('wood-receipt') || hasPermission('wood-slicing') || hasPermission('drying-process') || hasPermission('wood-transfer') || hasPermission('inventory-reports')) && (
            <>
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
              {hasPermission('wood-receipt') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/factory/receipt-processing')}
                  selected={location.pathname === '/dashboard/factory/receipt-processing'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/factory/receipt-processing' ? colors.primary : colors.grey.main }}>
                    <InventoryIcon />
                  </ListItemIcon>
                  <ListItemText primary="Wood Receipt" />
                </ListItem>
              )}

              {hasPermission('wood-slicing') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/factory/wood-slicer')}
                  selected={location.pathname === '/dashboard/factory/wood-slicer'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/factory/wood-slicer' ? colors.primary : colors.grey.main }}>
                    <ContentCutIcon />
                  </ListItemIcon>
                  <ListItemText primary="Wood Slicing" />
                </ListItem>
              )}

              {hasPermission('drying-process') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/factory/drying-process')}
                  selected={location.pathname === '/dashboard/factory/drying-process'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/factory/drying-process' ? colors.primary : colors.grey.main }}>
                    <DryIcon />
                  </ListItemIcon>
                  <ListItemText primary="Drying Process" />
                </ListItem>
              )}

              {hasPermission('wood-transfer') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/factory/wood-transfer')}
                  selected={location.pathname === '/dashboard/factory/wood-transfer'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/factory/wood-transfer' ? colors.primary : colors.grey.main }}>
                    <LocalShippingIcon />
                  </ListItemIcon>
                  <ListItemText primary="Wood Transfer" />
                </ListItem>
              )}

              {hasPermission('inventory-reports') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/factory/inventory')}
                  selected={location.pathname === '/dashboard/factory/inventory'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/factory/inventory' ? colors.primary : colors.grey.main }}>
                    <InventoryIcon />
                  </ListItemIcon>
                  <ListItemText primary="Inventory Reports" />
                </ListItem>
              )}
            </List>
          </Collapse>
            </>
          )}

          {/* Management Section */}
          {(hasPermission('wood-types') || hasPermission('warehouses') || hasPermission('lot-creation') || hasPermission('approvals') || hasPermission('drying-settings')) && (
            <>
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
              {hasPermission('wood-types') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/management/wood-types')}
                  selected={location.pathname === '/dashboard/management/wood-types'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/management/wood-types' ? colors.primary : colors.grey.main }}>
                    <ForestIcon />
                  </ListItemIcon>
                  <ListItemText primary="Wood Types" />
                </ListItem>
              )}

              {hasPermission('warehouses') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/management/warehouses')}
                  selected={location.pathname === '/dashboard/management/warehouses'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/management/warehouses' ? colors.primary : colors.grey.main }}>
                    <WarehouseIcon />
                  </ListItemIcon>
                  <ListItemText primary="Warehouses" />
                </ListItem>
              )}

              {hasPermission('lot-creation') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/management/wood-receipt')}
                  selected={location.pathname === '/dashboard/management/wood-receipt'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/management/wood-receipt' ? colors.primary : colors.grey.main }}>
                    <ReceiptLongIcon />
                  </ListItemIcon>
                  <ListItemText primary="LOT Creation" />
                </ListItem>
              )}

              {hasPermission('approvals') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/management/approvals')}
                  selected={location.pathname === '/dashboard/management/approvals'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/management/approvals' ? colors.primary : colors.grey.main }}>
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
              )}

              {hasPermission('drying-settings') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/management/drying-settings')}
                  selected={location.pathname === '/dashboard/management/drying-settings'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/management/drying-settings' ? colors.primary : colors.grey.main }}>
                    <LocalFireDepartmentIcon />
                  </ListItemIcon>
                  <ListItemText primary="Drying Settings" />
                </ListItem>
              )}
            </List>
          </Collapse>
            </>
          )}

          {/* Website Section */}
          {(hasPermission('website-pages') || hasPermission('website-files')) && (
            <>
              <ListItem button onClick={handleMenuClick(setWebsiteOpen, websiteOpen)} sx={sectionHeaderStyles}>
                <ListItemIcon sx={{
                  color: websiteOpen ? colors.primary : colors.grey.main,
                  transition: 'all 0.3s ease'
                }}>
                  <LanguageIcon />
                </ListItemIcon>
                <ListItemText primary="Website" />
                <Box sx={{
                  transition: 'transform 0.3s ease',
                  transform: websiteOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <ExpandMore />
                </Box>
              </ListItem>

              <Collapse in={websiteOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {hasPermission('website-pages') && (
                    <ListItem
                      button
                      sx={submenuStyles}
                      onClick={() => handleNavigate('/dashboard/website/pages')}
                      selected={location.pathname === '/dashboard/website/pages'}
                    >
                      <ListItemIcon sx={{ color: location.pathname === '/dashboard/website/pages' ? colors.primary : colors.grey.main }}>
                        <ArticleIcon />
                      </ListItemIcon>
                      <ListItemText primary="Pages" />
                    </ListItem>
                  )}

                  {hasPermission('website-files') && (
                    <ListItem
                      button
                      sx={submenuStyles}
                      onClick={() => handleNavigate('/dashboard/website/files')}
                      selected={location.pathname === '/dashboard/website/files'}
                    >
                      <ListItemIcon sx={{ color: location.pathname === '/dashboard/website/files' ? colors.primary : colors.grey.main }}>
                        <FolderIcon />
                      </ListItemIcon>
                      <ListItemText primary="Files" />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </>
          )}

          {/* Settings Section */}
          {(hasPermission('user-settings') || hasPermission('admin-settings')) && (
            <>
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
              {hasPermission('user-settings') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/settings/user')}
                  selected={location.pathname === '/dashboard/settings/user'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/settings/user' ? colors.primary : colors.grey.main }}>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText primary="User Settings" />
                </ListItem>
              )}

              {hasPermission('admin-settings') && (
                <ListItem
                  button
                  sx={submenuStyles}
                  onClick={() => handleNavigate('/dashboard/settings/admin')}
                  selected={location.pathname === '/dashboard/settings/admin'}
                >
                  <ListItemIcon sx={{ color: location.pathname === '/dashboard/settings/admin' ? colors.primary : colors.grey.main }}>
                    <AdminPanelSettingsIcon />
                  </ListItemIcon>
                  <ListItemText primary="Admin Settings" />
                </ListItem>
              )}
            </List>
          </Collapse>
            </>
          )}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 