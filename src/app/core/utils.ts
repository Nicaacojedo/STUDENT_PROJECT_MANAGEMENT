import { HttpErrorResponse } from '@angular/common/http';

export function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDate(value?: string | null, withYear = true): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value).getTime();
  if (Number.isNaN(date)) return '';
  const diff = Date.now() - date;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export function toneClass(status?: string | null): string {
  switch (status) {
    case 'Completed':
    case 'Approved':
    case 'Balanced':
    case 'Active':
      return 'tone-green';
    case 'In Progress':
    case 'Upcoming':
    case 'Comment':
      return 'tone-blue';
    case 'For Review':
    case 'Submitted':
    case 'Pending':
      return 'tone-violet';
    case 'Revision Required':
    case 'Due Today':
    case 'High':
    case 'Heavy':
      return 'tone-amber';
    case 'Overdue':
    case 'Urgent':
    case 'Overloaded':
    case 'Rejected':
      return 'tone-red';
    case 'Planning':
      return 'tone-slate';
    case 'Archived':
      return 'tone-gray';
    case 'Medium':
      return 'tone-blue';
    case 'Low':
      return 'tone-slate';
    case 'Light':
      return 'tone-teal';
    default:
      return 'tone-gray';
  }
}

export function priorityTone(priority?: string | null): string {
  return toneClass(priority);
}

export function fileKind(nameOrType?: string | null): 'pdf' | 'img' | 'doc' | 'sheet' | 'zip' | 'other' {
  const value = (nameOrType || '').toLowerCase();
  if (value.includes('pdf')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp)$/.test(value) || value.includes('image/')) return 'img';
  if (/\.(docx?|pptx?)$/.test(value) || value.includes('word') || value.includes('presentation')) return 'doc';
  if (/\.(xlsx?|csv)$/.test(value) || value.includes('sheet')) return 'sheet';
  if (value.includes('zip') || value.includes('compressed')) return 'zip';
  return 'other';
}

export function fileIcon(kind: string): string {
  switch (kind) {
    case 'pdf':
      return 'bi-file-earmark-pdf';
    case 'img':
      return 'bi-file-earmark-image';
    case 'doc':
      return 'bi-file-earmark-word';
    case 'sheet':
      return 'bi-file-earmark-spreadsheet';
    case 'zip':
      return 'bi-file-earmark-zip';
    default:
      return 'bi-file-earmark';
  }
}

export function fileSize(bytes?: number | null): string {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function daysLabel(days?: number | null, status?: string): string {
  if (status === 'Completed') return 'Completed';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return '1 day overdue';
  if (days !== undefined && days !== null && days < 0) return `${Math.abs(days)} days overdue`;
  if (days !== undefined && days !== null) return `${days} days left`;
  return 'No deadline';
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

export function apiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return error.error?.message || error.message || 'Something went wrong';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function actionIcon(action?: string): string {
  switch (action) {
    case 'task_completed':
      return 'bi-check2-circle';
    case 'task_created':
      return 'bi-plus-circle';
    case 'task_status_changed':
    case 'task_updated':
      return 'bi-arrow-repeat';
    case 'milestone_submitted':
      return 'bi-send-check';
    case 'milestone_reviewed':
      return 'bi-clipboard-check';
    case 'feedback_given':
      return 'bi-chat-left-text';
    case 'file_uploaded':
      return 'bi-cloud-arrow-up';
    case 'member_added':
    case 'leader_assigned':
      return 'bi-person-plus';
    case 'project_created':
      return 'bi-folder-plus';
    case 'user_login':
      return 'bi-box-arrow-in-right';
    default:
      return 'bi-activity';
  }
}

export function roleHome(role?: string): string {
  return role ? '/dashboard' : '/login';
}

export function dateInputValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function projectStatusOptions(): string[] {
  return ['Planning', 'In Progress', 'For Review', 'Revision Required', 'Completed', 'Archived'];
}

export function taskStatusOptions(): string[] {
  return ['To Do', 'In Progress', 'For Review', 'Completed', 'Overdue'];
}
