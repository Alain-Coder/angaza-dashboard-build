# File Management System

This document describes the file management system implemented for the Angaza Foundation dashboard.

## Features

1. **Role-Based Access Control**:
   - Each user can only see and manage their own files
   - Executive Directors have special access to view all files across all roles
   - Files are stored with metadata including creator, role, and timestamps

2. **File Operations**:
   - Upload files to the local server (stored in the `public/uploads` directory)
   - Create and manage folders
   - View file details (name, size, creation date)
   - Delete files and folders
   - Preview files directly in the browser

3. **Storage**:
   - Files are stored locally in the `public/uploads` directory
   - File metadata is stored in Firestore database
   - Each file record contains:
     - Name
     - Type (file or folder)
     - Size (for files)
     - Path and URL
     - Creator information
     - Role association
     - Creation timestamp

## API Endpoints

### `/api/files`

- **GET** - Fetch files for a user
  - Parameters: `userId`, `userRole`
  - Returns: List of files and folders accessible to the user

- **POST** - Create a new file or folder record
  - Body: `{ name, type, size, path, url, createdBy, creatorName, role }`
  - Returns: Created file/folder record

- **DELETE** - Delete a file or folder record
  - Body: `{ fileId, userId, userRole }`
  - Returns: Success message

### `/api/upload`

- **POST** - Upload a file to the server
  - Form data: `file`, `folder`
  - Returns: File URL and metadata

## Access

The file management system is accessible through the "Files" navigation item in the sidebar. All authenticated users have access to this feature.

## Implementation Details

- Files are stored in `public/uploads` directory with timestamp-prefixed filenames to prevent conflicts
- File metadata is stored in the `files` collection in Firestore
- The UI is responsive and works on both desktop and mobile devices
- Executive Directors see a special indicator showing they have access to all files