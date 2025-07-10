# PM2 Process Management Setup

## ✅ PERMANENT FIX IMPLEMENTED

This document describes the PM2 process management setup that **permanently fixes** the server connection and port conflict issues.

## 🔧 What Was Fixed

### Problems Solved:
1. **Multiple Server Instances**: No more conflicting Node processes
2. **Port Conflicts**: Backend always uses port 3001, frontend uses 5173
3. **Process Management**: Automatic restart on crashes
4. **Connection Stability**: Reliable API connections

## 🚀 How to Use

### Start the Application:
```bash
# Method 1: Using npm script
npm start

# Method 2: Using startup script
npm run startup

# Method 3: Using PM2 directly
pm2 start ecosystem.config.js
```

### Manage the Application:
```bash
# Check status
npm run status

# View logs
npm run logs

# Restart services
npm run restart

# Stop services
npm run stop
```

### Access the Application:
- **Frontend**: http://localhost:5173/
- **Backend**: http://localhost:3001/
- **API Test**: http://localhost:5173/api/test

## 📊 PM2 Management Commands

```bash
# View real-time monitoring
pm2 monit

# View logs for specific service
pm2 logs lims-backend
pm2 logs lims-frontend

# Restart specific service
pm2 restart lims-backend
pm2 restart lims-frontend

# Stop specific service
pm2 stop lims-backend
pm2 stop lims-frontend

# Delete processes (complete cleanup)
pm2 delete all
```

## 🛠️ Configuration Files

### `ecosystem.config.js`
- Defines PM2 process configuration
- Sets environment variables
- Configures logging
- Sets restart policies

### `start.sh`
- Comprehensive startup script
- Cleans up existing processes
- Starts PM2 with proper configuration
- Shows status and connection URLs

## 🔍 Troubleshooting

### If services don't start:
```bash
# Check what's using the ports
lsof -i :3001
lsof -i :5173

# Kill processes manually
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Restart PM2
pm2 delete all
pm2 start ecosystem.config.js
```

### If API connections fail:
```bash
# Test backend directly
curl http://localhost:3001/api/test

# Test through frontend proxy
curl http://localhost:5173/api/test

# Check PM2 logs
pm2 logs
```

## 📁 Log Files

Logs are stored in:
- Backend: `backend/logs/`
- Frontend: `logs/`
- PM2 system logs: `~/.pm2/logs/`

## 🎯 Benefits

1. **Reliability**: Services automatically restart on crashes
2. **Consistency**: Fixed ports prevent proxy configuration issues
3. **Monitoring**: Real-time process monitoring and logging
4. **Scalability**: Easy to scale services if needed
5. **Development**: Consistent development environment

## 📝 Next Steps

1. The application is now running with PM2
2. All electrophoresis plate features are implemented
3. Sample loading issues are resolved
4. Stable server connections established

**No more server connection issues!** 🎉