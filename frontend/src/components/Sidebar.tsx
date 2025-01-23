import { useState } from 'react';
import { 
  Drawer, 
  Box, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Collapse,
  Typography 
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import FactoryIcon from '@mui/icons-material/Factory';
import SettingsIcon from '@mui/icons-material/Settings';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import ForestIcon from '@mui/icons-material/Forest';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

export default function Sidebar() {
  const location = useLocation();
  const [managementOpen, setManagementOpen] = useState(false);

  const handleManagementClick = () => {
    setManagementOpen(!managementOpen);
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/dashboard' },
    { text: 'Factory Hub', icon: <FactoryIcon />, path: '/factory' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider'
        }
      }}
    >
      <Box sx={{ 
        overflow: 'auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo/Title Section */}
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography 
            variant="subtitle1"
            sx={{ 
              fontSize: '0.95rem',
              fontWeight: 500,
              color: '#2c3e50'
            }}
          >
            Menu
          </Typography>
        </Box>

        {/* Menu Items */}
        <List sx={{ flex: 1, py: 0 }}>
          {menuItems.map((item) => (
            <ListItemButton
              key={item.text}
              component={Link}
              to={item.path}
              selected={location.pathname.startsWith(item.path)}
              sx={{
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: '#f8f9fa',
                  '&:hover': {
                    backgroundColor: '#f0f2f5'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ 
                minWidth: 40,
                color: location.pathname.startsWith(item.path) ? '#2c3e50' : '#64748b'
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.85rem',
                  fontWeight: location.pathname.startsWith(item.path) ? 500 : 400,
                  color: location.pathname.startsWith(item.path) ? '#2c3e50' : '#64748b'
                }}
              />
            </ListItemButton>
          ))}

          {/* Management Section */}
          <ListItemButton
            onClick={handleManagementClick}
            selected={location.pathname.startsWith('/management')}
            sx={{
              py: 1.5,
              '&.Mui-selected': {
                backgroundColor: '#f8f9fa',
                '&:hover': {
                  backgroundColor: '#f0f2f5'
                }
              }
            }}
          >
            <ListItemIcon sx={{ 
              minWidth: 40,
              color: location.pathname.startsWith('/management') ? '#2c3e50' : '#64748b'
            }}>
              <ManageAccountsIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Management"
              primaryTypographyProps={{
                fontSize: '0.85rem',
                fontWeight: location.pathname.startsWith('/management') ? 500 : 400,
                color: location.pathname.startsWith('/management') ? '#2c3e50' : '#64748b'
              }}
            />
            {managementOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>

          <Collapse in={managementOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItemButton
                component={Link}
                to="/management/wood-types"
                selected={location.pathname === '/management/wood-types'}
                sx={{
                  pl: 7,
                  py: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: '#f8f9fa',
                    '&:hover': {
                      backgroundColor: '#f0f2f5'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 40,
                  color: location.pathname === '/management/wood-types' ? '#2c3e50' : '#64748b'
                }}>
                  <ForestIcon />
                </ListItemIcon>
                <ListItemText 
                  primary="Wood Types"
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    fontWeight: location.pathname === '/management/wood-types' ? 500 : 400,
                    color: location.pathname === '/management/wood-types' ? '#2c3e50' : '#64748b'
                  }}
                />
              </ListItemButton>
            </List>
          </Collapse>
        </List>
      </Box>
    </Drawer>
  );
} 