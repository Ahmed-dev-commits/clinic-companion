/**
 * Debug MySQL Data Types
 * Check what MySQL is actually returning
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

async function debugData() {
    let connection;

    try {
        connection = await mysql.createConnection(mysqlConfig);

        console.log('🔍 Checking MySQL Data Types...\n');

        // Get payment data
        const [payments] = await connection.query('SELECT * FROM Payments LIMIT 2');

        console.log('Raw payments from MySQL:');
        payments.forEach((p, i) => {
            console.log(`\nPayment ${i + 1}:`);
            console.log(`  ID: ${p.ID} (${typeof p.ID})`);
            console.log(`  TotalAmount: ${p.TotalAmount} (${typeof p.TotalAmount})`);
            console.log(`  ConsultationFee: ${p.ConsultationFee} (${typeof p.ConsultationFee})`);
            console.log(`  CreatedAt: ${p.CreatedAt} (${typeof p.CreatedAt})`);
            console.log(`  CreatedAt instanceof Date: ${p.CreatedAt instanceof Date}`);
        });

        // Get services
        const [services] = await connection.query('SELECT * FROM PatientServices LIMIT 2');

        console.log('\n\nRaw services from MySQL:');
        services.forEach((s, i) => {
            console.log(`\nService ${i + 1}:`);
            console.log(`  ID: ${s.ID} (${typeof s.ID})`);
            console.log(`  GrandTotal: ${s.GrandTotal} (${typeof s.GrandTotal})`);
            console.log(`  CreatedAt: ${s.CreatedAt} (${typeof s.CreatedAt})`);
            console.log(`  CreatedAt instanceof Date: ${s.CreatedAt instanceof Date}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

debugData();
