import { ApiError } from "../utils/ApiError.js";

const selectSql = `
  SELECT t.id, t.project_id AS projectId, t.user_id AS userId, t.title, t.description,
    t.status, t.priority, t.due_date AS dueDate,
    t.created_at AS createdAt, t.updated_at AS updatedAt
  FROM tasks t
`;

export function createTaskService(pool) {
  async function assertOwnedProject(connection, projectId, userId) {
    const [rows] = await connection.execute(
      "SELECT id FROM projects WHERE id = ? AND user_id = ? LIMIT 1",
      [projectId, userId],
    );
    if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "The requested resource was not found.");
  }

  async function get(userId, id) {
    const [rows] = await pool.execute(`${selectSql} WHERE t.user_id = ? AND t.id = ? LIMIT 1`, [userId, id]);
    if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "The requested resource was not found.");
    return rows[0];
  }

  return {
    async list(userId, filters) {
      const conditions = ["t.user_id = ?"];
      const values = [userId];
      if (filters.search) {
        conditions.push("t.title LIKE ?");
        values.push(`%${filters.search.replace(/[\\%_]/g, "\\$&")}%`);
      }
      if (filters.status) {
        conditions.push("t.status = ?");
        values.push(filters.status);
      }
      if (filters.priority) {
        conditions.push("t.priority = ?");
        values.push(filters.priority);
      }

      const where = ` WHERE ${conditions.join(" AND ")}`;
      const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM tasks t${where}`, values);
      const offset = (filters.page - 1) * filters.pageSize;
      const [rows] = await pool.execute(
        `${selectSql}${where} ORDER BY t.created_at DESC, t.id DESC LIMIT ? OFFSET ?`,
        [...values, filters.pageSize, offset],
      );
      const total = Number(countRows[0].total);
      return {
        tasks: rows,
        pagination: {
          page: filters.page,
          pageSize: filters.pageSize,
          total,
          totalPages: Math.ceil(total / filters.pageSize),
        },
      };
    },
    get,
    async create(userId, input) {
      await assertOwnedProject(pool, input.projectId, userId);
      const [result] = await pool.execute(
        `INSERT INTO tasks (project_id, user_id, title, description, status, priority, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input.projectId, userId, input.title, input.description ?? null, input.status, input.priority, input.dueDate ?? null],
      );
      return get(userId, result.insertId);
    },
    async update(userId, id, input) {
      await assertOwnedProject(pool, input.projectId, userId);
      await pool.execute(
        `UPDATE tasks SET project_id = ?, title = ?, description = ?, status = ?, priority = ?, due_date = ?
         WHERE id = ? AND user_id = ?`,
        [input.projectId, input.title, input.description ?? null, input.status, input.priority, input.dueDate ?? null, id, userId],
      );
      return get(userId, id);
    },
    async updateStatus(userId, id, status) {
      await pool.execute("UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?", [status, id, userId]);
      return get(userId, id);
    },
    async remove(userId, id) {
      const [result] = await pool.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", [id, userId]);
      if (!result.affectedRows) throw new ApiError(404, "NOT_FOUND", "The requested resource was not found.");
    },
  };
}
