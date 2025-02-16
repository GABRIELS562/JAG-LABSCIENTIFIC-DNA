const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const apiRoutes = require("./routes/api");

// Load environment variables from root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Use routes
app.use("/api", apiRoutes);

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Server is running" });
});

const port = process.env.PORT || 3001;

const server = app
  .listen(port, () => {
    console.log(`Server running on port: ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} is busy. Trying ${port + 1}`);
      server.listen(port + 1);
    } else {
      console.error("Server error:", err);
    }
  });
