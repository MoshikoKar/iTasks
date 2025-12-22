'use client';

import { useState, useMemo } from 'react';
import { TaskStatus, TaskPriority, Role } from "@prisma/client";
import { Download, FileText, BarChart3, TrendingUp, Calendar, Filter, X } from 'lucide-react';
import { Button } from '@/components/button';
import { BarChartComponent, PieChartComponent, LineChartComponent } from '@/components/charts';
import { downloadMultiSectionCSV, exportToPDF, generateReportFilename } from '@/lib/utils/export';
import { formatDateTimeStable } from '@/lib/utils/date';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate?: Date | null;
  slaDeadline?: Date | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: Date;
  updatedAt: Date;
  assignee: {
    name: string;
    role: Role;
    team?: { name: string } | null;
  };
  creator: { name: string };
  context?: {
    serverName?: string | null;
    application?: string | null;
    environment?: string | null;
  } | null;
}

interface Team {
  id: string;
  name: string;
  members: Array<{
    name: string;
    _count: { tasksAssigned: number };
  }>;
}

interface ReportsClientProps {
  tasks: Task[];
  teams: Team[];
}

type TabType = 'overview' | 'workload' | 'performance' | 'assets' | 'trends';

export function ReportsClient({ tasks, teams }: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [filters, setFilters] = useState<{
    priority?: TaskPriority[];
    status?: TaskStatus[];
    team?: string[];
    assignee?: string[];
  }>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filter tasks by date range and other filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Date range filter
      const taskDate = task.createdAt;
      if (dateRange.start && taskDate < dateRange.start) return false;
      if (dateRange.end && taskDate > dateRange.end) return false;

      // Priority filter
      if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;

      // Status filter
      if (filters.status && filters.status.length > 0 && !filters.status.includes(task.status)) return false;

      // Team filter
      if (filters.team && filters.team.length > 0 && (!task.assignee.team?.name || !filters.team.includes(task.assignee.team.name))) return false;

      // Assignee filter
      if (filters.assignee && filters.assignee.length > 0 && !filters.assignee.includes(task.assignee.name)) return false;

      return true;
    });
  }, [tasks, dateRange, filters]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const openTasks = filteredTasks.filter(t => t.status === TaskStatus.Open).length;
    const inProgressTasks = filteredTasks.filter(t => t.status === TaskStatus.InProgress).length;
    const resolvedTasks = filteredTasks.filter(t =>
      t.status === TaskStatus.Resolved || t.status === TaskStatus.Closed
    ).length;

    // Workload by technician
    const workloadByTechnician = filteredTasks.reduce((acc, task) => {
      const name = task.assignee.name;
      if (!acc[name]) {
        acc[name] = { total: 0, open: 0, inProgress: 0, resolved: 0, team: task.assignee.team?.name };
      }
      acc[name].total++;
      if (task.status === TaskStatus.Open) acc[name].open++;
      if (task.status === TaskStatus.InProgress) acc[name].inProgress++;
      if (task.status === TaskStatus.Resolved || task.status === TaskStatus.Closed) acc[name].resolved++;
      return acc;
    }, {} as Record<string, { total: number; open: number; inProgress: number; resolved: number; team?: string }>);

    // Priority distribution
    const priorityDistribution = Object.values(TaskPriority).map(priority => ({
      name: priority,
      value: filteredTasks.filter(t => t.priority === priority).length
    })).filter(item => item.value > 0);

    // Status distribution
    const statusDistribution = Object.values(TaskStatus).map(status => ({
      name: status.replace(/([A-Z])/g, ' $1').trim(),
      value: filteredTasks.filter(t => t.status === status).length
    })).filter(item => item.value > 0);

    // Resolution time analytics
    const resolvedTasksData = filteredTasks.filter(
      (t) => t.status === TaskStatus.Resolved || t.status === TaskStatus.Closed
    );
    const resolutionTimes = resolvedTasksData
      .map((t) => (t.updatedAt.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60))
      .filter((t) => t > 0 && t < 24 * 30); // Filter out unrealistic times (over 30 days)

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    // SLA compliance
    const slaTasks = filteredTasks.filter(t => t.slaDeadline);
    const slaMet = slaTasks.filter(t => {
      if (!t.slaDeadline) return false;
      return t.updatedAt <= t.slaDeadline;
    }).length;
    const slaCompliance = slaTasks.length > 0 ? (slaMet / slaTasks.length) * 100 : 0;

    // Asset issues
    const assetIssues = filteredTasks.reduce((acc, task) => {
      const key = task.context?.serverName || task.context?.application || "Unknown";
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {} as Record<string, number>);

    const topAssets = Object.entries(assetIssues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Team performance
    const teamPerformance = teams.map(team => {
      const teamTasks = filteredTasks.filter(task => task.assignee.team?.name === team.name);
      const resolved = teamTasks.filter(t =>
        t.status === TaskStatus.Resolved || t.status === TaskStatus.Closed
      ).length;
      const total = teamTasks.length;
      return {
        name: team.name,
        resolved,
        total,
        completionRate: total > 0 ? (resolved / total) * 100 : 0
      };
    }).filter(team => team.total > 0);

    // Trend data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTasks = filteredTasks.filter(t =>
        t.createdAt >= dayStart && t.createdAt <= dayEnd
      );

      const resolvedDayTasks = dayTasks.filter(t =>
        (t.status === TaskStatus.Resolved || t.status === TaskStatus.Closed) &&
        t.updatedAt >= dayStart && t.updatedAt <= dayEnd
      );

      trendData.push({
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        created: dayTasks.length,
        resolved: resolvedDayTasks.length
      });
    }

    return {
      totalTasks,
      openTasks,
      inProgressTasks,
      resolvedTasks,
      workloadByTechnician,
      priorityDistribution,
      statusDistribution,
      avgResolutionTime,
      slaCompliance,
      topAssets,
      teamPerformance,
      trendData,
      resolutionTimes
    };
  }, [filteredTasks, teams]);

  // Export functions
  const handleExportCSV = () => {
    const sections = [
      {
        title: 'Task Summary',
        data: [{
          'Total Tasks': analytics.totalTasks,
          'Open Tasks': analytics.openTasks,
          'In Progress': analytics.inProgressTasks,
          'Resolved Tasks': analytics.resolvedTasks,
          'Average Resolution Time (hours)': analytics.avgResolutionTime.toFixed(2),
          'SLA Compliance (%)': analytics.slaCompliance.toFixed(1)
        }],
        headers: ['Metric', 'Value']
      },
      {
        title: 'Workload by Technician',
        data: Object.entries(analytics.workloadByTechnician).map(([name, stats]) => ({
          'Technician': name,
          'Team': stats.team || 'N/A',
          'Total Tasks': stats.total,
          'Open': stats.open,
          'In Progress': stats.inProgress,
          'Resolved': stats.resolved
        }))
      },
      {
        title: 'Priority Distribution',
        data: analytics.priorityDistribution.map(item => ({
          'Priority': item.name,
          'Count': item.value
        }))
      },
      {
        title: 'Top Assets with Issues',
        data: analytics.topAssets.map(item => ({
          'Asset': item.name,
          'Issue Count': item.value
        }))
      },
      {
        title: 'Team Performance',
        data: analytics.teamPerformance.map(team => ({
          'Team': team.name,
          'Total Tasks': team.total,
          'Resolved': team.resolved,
          'Completion Rate (%)': team.completionRate.toFixed(1)
        }))
      }
    ];

    downloadMultiSectionCSV(sections, generateReportFilename('tasks_report', 'csv'));
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF('reports-content', generateReportFilename('tasks_report', 'pdf'));
    } catch (error) {
      console.error('PDF export failed:', error);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { id: 'workload', label: 'Workload', icon: <BarChart3 size={16} /> },
    { id: 'performance', label: 'Performance', icon: <TrendingUp size={16} /> },
    { id: 'assets', label: 'Assets', icon: <FileText size={16} /> },
    { id: 'trends', label: 'Trends', icon: <TrendingUp size={16} /> }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            Filters
            {(Object.values(filters).some(arr => arr && arr.length > 0) || dateRange.start || dateRange.end) && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                {[
                  dateRange.start || dateRange.end ? 1 : 0,
                  filters.priority?.length || 0,
                  filters.status?.length || 0,
                  filters.team?.length || 0,
                  filters.assignee?.length || 0
                ].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar size={16} />
            <span>{analytics.totalTasks} total tasks</span>
          </div>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download size={16} />
            CSV
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <FileText size={16} />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card-base p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Filters</h3>
            <Button
              onClick={() => {
                setDateRange({});
                setFilters({});
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <X size={16} />
              Clear All
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    start: e.target.value ? new Date(e.target.value) : undefined
                  }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    end: e.target.value ? new Date(e.target.value) : undefined
                  }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <div className="space-y-1">
                {Object.values(TaskPriority).map(priority => (
                  <label key={priority} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.priority?.includes(priority) || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFilters(prev => ({
                          ...prev,
                          priority: checked
                            ? [...(prev.priority || []), priority]
                            : (prev.priority || []).filter(p => p !== priority)
                        }));
                      }}
                      className="rounded border-border"
                    />
                    {priority}
                  </label>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <div className="space-y-1">
                {Object.values(TaskStatus).map(status => (
                  <label key={status} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(status) || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFilters(prev => ({
                          ...prev,
                          status: checked
                            ? [...(prev.status || []), status]
                            : (prev.status || []).filter(s => s !== status)
                        }));
                      }}
                      className="rounded border-border"
                    />
                    {status.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                ))}
              </div>
            </div>

            {/* Team Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Team</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {teams.map(team => (
                  <label key={team.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.team?.includes(team.name) || false}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFilters(prev => ({
                          ...prev,
                          team: checked
                            ? [...(prev.team || []), team.name]
                            : (prev.team || []).filter(t => t !== team.name)
                        }));
                      }}
                      className="rounded border-border"
                    />
                    {team.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div id="reports-content" className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {/* Key Metrics */}
            <div className="card-base p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Tasks</h3>
              <div className="text-3xl font-bold text-foreground">{analytics.totalTasks}</div>
            </div>

            <div className="card-base p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Open Tasks</h3>
              <div className="text-3xl font-bold text-orange-600">{analytics.openTasks}</div>
            </div>

            <div className="card-base p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Avg Resolution Time</h3>
              <div className="text-3xl font-bold text-blue-600">{analytics.avgResolutionTime.toFixed(1)}h</div>
            </div>

            <div className="card-base p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">SLA Compliance</h3>
              <div className="text-3xl font-bold text-green-600">{analytics.slaCompliance.toFixed(1)}%</div>
            </div>

            {/* Charts */}
            <div className="card-base p-6 lg:col-span-2">
              <PieChartComponent
                data={analytics.statusDistribution}
                title="Task Status Distribution"
                height={250}
              />
            </div>

            <div className="card-base p-6 lg:col-span-2">
              <PieChartComponent
                data={analytics.priorityDistribution}
                title="Priority Distribution"
                height={250}
              />
            </div>
          </div>
        )}

        {activeTab === 'workload' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-base p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Workload by Technician</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(analytics.workloadByTechnician)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([name, stats]) => (
                    <div key={name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{name}</span>
                        <span className="text-muted-foreground">{stats.total} total</span>
                      </div>
                      <div className="h-4 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{
                            width: `${(stats.total / Math.max(...Object.values(analytics.workloadByTechnician).map((s) => s.total))) * 100}%`
                          }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Open: {stats.open}</span>
                        <span>In Progress: {stats.inProgress}</span>
                        <span>Resolved: {stats.resolved}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="card-base p-6">
              <BarChartComponent
                data={Object.entries(analytics.workloadByTechnician).map(([name, stats]) => ({
                  name,
                  value: stats.total
                }))}
                title="Tasks per Technician"
                height={300}
              />
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-base p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Team Performance</h2>
              <div className="space-y-4">
                {analytics.teamPerformance.map((team) => (
                  <div key={team.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{team.name}</span>
                      <span className="text-muted-foreground">{team.completionRate.toFixed(1)}% complete</span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${team.completionRate}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Resolved: {team.resolved}</span>
                      <span>Total: {team.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-base p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Resolution Time Distribution</h2>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {analytics.avgResolutionTime.toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  Average resolution time
                </div>
                <div className="text-xs text-muted-foreground">
                  Based on {analytics.resolutionTimes.length} resolved tasks
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="grid gap-6">
            <div className="card-base p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Most Frequent Asset Issues</h2>
              {analytics.topAssets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No asset data available</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <BarChartComponent
                      data={analytics.topAssets}
                      title="Issues by Asset"
                      height={300}
                      color="#ef4444"
                    />
                  </div>
                  <div className="space-y-2">
                    {analytics.topAssets.map((asset, index) => (
                      <div key={asset.name} className="flex items-center justify-between rounded-md border border-border p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <span className="font-medium text-foreground">{asset.name}</span>
                        </div>
                        <span className="rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive border border-destructive/20">
                          {asset.value} {asset.value === 1 ? "issue" : "issues"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="grid gap-6">
            <div className="card-base p-6">
              <LineChartComponent
                data={analytics.trendData}
                series={[
                  { dataKey: 'created', name: 'Created', color: '#3b82f6' },
                  { dataKey: 'resolved', name: 'Resolved', color: '#10b981' }
                ]}
                title="Task Creation vs Resolution Trends (Last 30 Days)"
                height={400}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}