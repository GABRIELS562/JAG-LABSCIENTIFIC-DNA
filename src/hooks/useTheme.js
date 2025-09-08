import React, { useState, useMemo, useEffect } from "react";
import { createTheme } from "@mui/material";

// LabScientific LIMS color scheme - moved outside component to prevent re-creation
const colors = {
  primary: "#0D488F", // LabScientific blue
  secondary: "#8EC74F", // LabScientific green
  accent: "#DBF1FC", // Light blue
  dark: "#022539", // Dark blue
  text: "#444444", // Dark gray text
  white: "#FFFFFF",
  lightGray: "#F5F5F5",
  warning: "#ff9800", // Orange for warnings/pending states
  error: "#ef5350", // Red for errors/failures
  success: "#8EC74F", // Green for success (same as secondary)
  info: "#0D488F", // Blue for info (same as primary)
  // Additional semantic colors
  hover: {
    primary: "#1e4976",
    secondary: "#6BA23A",
    dark: "#011729"
  }
};

export const useTheme = () => {
  // Initialize dark mode from localStorage, default to dark
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme');
    if (stored) {
      return stored === 'dark';
    }
    // Default to dark mode (true) instead of checking system preference
    return true;
  });

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? "dark" : "light",
          primary: {
            main: colors.primary,
            light: colors.accent,
            dark: colors.hover.primary,
          },
          secondary: {
            main: colors.secondary,
            light: "#A8D66F",
            dark: colors.hover.secondary,
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
            default: isDarkMode ? "#111827" : colors.white,
            paper: isDarkMode ? "#1F2937" : colors.white,
          },
          text: {
            primary: isDarkMode ? "#F9FAFB" : colors.text,
            secondary: isDarkMode ? "rgba(249,250,251,0.7)" : "rgba(68,68,68,0.7)",
          },
          divider: isDarkMode ? "rgba(249,250,251,0.12)" : "rgba(0,0,0,0.12)",
          action: {
            hover: isDarkMode ? "rgba(249,250,251,0.04)" : "rgba(0,0,0,0.04)",
            selected: isDarkMode ? "rgba(249,250,251,0.08)" : "rgba(0,0,0,0.08)",
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: 'background-color 0.3s ease, color 0.3s ease',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                transition: 'all 0.3s ease',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                transition: 'background-color 0.3s ease, color 0.3s ease',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                transition: 'background-color 0.3s ease, color 0.3s ease',
              },
            },
          },
        },
      }),
    [isDarkMode],
  );

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      // Save to localStorage
      localStorage.setItem('theme', newMode ? 'dark' : 'light');
      // Apply to document root for better CSS targeting
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

  // Effect to apply theme on initial load and changes
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
