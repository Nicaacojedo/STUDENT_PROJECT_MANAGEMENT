import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Project, ProjectMember } from '../../core/models';
import { formatDate } from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { EmptyStateComponent } from '../../shared/empty-state';
import { ModalComponent } from '../../shared/modal';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

interface TeamProjectRef {
  id: number;
  title: string;
  role: string;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  avatarColor: string;
  section?: string | null;
  program?: string | null;
  studentNumber?: string | null;
  role: string;
  points: number;
  joinedAt?: string;
  projects: TeamProjectRef[];
}

@Component({
  selector: 'app-team',
  imports: [
    AvatarComponent,
    EmptyStateComponent,
    ModalComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header title="Team Members" subtitle="Everyone collaborating across the projects you can access." />

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else {
      <div class="stat-grid">
        <div class="stat-card tone-blue">
          <div class="stat-icon"><i class="bi bi-people"></i></div>
          <div class="stat-label">Unique members</div>
          <div class="stat-value">{{ members().length }}</div>
          <div class="stat-hint">Across {{ projects().length }} project{{ projects().length === 1 ? '' : 's' }}</div>
        </div>
        <div class="stat-card tone-violet">
          <div class="stat-icon"><i class="bi bi-star"></i></div>
          <div class="stat-label">Team leaders</div>
          <div class="stat-value">{{ leaderCount() }}</div>
          <div class="stat-hint">Leading at least one project</div>
        </div>
        <div class="stat-card tone-teal">
          <div class="stat-icon"><i class="bi bi-diagram-3"></i></div>
          <div class="stat-label">Sections represented</div>
          <div class="stat-value">{{ sectionCount() }}</div>
          <div class="stat-hint">Student sections in your teams</div>
        </div>
        <div class="stat-card tone-green">
          <div class="stat-icon"><i class="bi bi-award"></i></div>
          <div class="stat-label">Contribution points</div>
          <div class="stat-value">{{ totalPoints() }}</div>
          <div class="stat-hint">Recorded across accessible projects</div>
        </div>
      </div>

      <div class="filter-bar mt-3">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input
            type="search"
            placeholder="Search name, email, section..."
            [value]="search()"
            (input)="search.set(readValue($event))"
          />
        </div>
        <select class="form-select" style="max-width:240px" [value]="projectFilter()" (change)="projectFilter.set(readValue($event))">
          <option value="All">All projects</option>
          @for (project of projects(); track project.id) {
            <option [value]="project.id">{{ project.title }}</option>
          }
        </select>
        <select class="form-select" style="max-width:160px" [value]="roleFilter()" (change)="roleFilter.set(readValue($event))">
          <option value="All">All roles</option>
          <option value="Leader">Team leaders</option>
          <option value="Member">Members</option>
        </select>
      </div>

      @if (!filtered().length) {
        <app-empty-state icon="bi-people" title="No team members found" message="Try a different project or search term." />
      } @else {
        <div class="panel table-panel mt-3">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Section / Program</th>
                  <th>Projects</th>
                  <th>Role</th>
                  <th>Contribution</th>
                  <th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (member of filtered(); track member.id) {
                  <tr>
                    <td>
                      <div class="hstack-8">
                        <app-avatar [name]="member.name" [color]="member.avatarColor" />
                        <div>
                          <div class="cell-title">{{ member.name }}</div>
                          <div class="cell-sub">{{ member.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{{ member.section || '—' }}</div>
                      <div class="cell-sub">{{ member.program || 'No program' }}</div>
                    </td>
                    <td>
                      <div class="chip-list">
                        @for (project of member.projects; track project.id) {
                          <span class="badge-soft tone-gray">{{ project.title }}</span>
                        }
                      </div>
                    </td>
                    <td><app-status-badge [label]="member.role" [tone]="member.role === 'Leader' ? 'tone-violet' : 'tone-blue'" /></td>
                    <td style="min-width:150px">
                      <div class="hstack-8">
                        <div class="progress-track grow"><div class="fill" [style.width.%]="pointShare(member)"></div></div>
                        <span class="text-muted-sm">{{ member.points }} pts</span>
                      </div>
                    </td>
                    <td>
                      <div class="hstack-8 justify-content-end">
                        <button type="button" class="btn btn-soft btn-sm" (click)="openMember(member)">
                          <i class="bi bi-person-lines-fill"></i> Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }

    <app-modal [open]="!!selected()" title="Member profile" subtitle="Shared project responsibilities and contribution record." size="lg" [hideFooter]="true" (close)="selected.set(null)">
      @if (selected(); as member) {
        <div class="hstack-12">
          <app-avatar [name]="member.name" [color]="member.avatarColor" size="xl" />
          <div>
            <h3 style="margin:0;font-size:18px;color:var(--navy)">{{ member.name }}</h3>
            <div class="text-muted-sm">{{ member.email }}</div>
            <div class="hstack-8 mt-1">
              <app-status-badge [label]="member.role" [tone]="member.role === 'Leader' ? 'tone-violet' : 'tone-blue'" />
              <span class="badge-soft tone-gray">{{ member.studentNumber || 'No student number' }}</span>
            </div>
          </div>
        </div>

        <div class="grid-3 mt-3">
          <div class="detail-stat">
            <div class="value">{{ member.points }}</div>
            <div class="label">Contribution points</div>
          </div>
          <div class="detail-stat">
            <div class="value">{{ member.projects.length }}</div>
            <div class="label">Projects</div>
          </div>
          <div class="detail-stat">
            <div class="value">{{ member.section || '—' }}</div>
            <div class="label">Section</div>
          </div>
        </div>

        <div class="divider"></div>
        <h4 style="font-size:13px;margin:0 0 8px">Project roles</h4>
        @for (project of member.projects; track project.id) {
          <div class="info-row">
            <span>{{ project.title }}</span>
            <span>{{ project.role }}</span>
          </div>
        }

        <div class="mt-3">
          <h4 style="font-size:13px;margin:0 0 6px">Academic details</h4>
          <div class="info-row"><span>Program</span><span>{{ member.program || '—' }}</span></div>
          <div class="info-row"><span>Student number</span><span>{{ member.studentNumber || '—' }}</span></div>
          <div class="info-row"><span>Joined</span><span>{{ date(member.joinedAt) }}</span></div>
        </div>
      }
    </app-modal>
  `,
})
export class TeamPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly projects = signal<Project[]>([]);
  readonly members = signal<TeamMember[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly projectFilter = signal('All');
  readonly roleFilter = signal('All');
  readonly selected = signal<TeamMember | null>(null);

  readonly leaderCount = computed(() => this.members().filter((m) => m.role === 'Leader').length);
  readonly sectionCount = computed(() => new Set(this.members().map((m) => m.section).filter(Boolean)).size);
  readonly totalPoints = computed(() => this.members().reduce((sum, m) => sum + m.points, 0));

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const project = this.projectFilter();
    const role = this.roleFilter();
    return this.members()
      .filter((member) => {
        const matchesTerm =
          !term ||
          [member.name, member.email, member.section, member.program, member.studentNumber]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term));
        const matchesProject = project === 'All' || member.projects.some((item) => item.id === Number(project));
        const matchesRole = role === 'All' || member.role === role;
        return matchesTerm && matchesProject && matchesRole;
      })
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get<{ projects: Project[] }>('/projects').subscribe({
      next: (response) => {
        this.projects.set(response.projects);
        if (!response.projects.length) {
          this.members.set([]);
          this.loading.set(false);
          return;
        }
        const requests = response.projects.map((project) =>
          this.api.get<{ members: ProjectMember[] }>(`/projects/${project.id}`).pipe(
            catchError(() => of({ members: [] as ProjectMember[] }))
          )
        );
        forkJoin(requests).subscribe((results) => {
          const map = new Map<number, TeamMember>();
          results.forEach((result, index) => {
            const project = response.projects[index];
            for (const member of result.members) {
              if (!map.has(member.id)) {
                map.set(member.id, {
                  id: member.id,
                  name: member.name,
                  email: member.email,
                  avatarColor: member.avatarColor || '#274b8f',
                  section: member.section,
                  program: member.program,
                  studentNumber: member.studentNumber,
                  role: member.roleInProject,
                  points: 0,
                  joinedAt: member.joinedAt,
                  projects: [],
                });
              }
              const entry = map.get(member.id)!;
              entry.points += Number(member.contributionPoints || 0);
              entry.projects.push({ id: project.id, title: project.title, role: member.roleInProject });
              if (member.roleInProject === 'Leader') entry.role = 'Leader';
            }
          });
          this.members.set([...map.values()]);
          this.loading.set(false);
        });
      },
      error: () => this.loading.set(false),
    });
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  pointShare(member: TeamMember): number {
    const max = Math.max(1, ...this.members().map((item) => item.points));
    return Math.round((member.points / max) * 100);
  }

  openMember(member: TeamMember): void {
    this.selected.set(member);
  }
}
