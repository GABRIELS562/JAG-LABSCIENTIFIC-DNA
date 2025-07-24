# 🧬 LabScientific LIMS

**A modern Laboratory Information Management System (LIMS) for genetic analysis and paternity testing.**

[![React](https://img.shields.io/badge/React-18.2-blue?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org/)
[![Material-UI](https://img.shields.io/badge/Material--UI-5.x-blue?logo=mui)](https://mui.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.x-lightgrey?logo=sqlite)](https://sqlite.org/)

A comprehensive Laboratory Information Management System designed for forensic and paternity testing laboratories. Features end-to-end workflow management from sample collection to final reporting, with integrated genetic analysis capabilities.

## ✨ **Key Features**

### **🔬 Laboratory Workflow Management**
- **Sample Management**: Complete sample lifecycle tracking
- **Batch Processing**: PCR and electrophoresis batch management  
- **Quality Control**: Automated quality assurance workflows
- **Chain of Custody**: Full audit trail and compliance tracking

### **🧬 Genetic Analysis Integration**
- **Osiris Integration**: Direct integration with OSIRIS genetic analysis software
- **STR Analysis**: Support for major STR kits (Identifiler Plus, PowerPlex Fusion, GlobalFiler)
- **Automated Results**: Streamlined analysis workflow with automated data processing
- **Visual Analytics**: Executive-level dashboards and reporting

### **📊 Advanced Features**
- **Real-time Dashboard**: Live statistics and performance metrics
- **Smart Notifications**: Context-aware alerts and status updates
- **Responsive Design**: Mobile-friendly interface with dark/light mode
- **RESTful API**: Comprehensive API for external integrations

## 🏗️ **Technology Stack**

### **Frontend**
- **React 18**: Modern UI framework with hooks
- **Material-UI 5**: Professional component library
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing

### **Backend**
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework  
- **Better-SQLite3**: High-performance SQLite driver
- **Multer**: File upload handling

### **Database**
- **SQLite**: Embedded database
- **Full-text search**: Advanced querying capabilities
- **ACID compliance**: Data integrity guarantees

### **External Integrations**
- **OSIRIS**: Genetic analysis software
- **Google Sheets**: Data backup and sharing
- **PDF Generation**: Automated reporting

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Node.js Backend │    │   SQLite Database│
│                 │◄──►│                 │◄──►│                 │
│ • Material-UI   │    │ • Express.js    │    │ • Better-SQLite3│
│ • Vite          │    │ • RESTful API   │    │ • ACID Compliant│
│ • State Mgmt    │    │ • File Upload   │    │ • Full-Text Search│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │ Osiris Software │
                       │                 │
                       │ • STR Analysis  │
                       │ • FSA Processing│
                       │ • Report Gen    │
                       └─────────────────┘
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- OSIRIS 2.16+ (for genetic analysis)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/your-username/labscientific-lims.git
cd labscientific-lims

# Install dependencies
npm install

# Start backend server
cd backend && node server.js

# Start frontend (in new terminal)
npm run dev
```

### **Access Points**
- **Frontend**: http://localhost:5175
- **Backend API**: http://localhost:3001
- **Database**: SQLite (local file)

## 📱 **Usage**

### **Core Workflows**

1. **Sample Registration**
   - Navigate to Client Register
   - Enter case and sample information
   - Upload supporting documents

2. **Batch Management**
   - Create PCR/Electrophoresis batches
   - Track processing status
   - Monitor quality metrics

3. **Genetic Analysis**
   - Launch Osiris integration
   - Configure analysis parameters
   - Review results and generate reports

4. **Reporting**
   - Generate paternity reports
   - Export data in multiple formats
   - Maintain audit trails

## 📊 **Performance Features**

- **Optimized Queries**: Indexed database operations
- **Lazy Loading**: Component-level code splitting
- **Memoization**: Efficient re-rendering prevention  
- **Connection Pooling**: Database optimization
- **Error Boundaries**: Graceful error handling

## 🔐 **Security & Compliance**

- **Data Validation**: Input sanitization and validation
- **Audit Logging**: Complete activity tracking
- **Error Handling**: Secure error management
- **Data Backup**: Automated backup procedures

## 📈 **Analytics & Monitoring**

- **Real-time Metrics**: Live dashboard updates
- **Performance Tracking**: System health monitoring
- **Usage Statistics**: Comprehensive analytics
- **Alert System**: Proactive issue notification

## 🧪 **Testing Strategy**

- **Unit Tests**: Component and service testing
- **Integration Tests**: API endpoint validation
- **Error Boundary Tests**: Graceful failure handling
- **Performance Tests**: Load and stress testing

## 🚀 **Deployment**

The application supports multiple deployment strategies:

- **Development**: Local SQLite database
- **Production**: Containerized deployment
- **Cloud**: Docker + cloud database
- **Hybrid**: On-premise with cloud backup

## 📝 **API Documentation**

### **Key Endpoints**

```http
# Sample Management
GET    /api/samples
POST   /api/samples
PUT    /api/samples/:id

# Genetic Analysis  
GET    /api/genetic-analysis/cases
POST   /api/genetic-analysis/upload
POST   /api/genetic-analysis/launch-osiris

# Reporting
GET    /api/reports
POST   /api/reports/generate
```

## 🤝 **Contributing**

This project demonstrates modern full-stack development practices including:

- **Clean Architecture**: Separation of concerns
- **RESTful Design**: Standard API patterns
- **Responsive UI**: Mobile-first design
- **Performance Optimization**: Production-ready code
- **Error Handling**: Robust error management

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 **Project Highlights**

- **Full-Stack Development**: React + Node.js + SQLite
- **Complex Domain Logic**: Laboratory workflow management
- **External Integrations**: OSIRIS genetic analysis software
- **Modern UI/UX**: Material Design with dark/light modes
- **Performance Optimization**: Memoization, lazy loading, efficient queries
- **Production-Ready**: Error handling, logging, monitoring

---

**Built with ❤️ for the forensic science community**