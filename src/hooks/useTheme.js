import { useState, useMemo } from "react";
import { createTheme } from "@mui/material";

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // LabScientific LIMS color scheme
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
            default: isDarkMode ? colors.dark : colors.white,
            paper: isDarkMode ? "#032539" : colors.white,
          },
          text: {
            primary: isDarkMode ? colors.white : colors.text,
            secondary: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(68,68,68,0.7)",
          },
        },
      }),
    [isDarkMode, colors],
  );

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return { theme, isDarkMode, toggleTheme, colors };
};
