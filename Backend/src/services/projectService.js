import { ApiError } from "../utils/ApiError.js";

const aggregateSql = `
  SELECT p.id, p.name, p.description, p.created_at AS createdAt, p.updated_at AS updatedAt,
    COUNT(t.id) AS taskCount,
    COALESCE(SUM(t.status = 'done'), 0) AS completedTaskCount,
    COALESCE(ROUND(100 * SUM(t.status = 'done') / NULLIF(COUNT(t.id), 0)), 0) AS progress
  FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
`;

export function createProjectService(pool) {
  async function get(userId, id) {
    const [rows] = await pool.execute(
      `${aggregateSql} WHERE p.user_id = ? AND p.id = ? GROUP BY p.id LIMIT 1`,
      [userId, id],
    );
    if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "The requested resource was not found.");
    return rows[0];
  }

  return {
    async list(userId) {
      const [rows] = await pool.execute(
        `${aggregateSql} WHERE p.user_id = ? GROUP BY p.id ORDER BY p.created_at DESC, p.id DESC`,
        [userId],
      );
      return rows;
    },
    get,
    async create(userId, { name, description = null }) {
      const [result] = await pool.execute(
        "INSERT INTO projects (user_id, name, description) VALUES (?, ?, ?)",
        [userId, name, description],
      );
      return get(userId, result.insertId);
    },
    async update(userId, id, { name, description = null }) {
      await pool.execute(
        "UPDATE projects SET name = ?, description = ? WHERE id = ? AND user_id = ?",
        [name, description, id, userId],
      );
      return get(userId, id);
    },
    async remove(userId, id) {
      const [result] = await pool.execute("DELETE FROM projects WHERE id = ? AND user_id = ?", [id, userId]);
      if (!result.affectedRows) throw new ApiError(404, "NOT_FOUND", "The requested resource was not found.");
    },
  };
}
