const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const dbViewerRoutes = require("./routes/database-viewer");
const geneticAnalysisRoutes = require("./routes/genetic-analysis");

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api/db", dbViewerRoutes);
app.use("/api/genetic-analysis", geneticAnalysisRoutes);

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Server is running" });
});

const port = process.env.PORT || 3001;

const server = app
  .listen(port, () => {
    // Server started successfully
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      server.listen(port + 1);
    } else {
      // Server error occurred
      process.exit(1);
    }
  });
