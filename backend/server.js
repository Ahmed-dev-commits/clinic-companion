/**
 * Hospital Management System - MySQL Backend Server
 * This server uses MySQL (WAMP) for reliable local data storage
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hospital_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
let pool;

// Helper function to convert MySQL TIMESTAMP to ISO format
function formatTimestamp(date) {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString();
  }
  // If it's a string, try to parse and convert
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? date : parsed.toISOString();
}

// Initialize database connection and tables
async function initializeDatabase() {
  try {
    // First, connect without database to create it if needed
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port
    });

    // Create database if it doesn't exist
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`✅ Database '${dbConfig.database}' ready`);
    await tempConnection.end();

    // Create connection pool
    pool = mysql.createPool(dbConfig);

    // Create tables
    await createTables();

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
}

async function createTables() {
  const connection = await pool.getConnection();

  try {
    // Patients table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Patients (
        ID VARCHAR(50) PRIMARY KEY,
        Name VARCHAR(255) NOT NULL,
        Age INT,
        Gender VARCHAR(20),
        Phone VARCHAR(50),
        Address TEXT,
        VisitDate VARCHAR(50),
        Symptoms TEXT,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stock table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Stock (
        ID VARCHAR(50) PRIMARY KEY,
        Name VARCHAR(255) NOT NULL,
        Category VARCHAR(100),
        Quantity INT DEFAULT 0,
        Price DECIMAL(10, 2) DEFAULT 0,
        LowStockThreshold INT DEFAULT 10,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Payments (
        ID VARCHAR(50) PRIMARY KEY,
        PatientID VARCHAR(50),
        PatientName VARCHAR(255),
        ConsultationFee DECIMAL(10, 2) DEFAULT 0,
        LabFee DECIMAL(10, 2) DEFAULT 0,
        MedicineFee DECIMAL(10, 2) DEFAULT 0,
        TotalAmount DECIMAL(10, 2) DEFAULT 0,
        PaymentMode VARCHAR(50),
        Medicines TEXT,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Prescriptions table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Prescriptions (
        ID VARCHAR(50) PRIMARY KEY,
        PatientID VARCHAR(50),
        PatientName VARCHAR(255),
        PatientAge INT,
        Diagnosis TEXT,
        Medicines TEXT,
        LabTests TEXT,
        DoctorNotes TEXT,
        Precautions TEXT,
        GeneratedText TEXT,
        FollowUpDate VARCHAR(50),
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // LabResults table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS LabResults (
        ID VARCHAR(50) PRIMARY KEY,
        PatientID VARCHAR(50),
        PatientName VARCHAR(255),
        PatientAge INT,
        TestDate VARCHAR(50),
        ReportDate VARCHAR(50),
        Tests TEXT,
        Notes TEXT,
        Technician VARCHAR(255),
        Status VARCHAR(50) DEFAULT 'Sample Collected',
        NotifiedAt VARCHAR(50),
        CollectedAt VARCHAR(50),
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // PatientServices table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS PatientServices (
        ID VARCHAR(50) PRIMARY KEY,
        PatientID VARCHAR(50) NOT NULL,
        Services TEXT,
        GrandTotal DECIMAL(10, 2) DEFAULT 0,
        Status VARCHAR(50) DEFAULT 'Draft',
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
        ID VARCHAR(50) PRIMARY KEY,
        Username VARCHAR(100) UNIQUE NOT NULL,
        Password VARCHAR(255) NOT NULL,
        Name VARCHAR(255) NOT NULL,
        Role VARCHAR(50) DEFAULT 'Receptionist',
        IsActive TINYINT(1) DEFAULT 1,
        CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default users if none exist
    const [users] = await connection.query('SELECT COUNT(*) as count FROM Users');
    if (users[0].count === 0) {
      const defaultUsers = [
        { id: 'USR-001', username: 'receptionist', password: 'reception123', name: 'Front Desk', role: 'Receptionist' },
        { id: 'USR-002', username: 'doctor', password: 'doctor123', name: 'Dr. Admin', role: 'Doctor' },
        { id: 'USR-003', username: 'labtech', password: 'lab123', name: 'Lab Technician', role: 'LabTechnician' },
      ];

      for (const user of defaultUsers) {
        await connection.query(
          'INSERT INTO Users (ID, Username, Password, Name, Role) VALUES (?, ?, ?, ?, ?)',
          [user.id, user.username, user.password, user.name, user.role]
        );
      }
      console.log('✅ Default users created');
    }
  } finally {
    connection.release();
  }
}

// ============ PATIENTS API ============

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Patients ORDER BY CreatedAt DESC');
    // Convert timestamps to ISO format
    const formatted = rows.map(row => ({
      ...row,
      CreatedAt: formatTimestamp(row.CreatedAt)
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Patients WHERE ID = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new patient
app.post('/api/patients', async (req, res) => {
  try {
    const { id, name, age, gender, phone, address, visitDate, symptoms } = req.body;

    await pool.query(
      `INSERT INTO Patients (ID, Name, Age, Gender, Phone, Address, VisitDate, Symptoms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, age, gender, phone, address, visitDate, symptoms]
    );

    res.json({ success: true, id });
  } catch (error) {
    console.error('Error adding patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update patient
app.put('/api/patients/:id', async (req, res) => {
  try {
    const { name, age, gender, phone, address, visitDate, symptoms } = req.body;

    await pool.query(
      `UPDATE Patients SET 
        Name = ?,
        Age = ?,
        Gender = ?,
        Phone = ?,
        Address = ?,
        VisitDate = ?,
        Symptoms = ?
      WHERE ID = ?`,
      [name, age, gender, phone, address, visitDate, symptoms, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Patients WHERE ID = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STOCK API ============

app.get('/api/stock', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Stock ORDER BY Name');
    // Convert timestamps to ISO format
    const formatted = rows.map(row => ({
      ...row,
      CreatedAt: formatTimestamp(row.CreatedAt)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stock', async (req, res) => {
  try {
    const { id, name, category, quantity, price, lowStockThreshold } = req.body;

    await pool.query(
      `INSERT INTO Stock (ID, Name, Category, Quantity, Price, LowStockThreshold)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, category, quantity, price, lowStockThreshold]
    );

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/stock/:id', async (req, res) => {
  try {
    const { name, category, quantity, price, lowStockThreshold } = req.body;

    await pool.query(
      `UPDATE Stock SET 
        Name = ?,
        Category = ?,
        Quantity = ?,
        Price = ?,
        LowStockThreshold = ?
      WHERE ID = ?`,
      [name, category, quantity, price, lowStockThreshold, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/stock/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Stock WHERE ID = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PAYMENTS API ============

app.get('/api/payments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Payments ORDER BY CreatedAt DESC');
    // Convert timestamps to ISO format AND numeric fields to numbers
    const formatted = rows.map(row => ({
      ...row,
      ConsultationFee: Number(row.ConsultationFee) || 0,
      LabFee: Number(row.LabFee) || 0,
      MedicineFee: Number(row.MedicineFee) || 0,
      TotalAmount: Number(row.TotalAmount) || 0,
      CreatedAt: formatTimestamp(row.CreatedAt)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { id, patientId, patientName, consultationFee, labFee, medicineFee, totalAmount, paymentMode, medicines } = req.body;

    await pool.query(
      `INSERT INTO Payments (ID, PatientID, PatientName, ConsultationFee, LabFee, MedicineFee, TotalAmount, PaymentMode, Medicines)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patientId, patientName, consultationFee, labFee, medicineFee, totalAmount, paymentMode, JSON.stringify(medicines)]
    );

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PRESCRIPTIONS API ============

app.get('/api/prescriptions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Prescriptions ORDER BY CreatedAt DESC');
    // Convert timestamps to ISO format
    const formatted = rows.map(row => ({
      ...row,
      CreatedAt: formatTimestamp(row.CreatedAt)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prescriptions', async (req, res) => {
  try {
    const { id, patientId, patientName, patientAge, diagnosis, medicines, labTests, doctorNotes, precautions, generatedText, followUpDate } = req.body;

    await pool.query(
      `INSERT INTO Prescriptions (ID, PatientID, PatientName, PatientAge, Diagnosis, Medicines, LabTests, DoctorNotes, Precautions, GeneratedText, FollowUpDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patientId, patientName, patientAge, diagnosis, JSON.stringify(medicines), JSON.stringify(labTests), doctorNotes, precautions, generatedText, followUpDate]
    );

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LAB RESULTS API ============

app.get('/api/lab-results', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM LabResults ORDER BY CreatedAt DESC');
    // Convert timestamps to ISO format
    const formatted = rows.map(row => ({
      ...row,
      CreatedAt: formatTimestamp(row.CreatedAt),
      NotifiedAt: formatTimestamp(row.NotifiedAt),
      CollectedAt: formatTimestamp(row.CollectedAt)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lab-results', async (req, res) => {
  try {
    const { id, patientId, patientName, patientAge, testDate, reportDate, tests, notes, technician, status } = req.body;

    await pool.query(
      `INSERT INTO LabResults (ID, PatientID, PatientName, PatientAge, TestDate, ReportDate, Tests, Notes, Technician, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patientId, patientName, patientAge, testDate, reportDate, JSON.stringify(tests), notes, technician, status]
    );

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lab-results/:id/status', async (req, res) => {
  try {
    const { status, notifiedAt, collectedAt } = req.body;

    let query = 'UPDATE LabResults SET Status = ?';
    const params = [status];

    if (notifiedAt) {
      query += ', NotifiedAt = ?';
      params.push(notifiedAt);
    }
    if (collectedAt) {
      query += ', CollectedAt = ?';
      params.push(collectedAt);
    }

    query += ' WHERE ID = ?';
    params.push(req.params.id);

    await pool.query(query, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PATIENT SERVICES API ============

app.get('/api/patient-services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM PatientServices ORDER BY CreatedAt DESC');
    // Convert timestamps to ISO format AND numeric fields to numbers
    const formatted = rows.map(row => ({
      ...row,
      GrandTotal: Number(row.GrandTotal) || 0,
      CreatedAt: formatTimestamp(row.CreatedAt),
      UpdatedAt: formatTimestamp(row.UpdatedAt)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patient-services/:patientId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM PatientServices WHERE PatientID = ? ORDER BY CreatedAt DESC',
      [req.params.patientId]
    );
    // Convert timestamps to ISO format AND numeric fields to numbers
    const formatted = rows.map(row => ({
      ...row,
      GrandTotal: Number(row.GrandTotal) || 0,
      CreatedAt: formatTimestamp(row.CreatedAt),
      UpdatedAt: formatTimestamp(row.UpdatedAt)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patient-services', async (req, res) => {
  try {
    const { id, patientId, services, grandTotal, status } = req.body;

    await pool.query(
      `INSERT INTO PatientServices (ID, PatientID, Services, GrandTotal, Status)
       VALUES (?, ?, ?, ?, ?)`,
      [id, patientId, JSON.stringify(services), grandTotal, status || 'Draft']
    );

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/patient-services/:id', async (req, res) => {
  try {
    const { services, grandTotal, status } = req.body;

    await pool.query(
      `UPDATE PatientServices SET Services = ?, GrandTotal = ?, Status = ? WHERE ID = ?`,
      [JSON.stringify(services), grandTotal, status, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USERS API ============

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT ID, Username, Name, Role, IsActive, CreatedAt FROM Users');
    // Convert timestamps to ISO format
    const formatted = rows.map(row => ({
      ...row,
      CreatedAt: formatTimestamp(row.CreatedAt)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query(
      'SELECT ID, Username, Name, Role FROM Users WHERE Username = ? AND Password = ? AND IsActive = 1',
      [username, password]
    );

    if (rows.length > 0) {
      res.json({ success: true, user: rows[0] });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'MySQL', timestamp: new Date().toISOString() });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🏥 Hospital Management Backend running on http://localhost:${PORT}`);
      console.log(`� Database: MySQL (${dbConfig.host}:${dbConfig.port}/${dbConfig.database})`);
      console.log(`✅ Connected to WAMP MySQL database`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
