import { useState, useMemo } from "react";
import { createTheme } from "@mui/material";

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? "dark" : "light",
          primary: {
            main: "#1e4976",
          },
          background: {
            default: isDarkMode ? "#121212" : "#ffffff",
            paper: isDarkMode ? "#1e1e1e" : "#ffffff",
          },
        },
        // ... rest of theme configuration
      }),
    [isDarkMode],
  );

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return { theme, isDarkMode, toggleTheme };
};
