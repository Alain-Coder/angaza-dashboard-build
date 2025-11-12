# Angaza Foundation Dashboard - Firebase Authentication

This project implements Firebase Authentication with role-based access control for the Angaza Foundation Dashboard.

## Features

- Firebase Authentication (Email/Password)
- Role-based access control for 8 user roles:
  - System Administrator (special role for user management only)
  - Board
  - Executive Director
  - Finance Director
  - Programs Lead
  - Admin Officer
  - Community Outreach Officer
  - Monitoring and Evaluation Lead
- Protected routes with middleware
- Individual dashboards for each role
- User management system

## Setup Instructions

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Enable Email/Password authentication in Firebase Authentication settings

3. Create a Firestore database

4. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely

5. Add the following environment variables to `.env.local`:
   ```
   # Firebase Admin SDK Configuration (required for API routes)
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY_ID=your_private_key_id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=your_service_account_email@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your_client_id
   FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your_service_account_email%40your-project.iam.gserviceaccount.com

   # Firebase Client SDK Configuration (required for frontend)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

6. Copy the values from your service account JSON file:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (make sure to keep the \n characters)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `client_id` → `FIREBASE_CLIENT_ID`
   - `client_x509_cert_url` → `FIREBASE_CLIENT_CERT_URL`

7. Install dependencies:
   ```bash
   npm install
   ```

8. Create the system administrator user:
   - You can either manually create the user in Firebase Console with email `admin@angazafoundation.org`
   - Or use the initialization script (requires Firebase Admin SDK setup)

9. Run the development server:
   ```bash
   npm run dev
   ```

## Role-Based Access

Each role has its own dedicated dashboard with relevant functionality:

- **System Administrator**: User management only
- **Board**: High-level organizational overview
- **Executive Director**: Operational management
- **Finance Director**: Financial oversight
- **Programs Lead**: Program management
- **Admin Officer**: Administrative operations
- **Community Outreach Officer**: Community engagement
- **Monitoring and Evaluation Lead**: Impact assessment

## Authentication Flow

1. System Administrator creates user accounts through the admin interface
2. Users log in through the login page
3. Users are redirected to their role-specific dashboard
4. Navigation is restricted based on user roles

## File Structure

```
/app
  /login - Login page
  /dashboard - Main dashboard (original functionality)
  /system-admin - System admin dashboard (user management)
  /board - Board member dashboard
  /executive-director - Executive Director dashboard
  /finance-director - Finance Director dashboard
  /programs-lead - Programs Lead dashboard
  /admin-officer - Admin Officer dashboard
  /community-outreach-officer - Community Outreach Officer dashboard
  /monitoring-evaluation-lead - M&E Lead dashboard
/contexts - Authentication context
/components
  /auth - Authentication components
  /role-based-layout - Layout component for role dashboards
/lib - Firebase configuration
/scripts - Initialization scripts
```

## Security Considerations

- All routes are protected client-side using ProtectedRoute component
- Server-side middleware provides additional protection
- User roles are stored in Firestore and verified on login
- Sensitive operations should implement additional server-side validation
- The system admin role has exclusive access to user management

## Deployment

This application can be deployed to any platform that supports Next.js, such as Vercel, Netlify, or a custom server.