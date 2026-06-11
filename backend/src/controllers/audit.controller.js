import pool from '../config/db.js';

export async function getAuditLogs(req, res) {
  try {
    const { page = 1, limit = 50, entity, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const params = [];
    let where = 'WHERE 1=1';

    if (entity) {
      params.push(entity);
      where += ` AND entity = $${params.length}`;
    }
    if (action) {
      params.push(action);
      where += ` AND action = $${params.length}`;
    }

    const dataQuery = `
      SELECT *
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `SELECT COUNT(*) FROM audit_logs ${where}`;

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, [...params, parseInt(limit), offset]),
      pool.query(countQuery, params),
    ]);

    res.json({
      success: true,
      data: dataRes.rows,
      meta: {
        total: parseInt(countRes.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countRes.rows[0].count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
}
