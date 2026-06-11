import pool from '../config/db.js';

/**
 * Logs an action to the audit_logs table
 * @param {Object} user - The user object from the request (req.user)
 * @param {string} action - 'CREATE', 'UPDATE', 'DELETE'
 * @param {string} entity - 'property', 'tenant', 'invoice', 'receipt', 'unit', etc.
 * @param {string} entityId - The UUID of the entity being modified
 * @param {Object} details - Additional details like old/new values or payload
 */
export async function logAudit(user, action, entity, entityId, details = {}) {
  try {
    if (!user || !user.id) return;

    await pool.query(
      `INSERT INTO audit_logs (user_id, user_email, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, user.email, action, entity, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    // We log the error but do not throw, to avoid failing the main request if logging fails
    console.error('❌ Failed to write audit log:', error.message);
  }
}

/**
 * Automatically cleans up logs older than retentionDays
 * @param {number} retentionDays - Number of days to keep logs (default 365)
 */
export async function cleanupOldLogs(retentionDays = 365) {
  try {
    const result = await pool.query(
      `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '$1 days'`,
      [retentionDays]
    );
    if (result.rowCount > 0) {
      console.log(`🧹 Cleaned up ${result.rowCount} old audit logs.`);
    }
  } catch (error) {
    console.error('❌ Failed to cleanup old audit logs:', error.message);
  }
}
