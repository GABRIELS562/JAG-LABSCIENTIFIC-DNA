import { google } from "googleapis";
import credentials from "./credentials.json";

const SPREADSHEET_ID = "1Z-6iIUL6G5ERIgohoNhZdO79XkfKeeLvoaxeB2rulhY";
const SHEET_NAME = "Sheet1";

const auth = new google.auth.GoogleAuth({
	credentials,
	scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// Export the function for getting last lab number
export const getLastLabNumber = async () => {
	try {
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId: SPREADSHEET_ID,
			range: `${SHEET_NAME}!A:A`,
		});

		const values = response.data.values || [];
		if (values.length === 0) return 0;

		// Filter for current year's entries and get the highest number
		const currentYear = new Date().getFullYear();
		const yearPrefix = `${currentYear}_`;

		const numbers = values
			.filter((row) => row[0]?.startsWith(yearPrefix))
			.map((row) => parseInt(row[0].split("_")[1]) || 0);

		return Math.max(0, ...numbers);
	} catch (error) {
		console.error("Error getting last lab number:", error);
		return 0;
	}
};

// Export the function for appending to sheet
export const appendToSheet = async (childRow, fatherRow) => {
	try {
		const response = await sheets.spreadsheets.values.append({
			spreadsheetId: SPREADSHEET_ID,
			range: `${SHEET_NAME}!A:P`,
			valueInputOption: "USER_ENTERED",
			requestBody: {
				values: [
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
				],
			},
		});
		return response.data;
	} catch (error) {
		console.error("Error appending to sheet:", error);
		throw error;
	}
};
