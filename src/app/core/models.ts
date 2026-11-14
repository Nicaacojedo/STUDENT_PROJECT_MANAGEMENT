export type RoleName = 'Admin' | 'Student' | 'Team Leader' | 'Adviser';

export type ProjectStatus =
  | 'Planning'
  | 'In Progress'
  | 'For Review'
  | 'Revision Required'
  | 'Completed'
  | 'Archived';

export type TaskStatus = 'To Do' | 'In Progress' | 'For Review' | 'Completed' | 'Overdue';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: RoleName | string;
  roleId?: number;
  studentNumber?: string | null;
  section?: string | null;
  program?: string | null;
  phone?: string | null;
  avatarColor?: string;
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserSummary {
  id: number;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  avatarColor?: string;
  roleInProject?: string;
}

export interface ProjectStats {
  members: number;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  overdueTasks: number;
  milestones: number;
  approvedMilestones: number;
  pendingReviews: number;
  progress: number;
}

export interface Project {
  id: number;
  title: string;
  description?: string | null;
  academicYear?: string | null;
  semester?: string | null;
  course?: string | null;
  category?: string | null;
  status: ProjectStatus | string;
  leader?: UserSummary | null;
  adviser?: UserSummary | null;
  startDate?: string | null;
  endDate?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  stats?: ProjectStats;
  myAccess?: string;
  canManage?: boolean;
}

export interface ProjectMember {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  section?: string | null;
  program?: string | null;
  studentNumber?: string | null;
  avatarColor?: string;
  role: string;
  roleInProject: string;
  joinedAt?: string;
  isActive: boolean;
  contributionPoints: number;
}

export interface Milestone {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  latestSubmission?: MilestoneLatestSubmission | null;
}

export interface MilestoneLatestSubmission {
  id: number;
  notes?: string | null;
  reviewStatus: string;
  submittedAt?: string;
  reviewedAt?: string | null;
  submittedBy?: string | null;
  reviewedBy?: string | null;
}

export interface MilestoneSubmission {
  id: number;
  milestoneId: number;
  milestoneTitle?: string;
  dueDate?: string;
  projectId?: number;
  projectTitle?: string;
  notes?: string | null;
  reviewStatus: string;
  submittedAt?: string;
  reviewedAt?: string | null;
  submittedBy?: { name: string; avatarColor?: string };
}

export interface Task {
  id: number;
  projectId?: number;
  project_id?: number;
  projectTitle?: string;
  project_title?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priority: TaskPriority | string;
  status: TaskStatus | string;
  startDate?: string | null;
  deadline?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { id: number; name: string };
  daysLeft?: number;
  isOverdue?: boolean;
  deadlineStatus?: string;
  assignees?: UserSummary[];
  commentCount?: number;
  attachmentCount?: number;
}

export interface TaskComment {
  id: number;
  comment: string;
  createdAt: string;
  user: { id: number; name: string; avatarColor?: string };
}

export interface TaskAttachment {
  id: number;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  uploadedBy?: string;
  downloadUrl?: string;
}

export interface ProjectFile {
  id: number;
  projectId: number;
  projectTitle?: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  category?: string;
  description?: string | null;
  createdAt: string;
  uploadedBy?: { id?: number; name: string; avatarColor?: string } | string;
  canDelete?: boolean;
  downloadUrl?: string;
  previewUrl?: string;
  isPreviewable?: boolean;
}

