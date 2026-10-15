export function createDashboardService(pool) {
  return {
    async stats(userId) {
      const [rows] = await pool.execute(
        `SELECT
          (SELECT COUNT(*) FROM projects WHERE user_id = ?) AS totalProjects,
          (SELECT COUNT(*) FROM tasks WHERE user_id = ?) AS totalTasks,
          (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status = 'done') AS completedTasks,
          (SELECT COUNT(*) FROM tasks WHERE user_id = ? AND status <> 'done' AND due_date < CURRENT_DATE) AS overdueTasks`,
        [userId, userId, userId, userId],
      );
      const [statusRows] = await pool.execute(
        `SELECT
          COALESCE(SUM(status = 'todo'), 0) AS todo,
          COALESCE(SUM(status = 'in_progress'), 0) AS in_progress,
          COALESCE(SUM(status = 'done'), 0) AS done
         FROM tasks WHERE user_id = ?`,
        [userId],
      );
      const [projectRows] = await pool.execute(
        `SELECT p.id, p.name, p.description, p.created_at AS createdAt,
          COUNT(t.id) AS taskCount,
          COALESCE(SUM(t.status = 'done'), 0) AS completedTaskCount,
          COALESCE(ROUND(100 * SUM(t.status = 'done') / NULLIF(COUNT(t.id), 0)), 0) AS progress
         FROM projects p LEFT JOIN tasks t ON t.project_id = p.id AND t.user_id = p.user_id
         WHERE p.user_id = ?
         GROUP BY p.id
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT 4`,
        [userId],
      );
      return {
        ...Object.fromEntries(Object.entries(rows[0]).map(([key, value]) => [key, Number(value)])),
        byStatus: Object.fromEntries(Object.entries(statusRows[0]).map(([key, value]) => [key, Number(value)])),
        recentProjects: projectRows,
      };
    },
  };
}
