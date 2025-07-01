require("dotenv").config();
const { setupSheetStructure } = require("../services/spreadsheets");

async function initialize() {
  try {
    await setupSheetStructure();
  } catch (error) {
    console.error("Error initializing sheets:", error);
  }
}

initialize();
