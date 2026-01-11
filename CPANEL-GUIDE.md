# cPanel Deployment Guide

## Prerequisites
- cPanel account with Node.js support
- SSH access or File Manager access
- Assigned port from cPanel

## Deployment Steps

### 1. Upload Files
Upload all application files to your cPanel file manager:
- All application files and directories
- `server.js` (custom server)
- `cpanel-start.js` (cPanel startup script)
- `package.json`
- Environment configuration files

### 2. Install Dependencies
Navigate to your application directory and install dependencies:
```bash
npm install --production
```

### 3. Build the Application
```bash
npm run build
```

### 4. Configure cPanel Application Manager

1. Login to cPanel
2. Go to "Setup Node.js App" or "Application Manager"
3. Create a new application with these settings:
   - **Node.js version**: 18.x or higher
   - **Application mode**: Production
   - **Application root**: Path to your application directory
   - **Application URL**: `/` (root)
   - **Application startup file**: `cpanel-start.js`
   - **Port**: Use the assigned port from cPanel

### 5. Set Environment Variables

In the cPanel Node.js application settings, configure these environment variables:
```
NODE_ENV=production
PORT=[assigned_port_from_cpanel]
```

### 6. Start the Application

Start your application from the cPanel interface. The application should now be accessible through your domain.

## Troubleshooting 503 Errors

### Common Causes and Solutions

1. **Port Conflicts**
   - Ensure no other application is using the same port
   - Check cPanel for port assignments
   - Use a different port if necessary

2. **Application Not Listening on Correct Interface**
   - Server must bind to `0.0.0.0`, not `localhost`
   - Our server.js is already configured correctly

3. **Application Not Starting Properly**
   - Check cPanel logs for error messages
   - Verify all dependencies are installed
   - Ensure build process completed successfully

4. **Reverse Proxy Issues**
   - cPanel should automatically handle reverse proxy
   - Make sure the Application Manager is configured correctly

## Health Check

Test if your application is running properly:
```bash
curl http://localhost:[PORT]/api/health
```

You should receive a response like:
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T12:00:00.000Z",
  "message": "Angaza Foundation Dashboard is running",
  "port": 3000
}
```

## Monitoring

- Check cPanel logs regularly
- Monitor resource usage
- Set up alerts for application downtime

## Restarting the Application

If you need to restart the application:
1. Stop the application in cPanel Application Manager
2. Start the application again
3. Or use the restart button in the interface