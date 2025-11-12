# Attendance Tracking System

## Overview
The attendance tracking system allows staff members to clock in and out of work, track breaks, and enables system administrators to view analytics on hours worked, overtime, and attendance patterns. The system also includes timesheet functionality where Executive Directors can approve staff timesheets.

## Features

### For Staff Members
- Clock in/out functionality
- Break tracking (regular breaks and lunch breaks)
- Status indicators (working, on break, lunch break, in office, holiday)
- Program association during clock in (only shows programs assigned to the user)

### For Executive Directors
- Approve/reject staff timesheets
- View all staff attendance records
- View attendance analytics

### For Board Members
- View-only access to staff information and timesheets
- Cannot approve or reject timesheets

### For System Administrators
- Attendance analytics dashboard
- View total hours worked
- Track overtime hours
- Monitor late arrivals
- View attendance records in tabular format
- Filter by time period (today, week, month)
- Filter by specific user
- Filter by specific program
- Approve/reject timesheets

## Implementation Details

### Data Structure
Attendance records are stored in Firestore with the following structure:
- `userId`: User's Firebase UID
- `userName`: User's display name
- `userRole`: User's role
- `checkInTime`: Timestamp of clock in
- `checkOutTime`: Timestamp of clock out
- `status`: Current attendance status
- `currentStatus`: Detailed status (working, on-break, etc.)
- `breaks`: Array of break records
- `totalTime`: Total minutes worked
- `overtime`: Overtime minutes
- `createdAt`: Record creation timestamp
- `programId`: ID of the program associated with the work (optional)
- `timesheetApproved`: Boolean indicating if timesheet is approved
- `timesheetApprovedBy`: Name of user who approved the timesheet
- `timesheetApprovedAt`: Timestamp of approval

### Work Hours
- Standard work day: 8:00 AM to 4:30 PM CAT
- Overtime is calculated for any work after 4:30 PM

### Roles with Attendance Tracking
The following roles have attendance tracking available:
- Finance Lead
- Programs Lead
- Project Officer
- Office Assistant
- Admin Officer
- Community Outreach Officer
- Monitoring & Evaluation Lead

The following roles do NOT have attendance tracking:
- System Administrator
- Board Member
- Executive Director

## Program Assignment

Programs can be assigned to specific staff members through the Program Management interface:
1. Navigate to the "Program Portfolio" section
2. Create or edit a program
3. Use the "Staff" multi-select to assign users to the program
4. Save the program

When a user clocks in, they will only see programs they are assigned to, plus a "General Work" option for non-program related work.

## Timesheet Workflow

1. Staff members clock in and out using the attendance system
2. Each completed work session creates an attendance record
3. Attendance records are automatically converted to timesheet entries
4. Executive Directors can view and approve/reject pending timesheets
5. Board Members can view timesheets but cannot approve/reject them
6. All other roles can view their own timesheets

## Usage

### Clocking In
1. Staff members click the "Clock In" button in the sidebar
2. Select a program from the list of programs they are assigned to
3. Click "Start Working"

### Taking Breaks
1. While clocked in, staff can click "Break" or "Lunch" buttons
2. System tracks break start time
3. Staff click "End Break" when returning to work

### Clocking Out
1. Staff members click the "Clock Out" button
2. System calculates total time worked and overtime
3. Record is saved to Firestore
4. Timesheet entry is created automatically

### Viewing and Approving Timesheets (Executive Director Only)
1. Navigate to the Staff Management page
2. Click on the "Timesheets" tab
3. View pending timesheet requests
4. Click the checkmark to approve or X to reject
5. Approved timesheets are marked with the approver's name and timestamp

### Viewing Timesheets (All Other Roles)
1. Navigate to the Staff Management page
2. Click on the "Timesheets" tab
3. View your own timesheet history
4. See approval status of your timesheets

## Technical Implementation

### Components
- `components/role-based-layout.tsx`: Contains the clock in/out UI
- `app/system-admin/attendance-analytics.tsx`: Analytics dashboard
- `app/system-admin/page-content.tsx`: Updated to include attendance tab
- `app/staff/page.tsx`: Staff management and timesheet interface

### Firebase Collections
- `attendance`: Stores all attendance records and timesheet data
- `users`: Used to fetch user information for analytics
- `programs`: Used to fetch program information for clock in and analytics

### Dependencies
- `recharts`: For data visualization
- `date-fns`: For date manipulation