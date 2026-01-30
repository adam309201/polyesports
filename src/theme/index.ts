import { ThemeOptions } from '@mui/material';

const breakpoints = {
  values: {
    xs: 0,
    sm: 756,
    md: 980,
    lg: 1400,
    xl: 1535,
  },
};

export const basicTheme: ThemeOptions = {
  breakpoints,
  palette: {
    mode: 'dark',
    background: {
      paper: '#1a2736',
      default: '#1d2b3a',
    },
  },
  typography: {
    fontSize: 14,
    fontFamily: 'Open Sans, sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          padding: 0,
          margin: 0,
        },
      },
    },
    MuiModal: {
      styleOverrides: {
        backdrop: {
          backdropFilter: 'blur(5px)',
          background: 'rgba(0,0,0,0.06)',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#243447',
          paddingLeft: 12,
          paddingRight: 12,
          border: '1px solid #3d5266',
        },
        input: {
          fontSize: '0.95rem',
          padding: '10px 0',
          color: '#fff',
          '&::placeholder': {
            color: '#9ca3af',
            opacity: 1,
          },
        },
      },
      defaultProps: {
        fullWidth: true,
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #3d5266',
          background: 'transparent',
          ':before': {
            backgroundColor: 'transparent',
          },
        },
        expanded: {
          margin: 0,
        },
      },
    },

    MuiCssBaseline: {
      styleOverrides: {
        html: {},
        body: {
          // overflowX: "hidden",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: 'none',
          boxShadow: '0px 1px 4px 0px rgba(16, 24, 40, 0.05)',
          backgroundImage: 'none',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        list: {
          padding: 0,
        },
        paper: {
          backgroundColor: '#1a2736',
          border: '1px solid #3d5266',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 0,
          color: '#9e9e9e',
          '&.Mui-checked': {
            color: '#ffffff',
          },
          '&:hover': {
            backgroundColor: 'transparent',
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3d5266', // default border
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3d5266', // hover border
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3d5266', // focused border
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          color: '#ffffff',
        },
        icon: {
          color: '#e9e9e9',
        },
      },
    },

    MuiPopover: {
      styleOverrides: {
        paper: {
          background: '#1a2736',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          border: '1px solid #3d5266',
          color: '#fff',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        track: '',
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          maxWidth: '100%',
          background: '#fff',
          color: '#000',
          fontSize: '0.75rem',
          borderRadius: 8,
          boxShadow: '0px 1px 4px 0px rgba(16, 24, 40, 0.25)',
        },
        arrow: {
          color: '#fff',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: {
          borderRadius: 8,
          textTransform: 'initial',
          fontSize: '0.85rem',
          color: '#fff',
          background: '#316eeb',
          border: '1px solid #316eeb',
          ':hover': {
            background: '#316eeb',
            color: '#fff',
          },
          ':disabled': {
            border: 'none',
            background: '#fff',
            color: '#000',
            opacity: 0.5,
          },
        },
        outlined: {
          borderRadius: 8,
          textTransform: 'initial',
          fontSize: '0.85rem',
          color: '#fff',
          background: 'transparent',
          ':hover': {
            background: '#fff',
            color: '#000',
          },
          border: 'solid 1px #D0C1C1',
        },
        text: {
          borderRadius: 8,
          textTransform: 'initial',
          fontSize: '0.85rem',
          color: '#535862',
          background: 'transparent',
          ':hover': {
            background: 'rgba(87,87,87,0.3)',
            color: '#535862',
          },
        },
        root: {
          borderRadius: 8,
          textTransform: 'initial',
          fontSize: '0.85rem',
          color: '#fff',
          background: 'linear-gradient(90deg, #00835E 0%, #00573F 100%)',
          ':hover': {
            background: 'linear-gradient(90deg, #00835E 0%, #01815e 100%)',
            color: '#fff',
          },
          '&:disabled': {
            background: '#232323',
          },
          border: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          color: '#94a3b8',
          boxShadow: 'none',
          backgroundColor: '#1a2736',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: '#fff',
          boxShadow: 'none',
          borderBottom: '0.5px solid rgba(0, 0, 0, 0.10)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          background: 'rgba(38,38,38,0)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#3d5266',
        },
        stickyHeader: {
          background: '#243447',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          background: 'transparent',
        },
      },
    },

    MuiLink: {
      styleOverrides: {
        root: {
          textDecoration: 'none',
          color: 'inherit',
        },
      },
    },
  },
};