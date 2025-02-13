# LabDNA LIMS System

A Laboratory Information Management System (LIMS) for DNA testing labs.

## Setup Instructions

1. Clone the repository
```bash
git clone https://github.com/yourusername/labdna-lims.git
cd labdna-lims
```

2. Install dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Configuration

Backend setup:
- Copy `.env.example` to `.env` and fill in your values
- Create a `config` folder in the backend directory
- Copy `credentials.example.json` to `config/credentials.json` and fill in your Google API credentials

4. Start the application
```bash
# Start backend
cd backend
npm start

# Start frontend (in a new terminal)
cd frontend
npm run dev
```

## Environment Variables

The following environment variables are required:

- `SPREADSHEET_ID`: Google Sheets spreadsheet ID
- `PORT`: Backend server port (default: 3001)

## Security Note

Never commit sensitive information like:
- `.env` files
- `credentials.json`
- API keys
- Private keys

## Features

- Paternity Test Registration
- Batch Generation
- STX File Export
- Sample Management
- Report Generation