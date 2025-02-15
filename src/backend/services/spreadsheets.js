const { google } = require("googleapis");
const path = require("path");

// Initialize Google Sheets
const initializeSheets = () => {
  try {
    const credentialsPath = path.join(
      __dirname,
      "..",
      "config",
      "credentials.json",
    );
    const credentials = require(credentialsPath);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return google.sheets({ version: "v4", auth });
  } catch (error) {
    console.error("Error initializing sheets:", error);
    throw error;
  }
};

const sheets = initializeSheets();

const appendRows = async (sheetName, rows) => {
  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${sheetName}!A:P`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });
    return response.data;
  } catch (error) {
    console.error("Error appending rows:", error);
    throw error;
  }
};

const getLastLabNumber = async (sheetName) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
    });
    return response.data.values;
  } catch (error) {
    console.error("Error getting last lab number:", error);
    throw error;
  }
};

module.exports = {
  sheets,
  appendRows,
  getLastLabNumber,
};
