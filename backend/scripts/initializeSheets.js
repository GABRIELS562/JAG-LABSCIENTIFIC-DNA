require("dotenv").config();
const { setupSheetStructure } = require("../services/spreadsheets");

async function initialize() {
  try {
    await setupSheetStructure();
    console.log("Sheets initialized successfully");
  } catch (error) {
    console.error("Error initializing sheets:", error);
  }
}

initialize();
