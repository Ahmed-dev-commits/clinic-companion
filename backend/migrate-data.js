/**
 * SQLite to MySQL Data Migration Script
 * Migrates all data from HospitalDB.sqlite to MySQL hospital_db
 */

require('dotenv').config({ path: '../.env' });
const sqlite3 = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');

// Database configurations
const sqliteDb = new sqlite3(path.join(__dirname, 'database', 'HospitalDB.sqlite'), { readonly: true });

const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hospital_db',
    port: process.env.DB_PORT || 3306,
};

async function migrate() {
    let connection;

    try {
        console.log('🔄 Starting data migration from SQLite to MySQL...\n');

        // Connect to MySQL
        connection = await mysql.createConnection(mysqlConfig);
        console.log('✅ Connected to MySQL database\n');

        // Migrate Patients
        console.log('📋 Migrating Patients...');
        const patients = sqliteDb.prepare('SELECT * FROM Patients').all();
        for (const patient of patients) {
            await connection.query(
                `INSERT INTO Patients (ID, Name, Age, Gender, Phone, Address, VisitDate, Symptoms, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         Name = VALUES(Name), Age = VALUES(Age), Gender = VALUES(Gender),
         Phone = VALUES(Phone), Address = VALUES(Address), VisitDate = VALUES(VisitDate),
         Symptoms = VALUES(Symptoms)`,
                [patient.ID, patient.Name, patient.Age, patient.Gender, patient.Phone,
                patient.Address, patient.VisitDate, patient.Symptoms, patient.CreatedAt]
            );
        }
        console.log(`✅ Migrated ${patients.length} patients\n`);

        // Migrate Stock
        console.log('📦 Migrating Stock...');
        const stock = sqliteDb.prepare('SELECT * FROM Stock').all();
        for (const item of stock) {
            await connection.query(
                `INSERT INTO Stock (ID, Name, Category, Quantity, Price, LowStockThreshold, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         Name = VALUES(Name), Category = VALUES(Category), Quantity = VALUES(Quantity),
         Price = VALUES(Price), LowStockThreshold = VALUES(LowStockThreshold)`,
                [item.ID, item.Name, item.Category, item.Quantity, item.Price,
                item.LowStockThreshold, item.CreatedAt]
            );
        }
        console.log(`✅ Migrated ${stock.length} stock items\n`);

        // Migrate Payments
        console.log('💰 Migrating Payments...');
        const payments = sqliteDb.prepare('SELECT * FROM Payments').all();
        for (const payment of payments) {
            await connection.query(
                `INSERT INTO Payments (ID, PatientID, PatientName, ConsultationFee, LabFee, MedicineFee, TotalAmount, PaymentMode, Medicines, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         PatientName = VALUES(PatientName), ConsultationFee = VALUES(ConsultationFee),
         LabFee = VALUES(LabFee), MedicineFee = VALUES(MedicineFee),
         TotalAmount = VALUES(TotalAmount), PaymentMode = VALUES(PaymentMode),
         Medicines = VALUES(Medicines)`,
                [payment.ID, payment.PatientID, payment.PatientName, payment.ConsultationFee,
                payment.LabFee, payment.MedicineFee, payment.TotalAmount, payment.PaymentMode,
                payment.Medicines, payment.CreatedAt]
            );
        }
        console.log(`✅ Migrated ${payments.length} payments\n`);

        // Migrate Prescriptions
        console.log('📝 Migrating Prescriptions...');
        const prescriptions = sqliteDb.prepare('SELECT * FROM Prescriptions').all();
        for (const rx of prescriptions) {
            await connection.query(
                `INSERT INTO Prescriptions (ID, PatientID, PatientName, PatientAge, Diagnosis, Medicines, LabTests, DoctorNotes, Precautions, GeneratedText, FollowUpDate, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         PatientName = VALUES(PatientName), PatientAge = VALUES(PatientAge),
         Diagnosis = VALUES(Diagnosis), Medicines = VALUES(Medicines),
         LabTests = VALUES(LabTests), DoctorNotes = VALUES(DoctorNotes),
         Precautions = VALUES(Precautions), GeneratedText = VALUES(GeneratedText),
         FollowUpDate = VALUES(FollowUpDate)`,
                [rx.ID, rx.PatientID, rx.PatientName, rx.PatientAge, rx.Diagnosis,
                rx.Medicines, rx.LabTests, rx.DoctorNotes, rx.Precautions,
                rx.GeneratedText, rx.FollowUpDate, rx.CreatedAt]
            );
        }
        console.log(`✅ Migrated ${prescriptions.length} prescriptions\n`);

        // Migrate Lab Results
        console.log('🔬 Migrating Lab Results...');
        const labResults = sqliteDb.prepare('SELECT * FROM LabResults').all();
        for (const lab of labResults) {
            await connection.query(
                `INSERT INTO LabResults (ID, PatientID, PatientName, PatientAge, TestDate, ReportDate, Tests, Notes, Technician, Status, NotifiedAt, CollectedAt, CreatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         PatientName = VALUES(PatientName), PatientAge = VALUES(PatientAge),
         TestDate = VALUES(TestDate), ReportDate = VALUES(ReportDate),
         Tests = VALUES(Tests), Notes = VALUES(Notes), Technician = VALUES(Technician),
         Status = VALUES(Status), NotifiedAt = VALUES(NotifiedAt), CollectedAt = VALUES(CollectedAt)`,
                [lab.ID, lab.PatientID, lab.PatientName, lab.PatientAge, lab.TestDate,
                lab.ReportDate, lab.Tests, lab.Notes, lab.Technician, lab.Status,
                lab.NotifiedAt, lab.CollectedAt, lab.CreatedAt]
            );
        }
        console.log(`✅ Migrated ${labResults.length} lab results\n`);

        // Migrate Patient Services (if table exists)
        try {
            console.log('🏥 Migrating Patient Services...');
            const services = sqliteDb.prepare('SELECT * FROM PatientServices').all();
            for (const service of services) {
                await connection.query(
                    `INSERT INTO PatientServices (ID, PatientID, Services, GrandTotal, Status, CreatedAt, UpdatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           Services = VALUES(Services), GrandTotal = VALUES(GrandTotal),
           Status = VALUES(Status), UpdatedAt = VALUES(UpdatedAt)`,
                    [service.ID, service.PatientID, service.Services, service.GrandTotal,
                    service.Status, service.CreatedAt, service.UpdatedAt]
                );
            }
            console.log(`✅ Migrated ${services.length} patient services\n`);
        } catch (err) {
            console.log('⚠️  PatientServices table not found in SQLite, skipping...\n');
        }

        console.log('✅ Migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Patients: ${patients.length}`);
        console.log(`   - Stock: ${stock.length}`);
        console.log(`   - Payments: ${payments.length}`);
        console.log(`   - Prescriptions: ${prescriptions.length}`);
        console.log(`   - Lab Results: ${labResults.length}`);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
        sqliteDb.close();
    }
}

// Run migration
migrate();
