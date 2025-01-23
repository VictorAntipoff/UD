import { createTheme } from '@mui/material/styles';
import typography from './typography';

const theme = createTheme({
  typography,
  components: {
    MuiTextField: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            fontSize: '0.85rem'
          },
          '& .MuiInputBase-input': {
            fontSize: '0.85rem'
          }
        }
      }
    },
    MuiButton: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: {
          fontSize: '0.85rem',
          textTransform: 'none'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.8rem',
          padding: '8px 12px'
        },
        head: {
          fontWeight: 600
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.85rem'
        }
      }
    },
    MuiSelect: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        select: {
          fontSize: '0.85rem'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          '& .MuiListItemText-primary': {
            fontSize: '0.85rem'
          },
          '& .MuiListItemText-secondary': {
            fontSize: '0.75rem'
          },
          '& .MuiListSubheader-root': {
            fontSize: '0.8rem',
            fontWeight: 600,
            lineHeight: '32px'
          }
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          paddingTop: '6px',
          paddingBottom: '6px'
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: '40px',
          '& .MuiSvgIcon-root': {
            fontSize: '1.25rem'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          '& .MuiCardHeader-title': {
            fontSize: '0.95rem',
            fontWeight: 500
          },
          '& .MuiCardHeader-subheader': {
            fontSize: '0.8rem'
          }
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontSize: '0.85rem',
          textTransform: 'none',
          minHeight: '48px'
        }
      }
    }
  }
});

export default theme; 