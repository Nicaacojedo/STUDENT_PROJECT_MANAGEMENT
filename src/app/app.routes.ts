import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards';
import { ShellComponent } from './layout/shell';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in | SPMS',
    loadComponent: () => import('./auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create account | SPMS',
    loadComponent: () => import('./auth/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    title: 'Forgot password | SPMS',
    loadComponent: () => import('./auth/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    title: 'Reset password | SPMS',
    loadComponent: () => import('./auth/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard | SPMS',
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'projects',
        title: 'Projects | SPMS',
        loadComponent: () => import('./features/projects/projects.page').then((m) => m.ProjectsPage),
      },
      {
        path: 'projects/new',
        title: 'New project | SPMS',
        loadComponent: () => import('./features/projects/project-form.page').then((m) => m.ProjectFormPage),
      },
      {
        path: 'projects/:id',
        title: 'Project details | SPMS',
        loadComponent: () =>
          import('./features/projects/project-detail.page').then((m) => m.ProjectDetailPage),
      },
      {
        path: 'projects/:id/edit',
        title: 'Edit project | SPMS',
        loadComponent: () =>
          import('./features/projects/project-form.page').then((m) => m.ProjectFormPage),
      },
      {
        path: 'tasks',
        title: 'My tasks | SPMS',
        loadComponent: () => import('./features/tasks/tasks.page').then((m) => m.TasksPage),
      },
      {
        path: 'team',
        title: 'Team members | SPMS',
        loadComponent: () => import('./features/team/team.page').then((m) => m.TeamPage),
      },
      {
        path: 'workload',
        title: 'Workload | SPMS',
        loadComponent: () => import('./features/workload/workload.page').then((m) => m.WorkloadPage),
      },
      {
        path: 'contributions',
        title: 'Contributions | SPMS',
        loadComponent: () =>
          import('./features/contributions/contributions.page').then((m) => m.ContributionsPage),
      },
      {
        path: 'deadlines',
        title: 'Deadlines | SPMS',
        loadComponent: () => import('./features/deadlines/deadlines.page').then((m) => m.DeadlinesPage),
      },
      {
        path: 'files',
        title: 'File management | SPMS',
        loadComponent: () => import('./features/files/files.page').then((m) => m.FilesPage),
      },
      {
        path: 'feedback',
        title: 'Adviser feedback | SPMS',
        loadComponent: () => import('./features/feedback/feedback.page').then((m) => m.FeedbackPage),
      },
      {
        path: 'reports',
        title: 'Reports | SPMS',
        loadComponent: () => import('./features/reports/reports.page').then((m) => m.ReportsPage),
      },
      {
        path: 'settings',
        title: 'Settings | SPMS',
        loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        title: 'User management | SPMS',
        loadComponent: () => import('./features/admin/users.page').then((m) => m.AdminUsersPage),
      },
      {
        path: 'admin/audit',
        canActivate: [adminGuard],
        title: 'Audit logs | SPMS',
        loadComponent: () => import('./features/admin/audit.page').then((m) => m.AuditLogsPage),
      },
    ],
  },
  {
    path: '**',
    title: 'Page not found | SPMS',
    loadComponent: () => import('./features/not-found.page').then((m) => m.NotFoundPage),
  },
];
