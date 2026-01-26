# MySQL Database Setup for Clinic Companion

## Overview
This project now uses MySQL (WAMP) for local database storage instead of SQLite.

## Database Configuration

The database connection is configured via environment variables in the `.env` file:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=hospital_db
DB_PORT=3306
```

### Default Configuration
- **Host**: localhost
- **User**: root
- **Password**: (empty by default for WAMP)
- **Database**: hospital_db
- **Port**: 3306

## Setup Instructions

### 1. Start WAMP Server
Make sure your WAMP server is running before starting the backend.

### 2. Configure Database Credentials
Edit the `.env` file in the project root and update these values if needed:

```env
DB_HOST=localhost          # Your MySQL host
DB_USER=root               # Your MySQL username
DB_PASSWORD=               # Your MySQL password (leave empty if no password)
DB_NAME=hospital_db        # Database name (will be created automatically)
DB_PORT=3306              # MySQL port (default is 3306)
```

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Start the Server
```bash
npm start
# or for development with auto-reload
npm run dev
```

The server will:
1. Automatically create the database if it doesn't exist
2. Create all necessary tables
3. Insert default users if the Users table is empty

## What Changed?

### Removed
- `better-sqlite3` package
- SQLite database file (`HospitalDB.sqlite`)

### Added
- `mysql2` package - MySQL client for Node.js
- `dotenv` package - Environment variable management
- Connection pooling for better performance
- Automatic database creation

## Tables Created

The server automatically creates these tables:
- **Patients** - Patient information
- **Stock** - Inventory management
- **Payments** - Payment records
- **Prescriptions** - Medical prescriptions
- **LabResults** - Laboratory test results
- **PatientServices** - Additional patient services
- **Users** - User authentication and roles

## Default Users

Three default users are created automatically:
1. **Receptionist**
   - Username: `receptionist`
   - Password: `reception123`
   
2. **Doctor**
   - Username: `doctor`
   - Password: `doctor123`
   
3. **Lab Technician**
   - Username: `labtech`
   - Password: `lab123`

## Troubleshooting

### Connection Issues
If you get connection errors:
1. Verify WAMP is running (check the system tray icon is green)
2. Check MySQL service is started in WAMP
3. Verify your credentials in `.env` file
4. Ensure the port 3306 is not blocked by firewall

### Database Not Created
If the database isn't created automatically:
1. Check MySQL user has CREATE DATABASE privileges
2. Manually create the database in phpMyAdmin:
   ```sql
   CREATE DATABASE hospital_db;
   ```

### Port Conflicts
If port 3306 is already in use:
1. Change the `DB_PORT` in `.env` to an available port
2. Update WAMP MySQL configuration to use the same port

## API Endpoints

The server provides these API endpoints:

- **Patients**: `/api/patients`
- **Stock**: `/api/stock`
- **Payments**: `/api/payments`
- **Prescriptions**: `/api/prescriptions`
- **Lab Results**: `/api/lab-results`
- **Patient Services**: `/api/patient-services`
- **Users**: `/api/users`
- **Health Check**: `/api/health`

Server runs on: `http://localhost:3001`
