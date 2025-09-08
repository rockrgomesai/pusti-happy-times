import { createTheme, ThemeOptions } from '@mui/material/styles';

// Apple-inspired color palette
const lightPalette = {
  primary: {
    main: '#007AFF', // iOS blue
    light: '#5AC8FA',
    dark: '#0051D5',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#5856D6', // iOS purple
    light: '#AF52DE',
    dark: '#5856D6',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#FF3B30', // iOS red
    light: '#FF6961',
    dark: '#FF1744',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#FF9500', // iOS orange
    light: '#FFAD33',
    dark: '#E68900',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#34C759', // iOS green
    light: '#4CD964',
    dark: '#30B350',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F2F2F7', // iOS light gray background
    paper: '#FFFFFF',
  },
  text: {
    primary: '#000000',
    secondary: '#8E8E93',
    disabled: '#C7C7CC',
  },
  divider: '#C6C6C8',
};

const darkPalette = {
  primary: {
    main: '#0A84FF', // iOS dark mode blue
    light: '#5AC8FA',
    dark: '#0051D5',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#5E5CE6', // iOS dark mode purple
    light: '#AF52DE',
    dark: '#5856D6',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#FF453A', // iOS dark mode red
    light: '#FF6961',
    dark: '#FF1744',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#FF9F0A', // iOS dark mode orange
    light: '#FFAD33',
    dark: '#E68900',
    contrastText: '#000000',
  },
  success: {
    main: '#30D158', // iOS dark mode green
    light: '#4CD964',
    dark: '#30B350',
    contrastText: '#000000',
  },
  background: {
    default: '#000000', // iOS dark mode background
    paper: '#1C1C1E',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#8E8E93',
    disabled: '#48484A',
  },
  divider: '#38383A',
};

// Apple-inspired typography
const typography = {
  fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.43,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'none' as const,
  },
};

// Apple-inspired component overrides
const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        textTransform: 'none' as const,
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      contained: {
        '&:hover': {
          transform: 'translateY(-1px)',
          transition: 'transform 0.2s ease-in-out',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'box-shadow 0.3s ease-in-out',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 12,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 8,
        },
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(20px)',
        backgroundColor: 'rgba(248, 248, 248, 0.8)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: '0 12px 12px 0',
        border: 'none',
      },
    },
  },
};

// Light theme configuration
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    ...lightPalette,
  },
  typography,
  components,
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
};

// Dark theme configuration
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    ...darkPalette,
  },
  typography,
  components: {
    ...components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(28, 28, 30, 0.8)',
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
};

export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);
