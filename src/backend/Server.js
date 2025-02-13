const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const path = require("path");

// Initialize express app
const app = express();

// Configure middleware
app.use(cors());
app.use(express.json());

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Configure Google Sheets with better error handling
let sheets;
try {
	const credentialsPath = path.join(__dirname, "config", "credentials.json");
	console.log("Loading credentials from:", credentialsPath);

	const credentials = require(credentialsPath);
	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: ["https://www.googleapis.com/auth/spreadsheets"],
	});

	sheets = google.sheets({ version: "v4", auth });
	console.log("Google Sheets API initialized successfully");
} catch (error) {
	console.error("Error initializing Google Sheets API:", error);
	process.exit(1);
}

const SHEET_NAME = "TestData 2024"; // or whatever your sheet name is

// Test endpoint
app.get("/api/test", (req, res) => {
	res.json({
		success: true,
		message: "Server is running",
		timestamp: new Date().toISOString(),
	});
});

// Submit test endpoint
app.post("/api/submit-test", async (req, res) => {
	try {
		console.log("Receiving submission request");
		console.log("Request body:", JSON.stringify(req.body, null, 2));

		const { childRow, fatherRow } = req.body;

		if (!childRow || !fatherRow) {
			throw new Error("Missing child or father data");
		}

		const values = [
			[
				childRow.labNo,
				childRow.name,
				childRow.surname,
				childRow.idDob,
				childRow.relation,
				childRow.collectionDate,
				childRow.submissionDate,
				childRow.motherPresent,
				childRow.emailContact,
				childRow.addressArea,
				childRow.phoneContact,
				"", // Kit BN
				"", // Lab Batch No
				"", // Report No
				"", // Report Sent
				childRow.comments,
			],
			[
				fatherRow.labNo,
				fatherRow.name,
				fatherRow.surname,
				fatherRow.idDob,
				fatherRow.relation,
				fatherRow.collectionDate,
				fatherRow.submissionDate,
				fatherRow.motherPresent,
				fatherRow.emailContact,
				fatherRow.addressArea,
				fatherRow.phoneContact,
				"", // Kit BN
				"", // Lab Batch No
				"", // Report No
				"", // Report Sent
				fatherRow.comments,
			],
		];

		console.log("Attempting to append data...");
		const response = await sheets.spreadsheets.values.append({
			spreadsheetId: process.env.SPREADSHEET_ID,
			range: `${SHEET_NAME}!A:P`,
			valueInputOption: "USER_ENTERED",
			insertDataOption: "INSERT_ROWS",
			requestBody: { values },
		});

		console.log("Sheet API Response:", JSON.stringify(response.data, null, 2));

		res.json({
			success: true,
			data: response.data,
			updatedRange: response.data.updates?.updatedRange,
		});
	} catch (error) {
		console.error("Error in submit-test:");
		console.error("Error message:", error.message);
		console.error("Error stack:", error.stack);

		res.status(500).json({
			success: false,
			error: error.message,
			details: error.response?.data || "Server error occurred",
		});
	}
});

// Get last lab number endpoint
app.get("/api/get-last-lab-number", async (req, res) => {
	try {
		console.log("Fetching last lab number...");
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: process.env.SPREADSHEET_ID,
			range: `${SHEET_NAME}!A:A`,
		});

		const values = response.data.values || [];
		const currentYear = new Date().getFullYear();
		const yearPrefix = `${currentYear}_`;

		console.log("Found values:", values);

		const lastNumber = values
			.filter((row) => row[0]?.startsWith(yearPrefix))
			.map((row) => parseInt(row[0].split("_")[1]) || 0)
			.reduce((max, num) => Math.max(max, num), 0);

		console.log("Calculated last number:", lastNumber);
		res.json({ success: true, lastNumber });
	} catch (error) {
		console.error("Error getting last lab number:");
		console.error("Error message:", error.message);

		res.status(500).json({
			success: false,
			error: error.message,
			details: error.response?.data || "No additional details",
		});
	}
});

// Test sheet connection
app.get("/api/test-sheet", async (req, res) => {
	try {
		const response = await sheets.spreadsheets.get({
			spreadsheetId: process.env.SPREADSHEET_ID,
		});

		res.json({
			success: true,
			sheetTitle: response.data.sheets[0].properties.title,
			sheetId: response.data.sheets[0].properties.sheetId,
		});
	} catch (error) {
		console.error("Sheet test failed:", error);
		res.status(500).json({
			success: false,
			error: error.message,
			details: error.response?.data || "No additional details",
		});
	}
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
	console.log("\n=================================");
	console.log("Server Configuration:");
	console.log("---------------------------------");
	console.log(`Server running on port: ${PORT}`);
	console.log(`Environment: ${process.env.NODE_ENV}`);
	console.log(`Spreadsheet ID: ${process.env.SPREADSHEET_ID}`);
	console.log(`Sheet Name: ${SHEET_NAME}`);
	console.log("=================================\n");
});
