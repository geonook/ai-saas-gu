'use client';

import { useTheme } from 'next-themes';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useMemo } from 'react';

interface MuiThemeProviderProps {
  children: React.ReactNode;
}

export function MuiThemeProvider({ children }: MuiThemeProviderProps) {
  const { theme } = useTheme();

  const muiTheme = useMemo(() => {
    const isDark = theme === 'dark';
    
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: isDark ? '#ffffff' : '#000000',
        },
        background: {
          default: isDark ? '#0a0a0a' : '#ffffff',
          paper: isDark ? '#1a1a1a' : '#ffffff',
        },
      },
      components: {
        // DataGrid styles will be applied via CSS classes
      },
    });
  }, [theme]);

  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}