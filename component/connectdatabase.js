import mysql from 'mysql2/promise';
import { configDotenv } from 'dotenv';
configDotenv();

const connectdatabase = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_EMPLOYEE, timezone: process.env.DB_TIMEZONE });
const connectdatabase_pmssystem = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_PMSSYSTEM, timezone: process.env.DB_TIMEZONE });

const testDB = async () => {
    try {
        await connectdatabase.query('SELECT 1');
        console.log('Connection Success | DB: Employee');
        await connectdatabase_pmssystem.query('SELECT 1');
        console.log('Connection Success | DB: PMS System');
    } catch (err) {
        console.error('Database connection failed:', err.message);
    }
}

testDB();

export default { connectdatabase, connectdatabase_pmssystem };