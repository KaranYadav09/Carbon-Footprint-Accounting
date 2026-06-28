# Student Management System

## Overview
This feature allows admins to create student accounts and verify student requests. It provides two main workflows:

1. **Admin Creates Student Account**: Admin directly creates a username/password for a new student
2. **Student Requests Verification**: Existing unverified students can submit their student ID for admin approval

## Features

### For Admins
- **Create Student Accounts**: Admins can create new student accounts with username, password, and profile details
- **View All Students**: See a list of all students with their verification status
- **Approve/Reject Verification Requests**: Review and approve student verification requests

### For Students
- **Request Verification**: Submit student ID and profile details for admin approval
- **View Verification Status**: See if account is verified or pending

## API Endpoints

### Admin Endpoints
- `GET /api/students` - Get all students (admin only)
- `POST /api/students` - Create a new student (admin only)
- `POST /api/students/:id/approve` - Approve student verification (admin only)
- `POST /api/students/:id/reject` - Reject student verification (admin only)

### Student Endpoints
- `GET /api/students/me` - Get current student's profile
- `POST /api/students/request-verification` - Submit verification request

## Usage

### Admin Creating Student Account
1. Go to Admin Dashboard
2. Click "Student Management" in the sidebar navigation
3. Click "Create Student" button
4. Fill in:
   - Username (required)
   - Password (required, min 8 characters)
   - Name (optional)
   - Email (optional)
   - Department (optional)
   - Student ID (optional - if provided, student is verified immediately)
   - Phone Number (optional)
5. Click "Create Student"

### Student Requesting Verification
1. Login as a student (unverified account)
2. Navigate to the verification page
3. Click "Request Verification"
4. Fill in:
   - Student ID (required)
   - Name (optional)
   - Email (optional)
   - Department (optional)
   - Phone Number (optional)
5. Click "Submit Request"
6. Wait for admin approval

### Admin Approving/Rejecting Requests
1. Go to Admin Dashboard
2. Click "Student Management" in the sidebar navigation
3. View pending students in the table
4. For unverified students:
   - Click "Approve" to verify the student
   - Click "Reject" to remove the student ID and keep account unverified

## Verification Status
- **Verified**: Student ID exists in the database
- **Pending**: No student ID associated with the account

## Notes
- Passwords must be at least 8 characters long
- Student IDs must be unique
- Students can only submit verification requests once they have a valid account
- Admins can create students with or without a student ID