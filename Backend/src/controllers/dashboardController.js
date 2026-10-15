export function createDashboardController(dashboardService) {
  return {
    stats: async (req, res) => {
      const stats = await dashboardService.stats(req.user.id);
      res.json({ success: true, data: { stats } });
    },
  };
}
