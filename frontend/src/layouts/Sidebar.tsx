import { FC } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Typography,
  Collapse,
  Chip,
  Tooltip
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import FactoryIcon from '@mui/icons-material/Factory';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CalculateIcon from '@mui/icons-material/Calculate';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ForestIcon from '@mui/icons-material/Forest';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  title: string;
  path?: string;
  icon: React.ComponentType;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { 
    title: 'Home', 
    path: '/dashboard',
    icon: HomeIcon 
  },
  { 
    title: 'Factory Hub',
    icon: FactoryIcon,
    children: [
      { 
        title: 'Wood Calculator',
        path: '/factory/wood-calculator',
        icon: CalculateIcon
      },
      { 
        title: 'Wood Slicer', 
        path: '/factory/wood-slicer', 
        icon: ContentCutIcon 
      },
      {
        title: 'Drying Process',
        path: '/factory/drying-process',
        icon: WaterDropIcon
      }
    ]
  },
  {
    title: 'Management',
    icon: ManageAccountsIcon,
    children: [
      {
        title: 'Wood Types',
        path: '/management/wood-types',
        icon: ForestIcon
      }
    ]
  },
  { 
    title: 'Settings', 
    icon: SettingsIcon,
    children: [
      {
        title: 'User Settings',
        path: '/settings/user',
        icon: PersonIcon
      },
      {
        title: 'Admin Settings',
        path: '/settings/admin',
        icon: AdminPanelSettingsIcon
      }
    ]
  }
];

const Sidebar: FC<SidebarProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const navigate = useNavigate();
  const drawerWidth = 240;
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(() => {
    // Find which submenu should be open based on current path
    const currentPath = location.pathname;
    const menuWithActivePath = menuItems.find(item => 
      item.children?.some(child => currentPath.startsWith(child.path || ''))
    );
    return menuWithActivePath?.title || null;
  });
  const currentFile = import.meta.url;

  const handleNavigation = (path: string | undefined, title: string) => {
    if (path) {
      console.log('Navigating to:', path);
      navigate(path);
      if (isMobile) {
        onClose();
      }
    } else {
      setOpenSubmenu(openSubmenu === title ? null : title);
    }
  };

  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const isSelected = item.path ? isPathActive(item.path) : false;
    const hasChildren = item.children && item.children.length > 0;
    const isSubmenuOpen = openSubmenu === item.title || 
      (hasChildren && item.children?.some(child => isPathActive(child.path || '')));

    return (
      <Box key={item.title}>
        <ListItemButton
          selected={isSelected}
          onClick={() => handleNavigation(item.path, item.title)}
          sx={{
            minHeight: 48,
            pl: 2 + level * 2,
            py: 1.5,
            '&.Mui-selected': {
              backgroundColor: '#f8f9fa',
              color: '#2c3e50',
              '&:hover': {
                backgroundColor: '#f0f2f5',
              },
              '& .MuiListItemIcon-root': {
                color: '#2c3e50',
              },
            },
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ 
            minWidth: 40, 
            color: isSelected ? '#2c3e50' : '#64748b' 
          }}>
            <item.icon />
          </ListItemIcon>
          <ListItemText 
            primary={item.title}
            primaryTypographyProps={{
              fontSize: '0.85rem',
              fontWeight: isSelected ? 500 : 400,
              color: isSelected ? '#2c3e50' : '#64748b'
            }}
          />
          {hasChildren && (isSubmenuOpen ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
        
        {hasChildren && item.children && (
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  // Function to format the file path
  const formatFilePath = (url: string) => {
    const path = url.split('/src/')[1];
    return path ? `layouts/${path}` : 'Sidebar.tsx';
  };

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          top: { xs: 0, sm: 64 },
          height: { xs: '100%', sm: 'calc(100% - 64px)' },
          visibility: { xs: 'visible', sm: open ? 'visible' : 'hidden' },
          transform: {
            xs: 'none',
            sm: open ? 'translateX(0)' : `translateX(-${drawerWidth}px)`
          },
          transition: theme.transitions.create(['transform', 'visibility'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          {import.meta.env.DEV && (
            <Tooltip 
              title={`File: ${formatFilePath(currentFile)}`}
              arrow
            >
              <Chip
                label="Development"
                size="small"
                sx={{
                  backgroundColor: '#fbbf24',
                  color: '#78350f',
                  '& .MuiChip-label': {
                    fontWeight: 600
                  },
                  cursor: 'help'
                }}
              />
            </Tooltip>
          )}
        </Box>

        <List sx={{ flex: 1 }}>
          {menuItems.map(item => renderMenuItem(item))}
        </List>

        <Box sx={{ 
          p: 2, 
          mt: 'auto',
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.grey[50],
        }}>
          <Typography 
            variant="body1"
            sx={{ 
              textAlign: 'center',
              color: theme.palette.text.secondary,
              fontFamily: theme.typography.fontFamily,
              '& span': {
                fontWeight: 600,
                color: '#dc2626',
                transition: 'color 0.2s',
                cursor: 'default',
                '&:hover': {
                  color: '#b91c1c',
                }
              }
            }}
          >
            Developed by <span>Vix</span>
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 