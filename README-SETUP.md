# Angaza Foundation Dashboard - Setup Instructions

## Environment Variables Setup

To run this application, you need to set up Firebase environment variables. Follow these steps:

### 1. Firebase Project Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Email/Password authentication in Firebase Authentication settings
3. Create a Firestore database
4. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely

### 2. Environment Variables Configuration

Create a `.env.local` file in the root directory of the project with the following variables:

```env
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

# Next.js Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Copy Values from Service Account JSON

Copy the values from your downloaded service account JSON file:

- `project_id` → `FIREBASE_PROJECT_ID`
- `private_key_id` → `FIREBASE_PRIVATE_KEY_ID`
- `private_key` → `FIREBASE_PRIVATE_KEY` (make sure to keep the \n characters)
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `client_id` → `FIREBASE_CLIENT_ID`
- `client_x509_cert_url` → `FIREBASE_CLIENT_CERT_URL`

### 4. Firebase Client SDK Configuration

Get these values from your Firebase project settings (Project Settings > General):

- `apiKey` → `NEXT_PUBLIC_FIREBASE_API_KEY`
- `authDomain` → `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `projectId` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `storageBucket` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `messagingSenderId` → `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `appId` → `NEXT_PUBLIC_FIREBASE_APP_ID`
- `measurementId` → `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

### 5. Running the Application

After setting up the environment variables:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create the system administrator user:
   ```bash
   node scripts/init-admin.js
   ```

3. Initialize default departments:
   ```bash
   node scripts/init-departments.js
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

### 6. Troubleshooting

If you encounter Firebase initialization errors:

1. Check that all required environment variables are set
2. Ensure the private key format is correct (with \n characters)
3. Verify that the service account has the necessary permissions
4. Check that the Firebase project is properly configured

The application will run without Firebase if the environment variables are not set, but some features will be disabled.