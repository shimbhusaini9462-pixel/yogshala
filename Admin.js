const db = require('../config/db');

class Admin {
    /**
     * Finds an admin by their email address.
     * Uses a parameterized query to prevent SQL injection.
     * @param {string} email - The admin's email.
     * @returns {Promise<object|null>} - The admin object or null if not found.
     */
    static async findByEmail(email) {
        const sql = 'SELECT * FROM `admins` WHERE `email` = ? LIMIT 1';
        const [rows] = await db.execute(sql, [email]);
        return rows[0];
    }
}

module.exports = Admin;