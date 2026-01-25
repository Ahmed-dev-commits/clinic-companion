/**
 * Hospital Management System - SQLite Backend Server
 * This server uses SQLite for reliable local data storage
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database path
const DB_PATH = path.join(__dirname, 'database', 'HospitalDB.sqlite');

// Create/open SQLite database
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize database tables
function initializeDatabase() {
  // Patients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Patients (
      ID TEXT PRIMARY KEY,
      Name TEXT NOT NULL,
      Age INTEGER,
      Gender TEXT,
      Phone TEXT,
      Address TEXT,
      VisitDate TEXT,
      Symptoms TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Stock table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Stock (
      ID TEXT PRIMARY KEY,
      Name TEXT NOT NULL,
      Category TEXT,
      Quantity INTEGER DEFAULT 0,
      Price REAL DEFAULT 0,
      LowStockThreshold INTEGER DEFAULT 10,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Payments (
      ID TEXT PRIMARY KEY,
      PatientID TEXT,
      PatientName TEXT,
      ConsultationFee REAL DEFAULT 0,
      LabFee REAL DEFAULT 0,
      MedicineFee REAL DEFAULT 0,
      TotalAmount REAL DEFAULT 0,
      PaymentMode TEXT,
      Medicines TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Prescriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Prescriptions (
      ID TEXT PRIMARY KEY,
      PatientID TEXT,
      PatientName TEXT,
      PatientAge INTEGER,
      Diagnosis TEXT,
      Medicines TEXT,
      LabTests TEXT,
      DoctorNotes TEXT,
      Precautions TEXT,
      GeneratedText TEXT,
      FollowUpDate TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // LabResults table
  db.exec(`
    CREATE TABLE IF NOT EXISTS LabResults (
      ID TEXT PRIMARY KEY,
      PatientID TEXT,
      PatientName TEXT,
      PatientAge INTEGER,
      TestDate TEXT,
      ReportDate TEXT,
      Tests TEXT,
      Notes TEXT,
      Technician TEXT,
      Status TEXT DEFAULT 'Sample Collected',
      NotifiedAt TEXT,
      CollectedAt TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PatientServices table for additional services
  db.exec(`
    CREATE TABLE IF NOT EXISTS PatientServices (
      ID TEXT PRIMARY KEY,
      PatientID TEXT NOT NULL,
      Services TEXT,
      GrandTotal REAL DEFAULT 0,
      Status TEXT DEFAULT 'Draft',
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Users table for role management
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      ID TEXT PRIMARY KEY,
      Username TEXT UNIQUE NOT NULL,
      Password TEXT NOT NULL,
      Name TEXT NOT NULL,
      Role TEXT DEFAULT 'Receptionist',
      IsActive INTEGER DEFAULT 1,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default users if none exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM Users').get();
  if (userCount.count === 0) {
    const defaultUsers = [
      { id: 'USR-001', username: 'receptionist', password: 'reception123', name: 'Front Desk', role: 'Receptionist' },
      { id: 'USR-002', username: 'doctor', password: 'doctor123', name: 'Dr. Admin', role: 'Doctor' },
      { id: 'USR-003', username: 'labtech', password: 'lab123', name: 'Lab Technician', role: 'LabTechnician' },
    ];
    const insertUser = db.prepare('INSERT INTO Users (ID, Username, Password, Name, Role) VALUES (?, ?, ?, ?, ?)');
    defaultUsers.forEach(u => insertUser.run(u.id, u.username, u.password, u.name, u.role));
  }

  console.log('✅ Database tables initialized');
}

// Initialize database on startup
initializeDatabase();

// ============ PATIENTS API ============

// Get all patients
app.get('/api/patients', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM Patients ORDER BY CreatedAt DESC');
    const data = stmt.all();
    res.json(data);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get patient by ID
app.get('/api/patients/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM Patients WHERE ID = ?');
    const data = stmt.get(req.params.id);
    res.json(data || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new patient
app.post('/api/patients', (req, res) => {
  try {
    const { id, name, age, gender, phone, address, visitDate, symptoms } = req.body;
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO Patients (ID, Name, Age, Gender, Phone, Address, VisitDate, Symptoms, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, age, gender, phone, address, visitDate, symptoms, createdAt);
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error adding patient:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update patient
app.put('/api/patients/:id', (req, res) => {
  try {
    const { name, age, gender, phone, address, visitDate, symptoms } = req.body;
    
    const stmt = db.prepare(`
      UPDATE Patients SET 
        Name = ?,
        Age = ?,
        Gender = ?,
        Phone = ?,
        Address = ?,
        VisitDate = ?,
        Symptoms = ?
      WHERE ID = ?
    `);
    
    stmt.run(name, age, gender, phone, address, visitDate, symptoms, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete patient
app.delete('/api/patients/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM Patients WHERE ID = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STOCK API ============

app.get('/api/stock', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM Stock ORDER BY Name');
    const data = stmt.all();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stock', (req, res) => {
  try {
    const { id, name, category, quantity, price, lowStockThreshold } = req.body;
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO Stock (ID, Name, Category, Quantity, Price, LowStockThreshold, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, category, quantity, price, lowStockThreshold, createdAt);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/stock/:id', (req, res) => {
  try {
    const { name, category, quantity, price, lowStockThreshold } = req.body;
    
    const stmt = db.prepare(`
      UPDATE Stock SET 
        Name = ?,
        Category = ?,
        Quantity = ?,
        Price = ?,
        LowStockThreshold = ?
      WHERE ID = ?
    `);
    
    stmt.run(name, category, quantity, price, lowStockThreshold, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/stock/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM Stock WHERE ID = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PAYMENTS API ============

app.get('/api/payments', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM Payments ORDER BY CreatedAt DESC');
    const data = stmt.all();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', (req, res) => {
  try {
    const { id, patientId, patientName, consultationFee, labFee, medicineFee, totalAmount, paymentMode, medicines } = req.body;
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO Payments (ID, PatientID, PatientName, ConsultationFee, LabFee, MedicineFee, TotalAmount, PaymentMode, Medicines, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, patientId, patientName, consultationFee, labFee, medicineFee, totalAmount, paymentMode, JSON.stringify(medicines), createdAt);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PRESCRIPTIONS API ============

app.get('/api/prescriptions', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM Prescriptions ORDER BY CreatedAt DESC');
    const data = stmt.all();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prescriptions', (req, res) => {
  try {
    const { id, patientId, patientName, patientAge, diagnosis, medicines, labTests, doctorNotes, precautions, generatedText, followUpDate } = req.body;
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO Prescriptions (ID, PatientID, PatientName, PatientAge, Diagnosis, Medicines, LabTests, DoctorNotes, Precautions, GeneratedText, FollowUpDate, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, patientId, patientName, patientAge, diagnosis, JSON.stringify(medicines), JSON.stringify(labTests), doctorNotes, precautions, generatedText, followUpDate, createdAt);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LAB RESULTS API ============

app.get('/api/lab-results', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM LabResults ORDER BY CreatedAt DESC');
    const data = stmt.all();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lab-results', (req, res) => {
  try {
    const { id, patientId, patientName, patientAge, testDate, reportDate, tests, notes, technician, status } = req.body;
    const createdAt = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO LabResults (ID, PatientID, PatientName, PatientAge, TestDate, ReportDate, Tests, Notes, Technician, Status, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, patientId, patientName, patientAge, testDate, reportDate, JSON.stringify(tests), notes, technician, status, createdAt);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lab-results/:id/status', (req, res) => {
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
    
    const stmt = db.prepare(query);
    stmt.run(...params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PATIENT SERVICES API ============

app.get('/api/patient-services', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM PatientServices ORDER BY CreatedAt DESC');
    res.json(stmt.all());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patient-services/:patientId', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM PatientServices WHERE PatientID = ? ORDER BY CreatedAt DESC');
    res.json(stmt.all(req.params.patientId));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patient-services', (req, res) => {
  try {
    const { id, patientId, services, grandTotal, status } = req.body;
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO PatientServices (ID, PatientID, Services, GrandTotal, Status, CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, patientId, JSON.stringify(services), grandTotal, status || 'Draft', now, now);
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/patient-services/:id', (req, res) => {
  try {
    const { services, grandTotal, status } = req.body;
    const stmt = db.prepare(`
      UPDATE PatientServices SET Services = ?, GrandTotal = ?, Status = ?, UpdatedAt = ? WHERE ID = ?
    `);
    stmt.run(JSON.stringify(services), grandTotal, status, new Date().toISOString(), req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ USERS API ============

app.get('/api/users', (req, res) => {
  try {
    const stmt = db.prepare('SELECT ID, Username, Name, Role, IsActive, CreatedAt FROM Users');
    res.json(stmt.all());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const stmt = db.prepare('SELECT ID, Username, Name, Role FROM Users WHERE Username = ? AND Password = ? AND IsActive = 1');
    const user = stmt.get(username, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'SQLite', timestamp: new Date().toISOString() });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  db.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🏥 Hospital Management Backend running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${DB_PATH}`);
  console.log(`💡 SQLite database will be created automatically if it doesn't exist`);
});
