# Angaza Foundation Role Structure

This document outlines the role structure for the Angaza Foundation dashboard system.

## Senior Management

### 1. Executive Director
- **Name:** Godfrey Kambewa
- **Role:** Overall Leadership & Strategic Direction
- **Dashboard:** `/executive-director`
- **Access:** Full system access except administrative functions

### 2. Finance Lead
- **Name:** James Mathews Banda
- **Role:** Financial Management & Accountability
- **Dashboard:** `/finance-lead`
- **Access:** Full system access except administrative functions

### 3. Programs Lead
- **Name:** Doreen Mwenelupembe
- **Role:** Programs Oversight & Implementation Supervision
- **Dashboard:** `/programs-lead`
- **Access:** Full system access except administrative functions

## Project Officers (Programs Department)

### 1. Project Officer
- **Name:** Stephani Mdala
- **Role:** Project Execution
- **Dashboard:** `/project-officer`
- **Access:** Full system access except administrative functions

### 2. Support
- **Name:** Benard Distoni
- **Role:** Project Support
- **Dashboard:** `/project-officer` (same as Project Officer)
- **Access:** Full system access except administrative functions

## Administration Department

### 1. Office Assistant
- **Name:** Austin Major
- **Role:** Administrative Support
- **Dashboard:** `/office-assistant`
- **Access:** Full system access except administrative functions

## Other Roles

### System Administrator
- **Role:** System Management
- **Dashboard:** `/system-admin`
- **Access:** Full system access including user management

### Board Member
- **Role:** Governance Oversight
- **Dashboard:** `/board`
- **Access:** Read-only access to most features

### Admin Officer
- **Role:** Administrative Functions
- **Dashboard:** `/admin-officer`
- **Access:** Administrative features access

### Community Outreach Officer
- **Role:** Community Engagement
- **Dashboard:** `/community-outreach-officer`
- **Access:** Community-related features

### Monitoring & Evaluation Lead
- **Role:** Performance Tracking
- **Dashboard:** `/monitoring-evaluation-lead`
- **Access:** Monitoring and reporting features

## Role-Based Access Control

Each role has a dedicated dashboard page with role-specific content and navigation. The system automatically routes users to their appropriate dashboard based on their assigned role in the Firebase user document.

## Creating New Users

System administrators can create new users through the User Management section in the System Admin dashboard. When creating a user, the administrator must assign one of the predefined roles to the user.

## Attendance Tracking and Timesheet Management

Staff members (Finance Lead, Programs Lead, Project Officer, Office Assistant, Admin Officer, Community Outreach Officer, Monitoring & Evaluation Lead) can track their work hours using the attendance system:

- Clock in/out functionality with project association
- Break tracking (regular breaks and lunch breaks)
- Status indicators (working, on break, lunch break, in office, holiday)
- Work hours: 8:00 AM to 4:30 PM CAT
- Overtime calculation for work after 4:30 PM

Executive Directors can approve staff timesheets:
- View all staff attendance records
- Approve/reject timesheet entries
- Track staff work hours and productivity

Board Members have view-only access:
- View staff information and timesheets
- Cannot approve or reject timesheets

System Administrators can view attendance analytics:
- Total hours worked
- Overtime hours
- Late arrivals
- Attendance records
- Data visualization charts
- Approve/reject timesheets

The following roles do NOT have attendance tracking:
- System Administrator
- Board Member
- Executive Director

## Role Permissions

All roles except System Administrator have the same level of access to system features. The System Administrator has additional privileges for user management and system configuration.