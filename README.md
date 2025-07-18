# LabScientific LIMS

A modern Laboratory Information Management System (LIMS) for DNA analysis and paternity testing.

> **Note**: This is the client production branch. For DevOps showcase with advanced configurations, see the `devops-showcase` branch.

## Project Structure

```
/
├── src/                          # Frontend React application
├── backend/                      # Node.js backend server
├── docs/                         # Documentation files
├── public/                      # Static assets and Electron files
├── Dockerfile                   # Container configuration
└── docker-compose.yml          # Simple deployment setup
```

## Quick Start

### Development

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   ```

2. **Start development servers:**
   ```bash
   # Start backend
   cd backend && npm run dev
   
   # Start frontend (in another terminal)
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

### Production Deployment (Docker)

1. **Build and start containers:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - LIMS Application: http://localhost:3000
   - API: http://localhost:3001

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Production Build (Electron)

1. **Build for production:**
   ```bash
   npm run build:prod
   ```

2. **Build Electron app:**
   ```bash
   npm run build:electron:prod
   ```

## Features

- **Sample Management**: Register and track DNA samples
- **Batch Processing**: PCR and electrophoresis batch management
- **Genetic Analysis**: STR analysis with Osiris integration
- **Quality Control**: Comprehensive QC tracking
- **Report Generation**: Automated paternity reports
- **Mobile Responsive**: Optimized for desktop and mobile devices

## Technology Stack

- **Frontend**: React, Material-UI, Vite
- **Backend**: Node.js, Express, SQLite
- **Desktop**: Electron
- **Analysis**: Osiris STR analysis software

## Architecture

The application follows a client-server architecture with:
- React frontend for user interface
- Node.js backend for API and business logic
- SQLite database for data persistence
- Electron wrapper for desktop deployment

## Development Guidelines

- Console logging has been removed for production readiness
- Mobile-responsive design implemented
- File structure organized for clean deployment
- Environment-specific configurations supported

## Security

- Sensitive files excluded from version control
- Environment-based configuration
- Secure handling of genetic data
- Production-ready error handling

## Documentation

Detailed documentation is available in the `/docs/` directory:
- Setup and installation guides
- API documentation
- Integration guides
- Deployment instructions

## License

This project is proprietary software for laboratory use.