import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { ApiService } from '../core/api.service';
import { AvatarComponent } from '../shared/avatar';
import { DeadlinesResponse, NotificationItem } from '../core/models';
import { relativeTime } from '../core/utils';

interface NavItem {
  label: string;
  icon?: string;
  link?: string;
  section?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, AvatarComponent],
  template: `
    <div class="app-shell">
      @if (mobileOpen()) {
        <div class="sidebar-backdrop" (click)="mobileOpen.set(false)"></div>
      }

      <aside class="sidebar" [class.open]="mobileOpen()">
        <div class="sidebar-brand">
          <span class="brand-mark"><i class="bi bi-mortarboard-fill"></i></span>
          <div class="brand-text">
            <strong>SPMS</strong>
            <span>Student Projects</span>
          </div>
          <button
            type="button"
            class="icon-btn d-lg-none ms-auto"
            style="color:#cfd8ea"
            aria-label="Close navigation"
            (click)="mobileOpen.set(false)"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <nav class="sidebar-nav">
          @for (item of nav(); track item.label) {
            @if (item.section) {
              <div class="sidebar-section-label">{{ item.label }}</div>
            } @else {
              <a
                class="sidebar-link"
                [routerLink]="item.link || '/'"
                [class.active]="isActive(item.link || '')"
                (click)="mobileOpen.set(false)"
              >
                <i [class]="'bi ' + item.icon"></i>
                <span>{{ item.label }}</span>
                @if (item.link === '/deadlines' && deadlinesCount() > 0) {
                  <span class="nav-count">{{ deadlinesCount() }}</span>
                }
              </a>
            }
          }
        </nav>

        <div class="sidebar-footer">
          <strong>{{ auth.user()?.name }}</strong><br />
          {{ auth.role() }} workspace<br />
          <span style="opacity:.7">Academic Year 2026–2027</span>
        </div>
      </aside>

      <div class="main-area">
        <header class="topbar">
          <button
            type="button"
            class="icon-btn d-lg-none"
            aria-label="Open navigation"
            (click)="mobileOpen.set(true)"
          >
            <i class="bi bi-list"></i>
          </button>

          <div class="topbar-search d-none d-md-block">
            <i class="bi bi-search"></i>
            <input
              type="search"
              placeholder="Search projects and tasks..."
              [value]="searchTerm()"
              (input)="searchTerm.set(readValue($event))"
              (keyup.enter)="submitSearch()"
            />
          </div>

          <div class="topbar-actions">
            <div class="dropdown-wrap">
              <button
                type="button"
                class="icon-btn"
                aria-label="Notifications"
                (click)="toggleNotifications()"
              >
                <i class="bi bi-bell"></i>
                @if (notifications.unread() > 0) {
                  <span class="dot"></span>
                }
              </button>

              @if (notifOpen()) {
                <div class="dropdown-panel">
                  <div class="dropdown-head">
                    <div>
                      <strong style="font-size:13px">Notifications</strong>
                      <div class="text-muted-sm">{{ notifications.unread() }} unread</div>
                    </div>
                    <button type="button" (click)="notifications.markAllRead()">Mark all read</button>
                  </div>
                  <div class="dropdown-list">
                    @for (item of notifications.items(); track item.id) {
                      <button
                        type="button"
                        class="dropdown-item"
                        [class.unread]="!item.isRead"
                        (click)="openNotification(item)"
                      >
                        <span class="notif-icon"><i [class]="'bi ' + notifIcon(item.type)"></i></span>
                        <span class="notif-body">
                          <strong>{{ item.title }}</strong>
                          <p>{{ item.message }}</p>
                          <span class="notif-time">{{ relative(item.createdAt) }}</span>
                        </span>
                      </button>
                    } @empty {
                      <div class="empty-state" style="padding: 30px 16px">
                        <i class="bi bi-bell-slash"></i>
                        <strong>No notifications</strong>
                        <p>You are all caught up.</p>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="dropdown-wrap">
              <button type="button" class="profile-btn" (click)="toggleProfile()">
                <app-avatar
                  [name]="auth.user()?.name || ''"
                  [color]="auth.user()?.avatarColor || '#24498f'"
                />
                <span class="profile-meta d-none d-sm-block">
                  <strong>{{ auth.user()?.name }}</strong>
                  <span>{{ auth.role() }}</span>
                </span>
                <i class="bi bi-chevron-down" style="font-size:11px;color:#8b96ab"></i>
              </button>

              @if (profileOpen()) {
                <div class="dropdown-panel slim">
                  <div class="dropdown-head">
                    <div>
                      <strong style="font-size:12.5px">{{ auth.user()?.name }}</strong>
                      <div class="text-muted-sm">{{ auth.user()?.email }}</div>
                    </div>
                  </div>
                  <div style="padding: 6px">
                    <a class="dropdown-menu-link" routerLink="/settings" (click)="profileOpen.set(false)">
                      <i class="bi bi-person-gear"></i> Profile &amp; settings
                    </a>
                    <a class="dropdown-menu-link" routerLink="/settings" fragment="password" (click)="profileOpen.set(false)">
                      <i class="bi bi-shield-lock"></i> Change password
                    </a>
                    <button type="button" class="dropdown-menu-link danger" (click)="signOut()">
                      <i class="bi bi-box-arrow-right"></i> Sign out
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </header>

        <div class="page-content">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            @for (crumb of crumbs(); track crumb.link; let last = $last) {
              @if (!last) {
                <a [routerLink]="crumb.link">{{ crumb.label }}</a>
                <span class="sep">/</span>
              } @else {
                <span class="current">{{ crumb.label }}</span>
              }
            }
          </nav>
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class ShellComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);

  readonly mobileOpen = signal(false);
  readonly notifOpen = signal(false);
  readonly profileOpen = signal(false);
  readonly searchTerm = signal('');
  readonly currentUrl = signal('/dashboard');
  readonly crumbs = signal<{ label: string; link: string }[]>([]);
  readonly deadlinesCount = signal(0);
  private subs = [] as { unsubscribe: () => void }[];
  private timer?: ReturnType<typeof setInterval>;

  readonly nav = signal<NavItem[]>([
    { label: 'Workspace', section: true },
    { label: 'Dashboard', icon: 'bi-grid-1x2', link: '/dashboard' },
    { label: 'Projects', icon: 'bi-folder2-open', link: '/projects' },
    { label: 'My Tasks', icon: 'bi-list-check', link: '/tasks' },
    { label: 'Team Members', icon: 'bi-people', link: '/team' },
    { label: 'Workload', icon: 'bi-speedometer2', link: '/workload' },
    { label: 'Contributions', icon: 'bi-bar-chart-steps', link: '/contributions' },
    { label: 'Deadlines', icon: 'bi-calendar2-check', link: '/deadlines' },
    { label: 'Files', icon: 'bi-folder-symlink', link: '/files' },
    { label: 'Feedback', icon: 'bi-chat-square-text', link: '/feedback' },
    { label: 'Reports', icon: 'bi-file-earmark-bar-graph', link: '/reports' },
    { label: 'Settings', icon: 'bi-gear', link: '/settings' },
  ]);

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      this.nav.update((items) => [
        ...items,
        { label: 'Administration', section: true },
        { label: 'User Management', icon: 'bi-person-badge', link: '/admin/users' },
        { label: 'Audit Logs', icon: 'bi-clock-history', link: '/admin/audit' },
      ]);
    }

    this.auth.loadMe().subscribe({ error: () => undefined });
    this.notifications.load();
    this.api.get<DeadlinesResponse>('/deadlines').subscribe({
      next: (response) => this.deadlinesCount.set(response.counts.overdue),
      error: () => undefined,
    });
    this.buildCrumbs(this.router.url);

    this.subs.push(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => {
          this.buildCrumbs(event.urlAfterRedirects);
          this.mobileOpen.set(false);
          this.notifOpen.set(false);
          this.profileOpen.set(false);
          window.scrollTo({ top: 0 });
        }),
    );

    this.timer = setInterval(() => this.notifications.load(), 60_000);
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
    if (this.timer) clearInterval(this.timer);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.dropdown-wrap')) {
      this.notifOpen.set(false);
      this.profileOpen.set(false);
    }
  }

  isActive(link: string): boolean {
    if (link === '/dashboard') return this.currentUrl() === '/dashboard' || this.currentUrl() === '/';
    return this.currentUrl() === link || this.currentUrl().startsWith(`${link}/`);
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  submitSearch(): void {
    const term = this.searchTerm().trim();
    this.router.navigate(['/projects'], { queryParams: term ? { q: term } : {} });
  }

  toggleNotifications(): void {
    this.profileOpen.set(false);
    this.notifOpen.update((open) => !open);
    if (this.notifOpen()) this.notifications.load();
  }

  toggleProfile(): void {
    this.notifOpen.set(false);
    this.profileOpen.update((open) => !open);
  }

  openNotification(item: NotificationItem): void {
    this.notifications.markRead(item);
    this.notifOpen.set(false);
    if (item.link) this.router.navigateByUrl(item.link);
  }

  signOut(): void {
    this.profileOpen.set(false);
    this.auth.logout();
  }

  notifIcon(type: string): string {
    switch (type) {
      case 'deadline':
        return 'bi-clock';
      case 'assignment':
      case 'task':
        return 'bi-check2-square';
      case 'feedback':
        return 'bi-chat-left-text';
      case 'submission':
        return 'bi-send-check';
      case 'file':
        return 'bi-file-earmark-arrow-up';
      case 'project':
        return 'bi-folder';
      default:
        return 'bi-bell';
    }
  }

  relative(value: string): string {
    return relativeTime(value);
  }

  private buildCrumbs(url: string): void {
    const path = url.split('?')[0];
    this.currentUrl.set(path || '/dashboard');
    const parts = path.split('/').filter(Boolean);
    const crumbs: { label: string; link: string }[] = [{ label: 'Dashboard', link: '/dashboard' }];
    let link = '';
    for (const part of parts) {
      link += `/${part}`;
      if (part === 'dashboard') {
        crumbs.length = 0;
        crumbs.push({ label: 'Dashboard', link: '/dashboard' });
        continue;
      }
      crumbs.push({ label: this.labelFor(part), link });
    }
    if (!parts.length) {
      crumbs.length = 0;
      crumbs.push({ label: 'Dashboard', link: '/dashboard' });
    }
    this.crumbs.set(crumbs);
    const last = crumbs[crumbs.length - 1];
    this.title.setTitle(`${last.label} | SPMS`);
  }

  private labelFor(segment: string): string {
    if (/^\d+$/.test(segment)) return 'Details';
    const map: Record<string, string> = {
      dashboard: 'Dashboard',
      projects: 'Projects',
      new: 'New Project',
      edit: 'Edit Project',
      tasks: 'My Tasks',
      team: 'Team Members',
      workload: 'Workload',
      contributions: 'Contributions',
      deadlines: 'Deadlines',
      files: 'File Management',
      feedback: 'Adviser Feedback',
      reports: 'Reports',
      settings: 'Settings',
      admin: 'Administration',
      users: 'User Management',
      audit: 'Audit Logs',
    };
    return map[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  }
}
