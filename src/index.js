import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// 🎨 Optional: remove if not using custom index.css styles
// import './index.css';

// ✅ Minimalist, elegant theme configuration
const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f9fafb", // light gray background
      paper: "#ffffff", // white for cards/panels
    },
    primary: {
      main: "#3b82f6", // soft blue
    },
    secondary: {
      main: "#10b981", // soft green (optional)
    },
    text: {
      primary: "#1f2937", // dark gray
      secondary: "#6b7280", // mid-gray
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, sans-serif",
    fontSize: 14,
  },
  shape: {
    borderRadius: 8,
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
