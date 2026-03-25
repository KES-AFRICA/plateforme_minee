import {
  ApiResponse,
  PaginatedResponse,
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  DashboardStats,
  WeeklyTrend,
  ActivityItem,
} from "../types";
import { mockApiResponse } from "../client";
import { mockTasks, mockDashboardStats, mockWeeklyTrend, mockActivity } from "../mock-data";

interface TaskFilters {
  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  search?: string;
}

interface TaskPagination {
  page?: number;
  pageSize?: number;
}

class TaskService {
  private tasks: Task[] = [...mockTasks];

  async getTasks(
    filters: TaskFilters = {},
    pagination: TaskPagination = {}
  ): Promise<ApiResponse<PaginatedResponse<Task>>> {
    let filteredTasks = [...this.tasks];

    // Apply filters
    if (filters.type) {
      filteredTasks = filteredTasks.filter((t) => t.type === filters.type);
    }
    if (filters.status) {
      filteredTasks = filteredTasks.filter((t) => t.status === filters.status);
    }
    if (filters.priority) {
      filteredTasks = filteredTasks.filter((t) => t.priority === filters.priority);
    }
    if (filters.assignedTo) {
      filteredTasks = filteredTasks.filter((t) => t.assignedTo === filters.assignedTo);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredTasks = filteredTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (newest first)
    filteredTasks.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pagination
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;
    const total = filteredTasks.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return mockApiResponse<PaginatedResponse<Task>>({
      data: filteredTasks.slice(start, end),
      total,
      page,
      pageSize,
      totalPages,
    });
  }

  async getTaskById(id: string): Promise<ApiResponse<Task>> {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      return { error: "Task not found" };
    }
    return mockApiResponse(task);
  }

  async createTask(taskData: Partial<Task>): Promise<ApiResponse<Task>> {
    const newTask: Task = {
      id: `task-${String(this.tasks.length + 1).padStart(3, "0")}`,
      type: taskData.type || "duplicate",
      status: "pending",
      priority: taskData.priority || "medium",
      title: taskData.title || "New Task",
      description: taskData.description,
      assignedTo: taskData.assignedTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: taskData.data || {},
    };

    this.tasks.unshift(newTask);
    return mockApiResponse(newTask);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<ApiResponse<Task>> {
    const taskIndex = this.tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      return { error: "Task not found" };
    }

    this.tasks[taskIndex] = {
      ...this.tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return mockApiResponse(this.tasks[taskIndex]);
  }

  async assignTask(id: string, userId: string): Promise<ApiResponse<Task>> {
    return this.updateTask(id, { assignedTo: userId, status: "in_progress" });
  }

  async completeTask(id: string): Promise<ApiResponse<Task>> {
    return this.updateTask(id, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  }

  async validateTask(
    id: string,
    validatedBy: string,
    comment?: string
  ): Promise<ApiResponse<Task>> {
    return this.updateTask(id, {
      status: "validated",
      validatedAt: new Date().toISOString(),
      validatedBy,
      validationComment: comment,
    });
  }

  async rejectTask(
    id: string,
    rejectedBy: string,
    comment: string
  ): Promise<ApiResponse<Task>> {
    return this.updateTask(id, {
      status: "rejected",
      validatedAt: new Date().toISOString(),
      validatedBy: rejectedBy,
      validationComment: comment,
    });
  }

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    // Calculate real stats from tasks
    const stats: DashboardStats = {
      totalTasks: this.tasks.length + mockDashboardStats.totalTasks - mockTasks.length,
      pending: this.tasks.filter((t) => t.status === "pending").length + 
        mockDashboardStats.pending - mockTasks.filter((t) => t.status === "pending").length,
      inProgress: this.tasks.filter((t) => t.status === "in_progress").length +
        mockDashboardStats.inProgress - mockTasks.filter((t) => t.status === "in_progress").length,
      completed: this.tasks.filter((t) => t.status === "completed").length +
        mockDashboardStats.completed - mockTasks.filter((t) => t.status === "completed").length,
      validated: this.tasks.filter((t) => t.status === "validated").length +
        mockDashboardStats.validated - mockTasks.filter((t) => t.status === "validated").length,
      rejected: this.tasks.filter((t) => t.status === "rejected").length +
        mockDashboardStats.rejected - mockTasks.filter((t) => t.status === "rejected").length,
      processingRate: mockDashboardStats.processingRate,
      validationRate: mockDashboardStats.validationRate,
      avgProcessingTime: mockDashboardStats.avgProcessingTime,
    };

    return mockApiResponse(stats);
  }

  async getWeeklyTrend(): Promise<ApiResponse<WeeklyTrend[]>> {
    return mockApiResponse(mockWeeklyTrend);
  }

  async getRecentActivity(limit: number = 10): Promise<ApiResponse<ActivityItem[]>> {
    return mockApiResponse(mockActivity.slice(0, limit));
  }

  async getTasksByType(type: TaskType): Promise<ApiResponse<Task[]>> {
    const tasks = this.tasks.filter((t) => t.type === type);
    return mockApiResponse(tasks);
  }

  async getPendingValidation(): Promise<ApiResponse<Task[]>> {
    const tasks = this.tasks.filter((t) => t.status === "completed");
    return mockApiResponse(tasks);
  }
}

export const taskService = new TaskService();
