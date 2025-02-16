# LABDNA LIMS (Laboratory Information Management System)

A modern laboratory information management system designed specifically for DNA testing facilities.

## Features

- **Batch Management**
  - Generate 96-well plate layouts
  - Interactive well plate visualization
  - Support for various sample types (Samples, Controls, Allelic Ladders)
  - Automated sample numbering and positioning

- **Sample Tracking**
  - Paternity test registration
  - Sample status monitoring
  - Batch tracking
  - Result management

- **Data Integration**
  - Google Sheets integration for data storage
  - Export plate layouts
  - Automated report generation

## Tech Stack

- **Frontend**
  - React 18
  - Material-UI v5
  - React Router v6
  - Context API for state management
  - Vite for build tooling

- **Backend**
  - Node.js
  - Express
  - Google Sheets API v4

## Setup

1. **Prerequisites**
   - Node.js (v14 or higher)
   - npm or yarn
   - Google Cloud Platform account with Sheets API enabled

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/GABRIELS562/ashley-lims-v2.git
   cd ashley-lims-v2

   # Install dependencies
   npm install

   # Install backend dependencies
   cd backend
   npm install
   ```

3. **Configuration**
   - Place your Google Cloud credentials in `backend/config/credentials.json`
   - Create `.env` file in project root with:
     ```
     VITE_API_URL=http://localhost:3001
     MAIN_SPREADSHEET_ID=your_main_spreadsheet_id
     BATCH_SPREADSHEET_ID=your_batch_spreadsheet_id
     PORT=3001
     NODE_ENV=development
     ```

4. **Running the Application**
   ```bash
   # Start backend server
   cd backend
   npm run server

   # In another terminal, start frontend
   cd ..
   npm run dev
   ```

## Project Structure
```
ashley-lims-v2/
├── backend/
│   ├── config/
│   │   └── credentials.json
│   ├── routes/
│   │   └── api.js
│   ├── services/
│   │   └── spreadsheets.js
│   └── server.js
├── src/
│   ├── components/
│   │   ├── features/
│   │   │   ├── GenerateBatch.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── WellPlateVisualization.jsx
│   │   ├── forms/
│   │   ├── layout/
│   │   └── ui/
│   ├── contexts/
│   ├── hooks/
│   ├── services/
│   │   └── api.js
│   └── App.jsx
└── package.json
```

## API Documentation

### Batch Management
```javascript
POST /api/batch/generate
GET /api/batch/:id
PUT /api/batch/:id
```

### Sample Management
```javascript
POST /api/samples
GET /api/samples/:id
PUT /api/samples/:id
```

## Deployment

1. **Backend Deployment**
   - Set up Node.js environment
   - Configure environment variables
   - Set up PM2 or similar process manager

2. **Frontend Deployment**
   - Build the frontend: `npm run build`
   - Deploy static files to web server
   - Configure for production environment

## Troubleshooting

Common issues and solutions:

1. **Google Sheets API Issues**
   - Verify credentials.json is properly configured
   - Check API quotas and limits
   - Ensure proper scopes are enabled

2. **Backend Connection Issues**
   - Verify backend is running on correct port
   - Check CORS configuration
   - Validate environment variables

3. **Frontend Build Issues**
   - Clear npm cache: `npm clean-cache`
   - Remove node_modules and reinstall
   - Check for version conflicts

## Security

- Ensure your `credentials.json` and `.env` files are not committed
- Keep your Google API credentials secure
- Follow security best practices for lab data
- Regular security audits and updates

## Contact

LABDNA SCIENTIFIC - [Contact Information]

Project Link: [https://github.com/GABRIELS562/ashley-lims-v2](https://github.com/GABRIELS562/ashley-lims-v2)