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
  Toolbar,
  Collapse
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import FactoryIcon from '@mui/icons-material/Factory';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
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
    path: '/', 
    icon: HomeIcon 
  },
  { 
    title: 'Factory', 
    icon: FactoryIcon,
    children: [
      { 
        title: 'Wood Slicer', 
        path: '/factory/wood-slicer', 
        icon: ContentCutIcon 
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
  const [openSubmenu, setOpenSubmenu] = useState<string | null>('Factory Hub');

  const handleNavigation = (path: string | undefined, title: string) => {
    if (path) {
      navigate(path);
      if (isMobile) {
        onClose();
      }
    } else {
      setOpenSubmenu(openSubmenu === title ? null : title);
    }
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const isSelected = item.path === location.pathname;
    const hasChildren = item.children && item.children.length > 0;
    const isSubmenuOpen = openSubmenu === item.title;

    return (
      <Box key={item.title}>
        <ListItemButton
          selected={isSelected}
          onClick={() => handleNavigation(item.path, item.title)}
          sx={{
            minHeight: 48,
            pl: 2 + level * 2,
            '&.Mui-selected': {
              backgroundColor: 'rgba(25, 118, 210, 0.12)',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.20)',
              },
              '& .MuiListItemIcon-root': {
                color: 'primary.main',
              },
            },
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
            <item.icon />
          </ListItemIcon>
          <ListItemText primary={item.title} />
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
      {!isMobile && <Toolbar />}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        height: '100%',
      }}>
        <List sx={{ flex: 1 }}>
          {menuItems.map(item => renderMenuItem(item))}
        </List>

        <Box sx={{ 
          p: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.grey[50],
        }}>
          <Typography 
            variant="caption" 
            display="block" 
            align="center"
            color="text.secondary"
            sx={{ opacity: 0.7 }}
          >
            Version 1.0.0
          </Typography>
          <Typography 
            variant="caption" 
            display="block" 
            align="center"
            color="text.secondary"
            sx={{ opacity: 0.7 }}
          >
            Developed by Vix
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 