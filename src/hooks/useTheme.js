import React, { useState, useMemo, useEffect } from "react";
import { createTheme } from "@mui/material";

// Dark Lab Mode color scheme
const colors = {
  primary: "#00d4ff", // Neon cyan
  secondary: "#00ff88", // Neon green
  accent: "#a855f7", // Purple accent
  dark: "#0a0a0f", // Deep dark
  surface: "#1a1a2e", // Surface color
  surfaceLight: "#252542", // Lighter surface
  border: "#2a2a4a", // Border color
  text: "#e5e7eb", // Light text
  textMuted: "#9ca3af", // Muted text
  white: "#FFFFFF",
  warning: "#fbbf24", // Amber for warnings
  error: "#ef4444", // Red for errors
  success: "#00ff88", // Neon green for success
  info: "#00d4ff", // Cyan for info
};

export const useTheme = () => {
  // Initialize from localStorage, default to dark mode for Dark Lab Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "dark",
          primary: {
            main: colors.primary,
            light: "#33dfff",
            dark: "#00a8cc",
          },
          secondary: {
            main: colors.secondary,
            light: "#33ff99",
            dark: "#00cc6d",
          },
          warning: {
            main: colors.warning,
          },
          error: {
            main: colors.error,
          },
          success: {
            main: colors.success,
          },
          info: {
            main: colors.info,
          },
          background: {
            default: colors.dark,
            paper: colors.surface,
          },
          text: {
            primary: colors.text,
            secondary: colors.textMuted,
          },
          divider: colors.border,
          action: {
            hover: "rgba(0, 212, 255, 0.08)",
            selected: "rgba(0, 212, 255, 0.15)",
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                borderColor: colors.border,
                transition: 'all 0.3s ease',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
              },
              contained: {
                background: `linear-gradient(135deg, ${colors.primary} 0%, #00a8cc 100%)`,
                boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
                '&:hover': {
                  boxShadow: '0 0 30px rgba(0, 212, 255, 0.5)',
                },
              },
              outlined: {
                borderColor: colors.border,
                '&:hover': {
                  borderColor: colors.primary,
                  backgroundColor: 'rgba(0, 212, 255, 0.1)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'rgba(0, 212, 255, 0.3)',
                  boxShadow: '0 0 30px rgba(0, 212, 255, 0.1)',
                },
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                background: 'linear-gradient(180deg, #0a0a0f 0%, #12121f 100%)',
                borderRight: `1px solid ${colors.border}`,
                transition: 'all 0.3s ease',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0, 212, 255, 0.08)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 212, 255, 0.15)',
                  borderLeft: `3px solid ${colors.primary}`,
                  '&:hover': {
                    backgroundColor: 'rgba(0, 212, 255, 0.2)',
                  },
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: colors.border,
                  },
                  '&:hover fieldset': {
                    borderColor: colors.primary,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                    boxShadow: '0 0 15px rgba(0, 212, 255, 0.2)',
                  },
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(0, 212, 255, 0.15)',
                color: colors.primary,
                border: '1px solid rgba(0, 212, 255, 0.3)',
              },
            },
          },
          MuiLinearProgress: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(42, 42, 74, 0.5)',
                borderRadius: '4px',
              },
              bar: {
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                borderRadius: '4px',
              },
            },
          },
          MuiTabs: {
            styleOverrides: {
              indicator: {
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                height: '3px',
                borderRadius: '3px 3px 0 0',
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                '&.Mui-selected': {
                  color: colors.primary,
                },
              },
            },
          },
          MuiTableHead: {
            styleOverrides: {
              root: {
                '& .MuiTableCell-root': {
                  backgroundColor: 'rgba(26, 26, 46, 0.8)',
                  color: colors.primary,
                  fontWeight: 600,
                },
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                '&:hover': {
                  backgroundColor: 'rgba(0, 212, 255, 0.05)',
                },
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                backgroundColor: 'rgba(26, 26, 46, 0.98)',
                border: `1px solid ${colors.border}`,
                borderRadius: '16px',
                backdropFilter: 'blur(20px)',
              },
            },
          },
          MuiAlert: {
            styleOverrides: {
              root: {
                backgroundColor: 'rgba(26, 26, 46, 0.9)',
                border: `1px solid ${colors.border}`,
              },
              standardSuccess: {
                borderColor: 'rgba(0, 255, 136, 0.3)',
              },
              standardError: {
                borderColor: 'rgba(239, 68, 68, 0.3)',
              },
              standardWarning: {
                borderColor: 'rgba(251, 191, 36, 0.3)',
              },
              standardInfo: {
                borderColor: 'rgba(0, 212, 255, 0.3)',
              },
            },
          },
        },
        typography: {
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        },
        shape: {
          borderRadius: 8,
        },
      }),
    [isDarkMode],
  );

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      if (newMode) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
      return newMode;
    });
  };

  // Apply theme classes based on isDarkMode state
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  return { theme, isDarkMode, toggleTheme, colors };
};
