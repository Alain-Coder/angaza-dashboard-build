# File Management System

## Overview

The File Management System allows users to upload, organize, and manage files within the Angaza Foundation Dashboard. Each role has access to their own files, with Executive Directors having special access to view all files across the organization.

## Features

### For All Users:
- Upload files to the system
- Create and manage folders and subfolders
- View and download their own files
- Delete their own files
- Rename files and folders
- Switch between grid and list views
- Navigate through folder hierarchy with breadcrumbs

### For Executive Directors:
- View all files uploaded by any user
- Delete any file in the system
- See role information for each file

## How to Use

### Accessing the File Management System
1. Log in to the dashboard
2. Click on "Files" in the left sidebar navigation
3. The file management interface will load

### Uploading Files
1. Click the "Upload File" button
2. Select a file from your device
3. The file will be uploaded to the current folder and appear in your file list

### Creating Folders
1. Click the "New Folder" button
2. Enter a name for your folder
3. Click "Create"
4. The folder will appear in your file list

### Navigating Folders
1. Use the breadcrumb navigation at the top to see your current location
2. Click on folder names in the breadcrumb to navigate up the hierarchy
3. Click on folder icons in the grid/list view to navigate into folders
4. Click "Root" in the breadcrumb to return to the main directory

### Viewing Files
- Switch between grid and list views using the view toggle buttons
- In grid view, file names are truncated to fit in smaller cards
- In list view, more detailed information is displayed in a table format
- Click the eye icon to preview a file
- Click the download icon to download a file

### Managing Files and Folders
1. Click the three dots menu next to any file or folder
2. Choose from the available actions:
   - Preview (files only)
   - Download (files only)
   - Rename
   - Delete

### Renaming Files and Folders
1. Click the three dots menu next to the item you want to rename
2. Select "Rename"
3. Enter the new name
4. Click "Rename" to confirm or "Cancel" to abort

## Technical Implementation

### File Storage
- Files are stored locally in the `public/uploads` directory
- Each file is given a unique timestamp-prefixed name to prevent conflicts
- Files and folders are stored in separate Firestore collections:
  - `files` collection for file records
  - `folders` collection for folder records
- Folder hierarchy is maintained through ID references

### API Endpoints
- `GET /api/files` - Fetch files and folders for a user (supports folder navigation)
- `POST /api/files` - Create a new file or folder record
- `PUT /api/files` - Rename a file or folder
- `DELETE /api/files` - Delete a file or folder record
- `POST /api/upload` - Upload a file to the server

### Folder Structure
- Folders are stored with unique IDs in the `folders` collection
- Files reference their parent folder by `folderId`
- Root-level items have `folderId: null`
- Folder navigation uses folder IDs for security and consistency

### Security
- Users can only see their own files (except Executive Directors)
- Users can only delete/rename their own files (except Executive Directors)
- File access is controlled through role-based permissions
- Folder navigation is restricted to authorized paths

## Troubleshooting

### Upload Issues
- Ensure the file size is less than 5MB
- Check that the file type is supported (images, PDFs)
- Verify you have a stable internet connection

### File Not Appearing
- Refresh the page to reload the file list
- Check that you're viewing the correct folder
- Contact system administrator if the issue persists

### Navigation Issues
- Use the breadcrumb trail to ensure you're in the correct location
- If folder navigation isn't working, try refreshing the page

## Support
For issues with the file management system, contact the IT support team at tech@angazafoundation.org.