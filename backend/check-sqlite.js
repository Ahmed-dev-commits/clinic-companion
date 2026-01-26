/**
 * Check SQLite Database Contents
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const db = new sqlite3(path.join(__dirname, 'database', 'HospitalDB.sqlite'), { readonly: true });

console.log('📊 Checking SQLite Database Contents...\n');

// Check all tables
console.log('Tables in database:');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => console.log(`  - ${t.name}`));
console.log('');

// Count records in each table
const counts = {
    Patients: db.prepare('SELECT COUNT(*) as count FROM Patients').get().count,
    Stock: db.prepare('SELECT COUNT(*) as count FROM Stock').get().count,
    Payments: db.prepare('SELECT COUNT(*) as count FROM Payments').get().count,
    Prescriptions: db.prepare('SELECT COUNT(*) as count FROM Prescriptions').get().count,
    LabResults: db.prepare('SELECT COUNT(*) as count FROM LabResults').get().count,
};

// Check if PatientServices exists
try {
    counts.PatientServices = db.prepare('SELECT COUNT(*) as count FROM PatientServices').get().count;
} catch (e) {
    counts.PatientServices = 'N/A';
}

console.log('Record Counts:');
Object.entries(counts).forEach(([table, count]) => {
    console.log(`  ${table}: ${count}`);
});
console.log('');

// Show sample payments if they exist
if (counts.Payments > 0) {
    console.log('Sample Payments:');
    const payments = db.prepare('SELECT ID, PatientName, TotalAmount, CreatedAt FROM Payments LIMIT 3').all();
    payments.forEach(p => {
        console.log(`  - ${p.ID}: ${p.PatientName} - Rs.${p.TotalAmount} (${p.CreatedAt})`);
    });
}

db.close();