export interface Feedback {
  id: number;
  projectId: number;
  projectTitle: string;
  content: string;
  reviewStatus: string;
  createdAt: string;
  milestoneId?: number | null;
  milestoneTitle?: string | null;
  fileId?: number | null;
  fileName?: string | null;
  adviser: { id: number; name: string; avatarColor?: string };
  canDelete?: boolean;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityItem {
  id: number;
  action: string;
  details: string;
  entityType?: string;
  createdAt: string;
  project?: { id: number; title: string } | null;
  projectTitle?: string | null;
  user: { id?: number; name: string; avatarColor?: string };
}

export interface WorkloadMember {
  user: UserSummary & { roleInProject?: string };
  assigned: number;
  completed: number;
  pending: number;
  overdue: number;
  score: number;
  completionRate: number;
  workloadStatus: 'Balanced' | 'Light' | 'Heavy' | 'Overloaded' | string;
  projectCount?: number;
  activeTasks?: { id: number; title: string; priority: string; status: string; deadline?: string }[];
  recommendation?: string | null;
}

export interface WorkloadSummary {
  memberCount: number;
  averageScore: number;
  totalScore: number;
  overloaded: number;
  heavy: number;
  balanced: number;
  light: number;
  unassignedTasks: number;
  recommendations: string[];
  thresholds: { light: number; balanced: number; heavy: number };
  priorityWeights: Record<string, number>;
}

export interface WorkloadResponse {
  project?: { id: number; title: string; status: string; myAccess?: string };
  projects?: { id: number; title: string; status: string }[];
  members: WorkloadMember[];
  summary: WorkloadSummary;
}

export interface ContributionMember {
  user: UserSummary & { roleInProject?: string };
  points: number;
  percentage: number;
  completedTasks: number;
  filesUploaded: number;
  milestonesSubmitted: number;
  breakdown: Record<string, number>;
  rank?: number | null;
  projectCount?: number;
  projects?: string[];
}

export interface ContributionRecord {
  userId: number;
  sourceType: string;
  points: number;
  description: string;
  createdAt: string;
  projectTitle?: string;
  user: { name: string; avatarColor?: string };
}

export interface ContributionsResponse {
  project?: { id: number; title: string; status: string };
  projects?: { id: number; title: string; status: string }[];
  members: ContributionMember[];
  totalPoints: number;
  weights: Record<string, number>;
  records: ContributionRecord[];
}

export interface DeadlineItem {
  kind: 'task' | 'milestone' | 'project';
  id: number;
  title: string;
  projectId: number;
  projectTitle: string;
  date: string;
  status: string;
  priority?: string;
  daysLeft: number;
  deadlineStatus: string;
}

export interface DeadlinesResponse {
  items: DeadlineItem[];
  counts: { overdue: number; dueToday: number; upcoming: number; completed: number };
  projects: { id: number; title: string; status: string }[];
  range: { from: string; to: string };
}

export interface ReportResponse {
  range: { from: string; to: string };
  projects: Project[];
  summary: {
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    overdueTasks: number;
    contributionPoints: number;
    completedInRange: number;
    pendingReviews: number;
    feedbackCount: number;
  };
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  completionTrend: { label: string; start: string; end: string; completed: number }[];
  contributions: {
    user: { id: number; name: string; avatarColor?: string };
    points: number;
    percentage: number;
    completedTasks: number;
    breakdown: Record<string, number>;
  }[];
  workload: WorkloadResponse;
  overdueTasks: Task[];
  feedback: Feedback[];
}

export interface DashboardData {
  role: string;
  stats: Record<string, number>;
  projects?: Project[];
  tasks?: (Task & { project_id?: number; project_title?: string })[];
  upcomingDeadlines?: DeadlineItem[];
  recentActivities?: ActivityItem[];
  contribution?: {
    points: number;
    totalPoints: number;
    percentage: number;
    breakdown: Record<string, number>;
  } | null;
  workload?: WorkloadResponse;
  managedProjectIds?: number[];
  attentionProjects?: Project[];
  studentPerformance?: {
    user: UserSummary;
    assigned: number;
    completed: number;
    overdue: number;
    completionRate: number;
    contributionPoints: number;
  }[];
  recentSubmissions?: MilestoneSubmission[];
  recentFeedback?: {
    id: number;
    content: string;
    reviewStatus: string;
    createdAt: string;
    project: { id: number; title: string };
    adviserName: string;
  }[];
  userStats?: Record<string, { total: number; active: number }>;
  projectStats?: { byStatus: Record<string, number>; byCategory: Record<string, number> };
  taskStats?: { byStatus: Record<string, number>; byPriority: Record<string, number> };
  recentUsers?: User[];
  activityTrend?: { label: string; count: number }[];
}

export interface Section {
  id: number;
  name: string;
  programId?: number | null;
  program?: string | null;
  academicYear?: string | null;
}

export interface Program {
  id: number;
  name: string;
  code?: string | null;
}

export interface StudentLookup {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  section?: string | null;
  program?: string | null;
  studentNumber?: string | null;
  avatarColor?: string;
}

export interface FormulaSettings {
  contributionWeights: Record<string, number>;
  workloadThresholds: { light: number; balanced: number; heavy: number };
  defaults: Record<string, number>;
  canEdit: boolean;
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
}

export interface ConfirmState extends ConfirmOptions {
  id: number;
}

export interface Paginated<T> {
  items: T[];
  total?: number;
}
