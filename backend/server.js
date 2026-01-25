/**
 * Hospital Management System - MS Access Backend Server
 * This server connects to Microsoft Access database via ADODB
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const ADODB = require('node-adodb');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database path - adjust this to your Access database location
const DB_PATH = path.join(__dirname, 'database', 'HospitalDB.accdb');

// Create connection to Access database
const connection = ADODB.open(
  `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${DB_PATH};Persist Security Info=False;`
);

// ============ PATIENTS API ============

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const data = await connection.query('SELECT * FROM Patients ORDER BY CreatedAt DESC');
    res.json(data);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get patient by ID
app.get('/api/patients/:id', async (req, res) => {
  try {
    const data = await connection.query(`SELECT * FROM Patients WHERE ID = '${req.params.id}'`);
    res.json(data[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new patient
app.post('/api/patients', async (req, res) => {
  try {
    const { id, name, age, gender, phone, address, visitDate, symptoms } = req.body;
    const createdAt = new Date().toISOString();
    
    await connection.execute(`
      INSERT INTO Patients (ID, Name, Age, Gender, Phone, Address, VisitDate, Symptoms, CreatedAt)
      VALUES ('${id}', '${name}', ${age}, '${gender}', '${phone}', '${address}', '${visitDate}', '${symptoms}', '${createdAt}')
    `);
    
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
    
    await connection.execute(`
      UPDATE Patients SET 
        Name = '${name}',
        Age = ${age},
        Gender = '${gender}',
        Phone = '${phone}',
        Address = '${address}',
        VisitDate = '${visitDate}',
        Symptoms = '${symptoms}'
      WHERE ID = '${req.params.id}'
    `);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete patient
app.delete('/api/patients/:id', async (req, res) => {
  try {
    await connection.execute(`DELETE FROM Patients WHERE ID = '${req.params.id}'`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STOCK API ============

app.get('/api/stock', async (req, res) => {
  try {
    const data = await connection.query('SELECT * FROM Stock ORDER BY Name');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stock', async (req, res) => {
  try {
    const { id, name, category, quantity, price, lowStockThreshold } = req.body;
    const createdAt = new Date().toISOString();
    
    await connection.execute(`
      INSERT INTO Stock (ID, Name, Category, Quantity, Price, LowStockThreshold, CreatedAt)
      VALUES ('${id}', '${name}', '${category}', ${quantity}, ${price}, ${lowStockThreshold}, '${createdAt}')
    `);
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/stock/:id', async (req, res) => {
  try {
    const { name, category, quantity, price, lowStockThreshold } = req.body;
    
    await connection.execute(`
      UPDATE Stock SET 
        Name = '${name}',
        Category = '${category}',
        Quantity = ${quantity},
        Price = ${price},
        LowStockThreshold = ${lowStockThreshold}
      WHERE ID = '${req.params.id}'
    `);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/stock/:id', async (req, res) => {
  try {
    await connection.execute(`DELETE FROM Stock WHERE ID = '${req.params.id}'`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PAYMENTS API ============

app.get('/api/payments', async (req, res) => {
  try {
    const data = await connection.query('SELECT * FROM Payments ORDER BY CreatedAt DESC');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const { id, patientId, patientName, consultationFee, labFee, medicineFee, totalAmount, paymentMode, medicines } = req.body;
    const createdAt = new Date().toISOString();
    
    await connection.execute(`
      INSERT INTO Payments (ID, PatientID, PatientName, ConsultationFee, LabFee, MedicineFee, TotalAmount, PaymentMode, Medicines, CreatedAt)
      VALUES ('${id}', '${patientId}', '${patientName}', ${consultationFee}, ${labFee}, ${medicineFee}, ${totalAmount}, '${paymentMode}', '${JSON.stringify(medicines)}', '${createdAt}')
    `);
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PRESCRIPTIONS API ============

app.get('/api/prescriptions', async (req, res) => {
  try {
    const data = await connection.query('SELECT * FROM Prescriptions ORDER BY CreatedAt DESC');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prescriptions', async (req, res) => {
  try {
    const { id, patientId, patientName, patientAge, diagnosis, medicines, labTests, doctorNotes, precautions, generatedText, followUpDate } = req.body;
    const createdAt = new Date().toISOString();
    
    await connection.execute(`
      INSERT INTO Prescriptions (ID, PatientID, PatientName, PatientAge, Diagnosis, Medicines, LabTests, DoctorNotes, Precautions, GeneratedText, FollowUpDate, CreatedAt)
      VALUES ('${id}', '${patientId}', '${patientName}', ${patientAge}, '${diagnosis}', '${JSON.stringify(medicines)}', '${JSON.stringify(labTests)}', '${doctorNotes}', '${precautions}', '${generatedText}', '${followUpDate}', '${createdAt}')
    `);
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LAB RESULTS API ============

app.get('/api/lab-results', async (req, res) => {
  try {
    const data = await connection.query('SELECT * FROM LabResults ORDER BY CreatedAt DESC');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lab-results', async (req, res) => {
  try {
    const { id, patientId, patientName, patientAge, testDate, reportDate, tests, notes, technician, status } = req.body;
    const createdAt = new Date().toISOString();
    
    await connection.execute(`
      INSERT INTO LabResults (ID, PatientID, PatientName, PatientAge, TestDate, ReportDate, Tests, Notes, Technician, Status, CreatedAt)
      VALUES ('${id}', '${patientId}', '${patientName}', ${patientAge}, '${testDate}', '${reportDate}', '${JSON.stringify(tests)}', '${notes}', '${technician}', '${status}', '${createdAt}')
    `);
    
    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/lab-results/:id/status', async (req, res) => {
  try {
    const { status, notifiedAt, collectedAt } = req.body;
    let updateQuery = `UPDATE LabResults SET Status = '${status}'`;
    
    if (notifiedAt) updateQuery += `, NotifiedAt = '${notifiedAt}'`;
    if (collectedAt) updateQuery += `, CollectedAt = '${collectedAt}'`;
    
    updateQuery += ` WHERE ID = '${req.params.id}'`;
    
    await connection.execute(updateQuery);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'MS Access', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏥 Hospital Management Backend running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${DB_PATH}`);
});
