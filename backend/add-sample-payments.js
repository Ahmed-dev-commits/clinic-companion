/**
 * Add Sample Payment Data to MySQL
 * Creates sample payments for testing the Fees page
 */

require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hospital_db',
    port: process.env.DB_PORT || 3306,
};

async function addSamplePayments() {
    let connection;

    try {
        console.log('💰 Adding sample payment data to MySQL...\n');

        connection = await mysql.createConnection(mysqlConfig);
        console.log('✅ Connected to MySQL database\n');

        // Get existing patients
        const [patients] = await connection.query('SELECT ID, Name FROM Patients LIMIT 5');

        if (patients.length === 0) {
            console.log('❌ No patients found in database. Please add patients first.');
            return;
        }

        console.log(`Found ${patients.length} patients to create payments for\n`);

        // Sample payment data
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        const samplePayments = [
            {
                id: 'PAY-001',
                patientId: patients[0].ID,
                patientName: patients[0].Name,
                consultationFee: 500,
                labFee: 200,
                medicineFee: 150,
                totalAmount: 850,
                paymentMode: 'Cash',
                medicines: JSON.stringify([
                    { stockId: 'MED-001', name: 'Paracetamol', quantity: 2, price: 50 },
                    { stockId: 'MED-002', name: 'Cough Syrup', quantity: 1, price: 100 }
                ]),
                createdAt: today.toISOString()
            },
            {
                id: 'PAY-002',
                patientId: patients[1]?.ID || patients[0].ID,
                patientName: patients[1]?.Name || patients[0].Name,
                consultationFee: 500,
                labFee: 0,
                medicineFee: 200,
                totalAmount: 700,
                paymentMode: 'Card',
                medicines: JSON.stringify([
                    { stockId: 'MED-003', name: 'Antibiotic', quantity: 1, price: 200 }
                ]),
                createdAt: today.toISOString()
            },
            {
                id: 'PAY-003',
                patientId: patients[2]?.ID || patients[0].ID,
                patientName: patients[2]?.Name || patients[0].Name,
                consultationFee: 500,
                labFee: 400,
                medicineFee: 0,
                totalAmount: 900,
                paymentMode: 'Cash',
                medicines: JSON.stringify([]),
                createdAt: yesterday.toISOString()
            },
            {
                id: 'PAY-004',
                patientId: patients[3]?.ID || patients[0].ID,
                patientName: patients[3]?.Name || patients[0].Name,
                consultationFee: 500,
                labFee: 300,
                medicineFee: 350,
                totalAmount: 1150,
                paymentMode: 'Card',
                medicines: JSON.stringify([
                    { stockId: 'MED-004', name: 'Vitamin C', quantity: 3, price: 100 },
                    { stockId: 'MED-005', name: 'Pain Relief', quantity: 1, price: 150 }
                ]),
                createdAt: lastWeek.toISOString()
            },
            {
                id: 'PAY-005',
                patientId: patients[4]?.ID || patients[0].ID,
                patientName: patients[4]?.Name || patients[0].Name,
                consultationFee: 500,
                labFee: 0,
                medicineFee: 300,
                totalAmount: 800,
                paymentMode: 'Cash',
                medicines: JSON.stringify([
                    { stockId: 'MED-006', name: 'Antacid', quantity: 2, price: 150 }
                ]),
                createdAt: lastWeek.toISOString()
            }
        ];

        let added = 0;
        for (const payment of samplePayments) {
            try {
                await connection.query(
                    `INSERT INTO Payments (ID, PatientID, PatientName, ConsultationFee, LabFee, MedicineFee, TotalAmount, PaymentMode, Medicines, CreatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           PatientName = VALUES(PatientName), ConsultationFee = VALUES(ConsultationFee),
           LabFee = VALUES(LabFee), MedicineFee = VALUES(MedicineFee),
           TotalAmount = VALUES(TotalAmount), PaymentMode = VALUES(PaymentMode),
           Medicines = VALUES(Medicines)`,
                    [payment.id, payment.patientId, payment.patientName, payment.consultationFee,
                    payment.labFee, payment.medicineFee, payment.totalAmount, payment.paymentMode,
                    payment.medicines, payment.createdAt]
                );
                added++;
                console.log(`✓ Added payment ${payment.id} for ${payment.patientName} - Rs. ${payment.totalAmount}`);
            } catch (err) {
                console.log(`✗ Failed to add ${payment.id}:`, err.message);
            }
        }

        console.log(`\n✅ Successfully added ${added} sample payments!`);
        console.log('\n📊 Summary:');
        console.log(`   - Today's payments: 2`);
        console.log(`   - Total amount: Rs. ${samplePayments.slice(0, 2).reduce((sum, p) => sum + p.totalAmount, 0)}`);

    } catch (error) {
        console.error('❌ Failed to add sample payments:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

addSamplePayments();
