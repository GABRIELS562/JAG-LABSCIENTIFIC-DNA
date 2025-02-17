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
    console.log("Loading credentials from:", credentialsPath);

    const credentials = require(credentialsPath);
    console.log("Service account email:", credentials.client_email);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    console.log("Google Sheets API initialized successfully");
    return google.sheets({ version: "v4", auth });
  } catch (error) {
    console.error("Error initializing sheets:", error);
    throw error;
  }
};

const sheets = initializeSheets();

const appendRows = async (spreadsheetType, sheetName, rows) => {
  console.log("\n=== Spreadsheet Service Debug ===");
  console.log("Function called with:", { spreadsheetType, sheetName });
  console.log("Environment in service:", {
    MAIN_ID: process.env.MAIN_SPREADSHEET_ID,
    BATCH_ID: process.env.BATCH_SPREADSHEET_ID,
  });

  try {
    if (!process.env.MAIN_SPREADSHEET_ID || !process.env.BATCH_SPREADSHEET_ID) {
      console.error("Missing spreadsheet IDs in environment");
      throw new Error("Spreadsheet IDs not found in environment variables");
    }

    const spreadsheetId =
      spreadsheetType === "MAIN"
        ? process.env.MAIN_SPREADSHEET_ID
        : process.env.BATCH_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error(`No spreadsheet ID found for type: ${spreadsheetType}`);
    }

    console.log("Attempting to append rows:");
    console.log("Spreadsheet Type:", spreadsheetType);
    console.log("Sheet Name:", sheetName);
    console.log("Spreadsheet ID:", spreadsheetId);
    console.log("Rows to append:", rows);

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:P`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });

    console.log("Append response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      errors: error.errors,
      response: error.response?.data,
    });
    throw error;
  }
};

const getLastLabNumber = async (sheetName) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
    });
    return response.data.values;
  } catch (error) {
    console.error("Error getting last lab number:", error);
    throw error;
  }
};

const SHEETS = {
  MAIN_DATA: {
    name: "TestData 2024",
    columns: {
      LAB_NO: "Lab No",
      NAME: "Name",
      SURNAME: "Surname",
      ID_DOB: "ID / DOB",
      RELATION: "Relation",
      COLLECTION_DATE: "Sample collection date",
      SUBMISSION_DATE: "Submissions Date",
      MOTHER_PRESENT: "Mother Present YES/NO",
      EMAIL: "Email contact",
      ADDRESS: "Address Area",
      PHONE: "Phone contact",
      KIT_BN: "Kit BN_",
      LAB_BATCH_NO: "Lab Batch No.",
      REPORT_NO: "Report No.",
      REPORT_SENT: "Report Sent",
      COMMENT: "Comment",
    },
  },
  BATCH_DATA: {
    name: "Batch Data",
    columns: {
      BATCH_INFO: {
        PCR_DATE: "A1",
        ELECTRO_DATE: "B1",
        BATCH_NO: "C1",
        SETTINGS: "D1",
      },
      WELL_DATA: {
        START_ROW: 8,
        WELL_NO: "A",
        LAB_NO: "B",
        NAME: "C",
        SURNAME: "D",
        ID_DOB: "E",
        RELATION: "F",
        COLLECTION_DATE: "G",
      },
    },
  },
  QC_DATA: {
    name: "Quality Control",
    columns: {
      DATE: "Date",
      BATCH_ID: "Batch ID",
      CONTROL_TYPE: "Control Type",
      RESULT: "Result",
      OPERATOR: "Operator",
      COMMENTS: "Comments",
    },
  },
  EQUIPMENT_DATA: {
    name: "Equipment",
    columns: {
      EQUIPMENT_ID: "Equipment ID",
      TYPE: "Type",
      LAST_CALIBRATION: "Last Calibration",
      NEXT_CALIBRATION: "Next Calibration",
      STATUS: "Status",
    },
  },
};

const setupSheetStructure = async () => {
  try {
    // Setup main data sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.MAIN_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            updateCells: {
              rows: [
                {
                  values: Object.values(SHEETS.MAIN_DATA.columns).map(
                    (header) => ({
                      userEnteredValue: { stringValue: header },
                      userEnteredFormat: {
                        textFormat: { bold: true },
                        backgroundColor: { red: 0.8, green: 0.8, blue: 0.8 },
                      },
                    }),
                  ),
                },
              ],
              fields: "userEnteredValue,userEnteredFormat",
              start: { sheetId: 0, rowIndex: 0, columnIndex: 0 },
            },
          },
        ],
      },
    });

    // Setup batch data sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.BATCH_SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            updateCells: {
              rows: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "PCR date" } },
                    { userEnteredValue: { stringValue: "Electro date" } },
                    { userEnteredValue: { stringValue: "Batch No" } },
                    { userEnteredValue: { stringValue: "Settings" } },
                  ].map((cell) => ({
                    ...cell,
                    userEnteredFormat: {
                      textFormat: { bold: true },
                      backgroundColor: { red: 0.8, green: 0.8, blue: 0.8 },
                    },
                  })),
                },
              ],
              fields: "userEnteredValue,userEnteredFormat",
              start: { sheetId: 0, rowIndex: 0, columnIndex: 0 },
            },
          },
        ],
      },
    });

    console.log("Sheet structures updated successfully");
    return true;
  } catch (error) {
    console.error("Error setting up sheet structures:", error);
    throw error;
  }
};

module.exports = {
  sheets,
  appendRows,
  getLastLabNumber,
  SHEETS,
  setupSheetStructure,
};
