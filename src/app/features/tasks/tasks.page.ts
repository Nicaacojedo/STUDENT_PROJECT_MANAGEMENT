import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import {
  Project,
  ProjectMember,
  Task,
  TaskAttachment,
  TaskComment,
} from '../../core/models';
import {
  apiError,
  dateInputValue,
  daysLabel,
  downloadBlob,
  fileIcon,
  fileKind,
  fileSize,
  formatDate,
  formatDateTime,
  relativeTime,
  taskStatusOptions,
} from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { EmptyStateComponent } from '../../shared/empty-state';
import { ModalComponent } from '../../shared/modal';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

interface KanbanColumn {
  key: string;
  label: string;
  icon: string;
  hint: string;
  auto?: boolean;
}

interface TaskDetail {
  task: Task;
  project: { id: number; title: string; canManage: boolean };
}

const TASK_COLUMNS: KanbanColumn[] = [
  { key: 'To Do', label: 'To Do', icon: 'bi-circle', hint: 'Ready to start' },
  { key: 'In Progress', label: 'In Progress', icon: 'bi-play-circle', hint: 'Currently being worked on' },
  { key: 'For Review', label: 'For Review', icon: 'bi-eye', hint: 'Waiting for feedback' },
  { key: 'Completed', label: 'Completed', icon: 'bi-check2-circle', hint: 'Done and verified' },
  { key: 'Overdue', label: 'Overdue', icon: 'bi-exclamation-triangle', hint: 'Auto-flagged by deadline', auto: true },
];

@Component({
  selector: 'app-tasks',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AvatarComponent,
    EmptyStateComponent,
    ModalComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header title="Tasks" subtitle="Plan, assign, and track every piece of work across your projects.">
      @if (canCreate()) {
        <button type="button" class="btn btn-primary" (click)="openCreate()">
          <i class="bi bi-plus-lg"></i> New task
        </button>
      }
    </app-page-header>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else {
      <div class="summary-strip">
        <div><strong>{{ tasks().length }}</strong><span class="text-muted-sm">Visible tasks</span></div>
        <div><strong>{{ countEffective('In Progress') }}</strong><span class="text-muted-sm">In progress</span></div>
        <div><strong>{{ countEffective('For Review') }}</strong><span class="text-muted-sm">For review</span></div>
        <div><strong>{{ countEffective('Overdue') }}</strong><span class="text-muted-sm">Overdue</span></div>
        <div><strong>{{ countEffective('Completed') }}</strong><span class="text-muted-sm">Completed</span></div>
      </div>

      <div class="filter-bar mt-3">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input
            type="search"
            placeholder="Search task title, description, category..."
            [value]="search()"
            (input)="search.set(readValue($event))"
          />
        </div>
        <select class="form-select" style="max-width:220px" [value]="projectFilter()" (change)="changeProject(readValue($event))">
          <option value="All">All projects</option>
          @for (project of projects(); track project.id) {
            <option [value]="project.id">{{ project.title }}</option>
          }
        </select>
        <select class="form-select" style="max-width:160px" [value]="statusFilter()" (change)="statusFilter.set(readValue($event))">
          <option value="All">All statuses</option>
          @for (column of columns; track column.key) {
            <option [value]="column.key">{{ column.label }}</option>
          }
        </select>
        <select class="form-select" style="max-width:150px" [value]="priorityFilter()" (change)="priorityFilter.set(readValue($event))">
          <option value="All">All priorities</option>
          @for (priority of priorities; track priority) {
            <option [value]="priority">{{ priority }}</option>
          }
        </select>
        <select class="form-select" style="max-width:160px" [value]="assigneeFilter()" (change)="assigneeFilter.set(readValue($event))">
          <option value="All">Anyone</option>
          <option value="me">Assigned to me</option>
          @for (person of people(); track person.id) {
            <option [value]="person.id">{{ person.name }}</option>
          }
        </select>
        <select class="form-select" style="max-width:160px" [value]="sort()" (change)="sort.set(readValue($event))">
          <option value="deadline">Nearest deadline</option>
          <option value="priority">Priority</option>
          <option value="updated">Recently updated</option>
          <option value="created">Newest</option>
          <option value="title">Title A–Z</option>
        </select>
        <div class="view-toggle ms-auto">
          <button type="button" [class.active]="view() === 'kanban'" (click)="view.set('kanban')" aria-label="Kanban view">
            <i class="bi bi-kanban"></i>
          </button>
          <button type="button" [class.active]="view() === 'list'" (click)="view.set('list')" aria-label="List view">
            <i class="bi bi-table"></i>
          </button>
        </div>
      </div>

      @if (view() === 'kanban') {
        <div class="kanban-board mt-3">
          @for (column of columns; track column.key) {
            <section
              class="kanban-column"
              [class.drag-over]="dragOver() === column.key && !column.auto"
              (dragover)="onDragOver($event, column)"
              (dragleave)="onDragLeave(column)"
              (drop)="onDrop($event, column)"
            >
              <div class="kanban-head">
                <span class="hstack-8">
                  <i [class]="'bi ' + column.icon"></i>
                  <strong>{{ column.label }}</strong>
                </span>
                <span class="count">{{ columnTasks(column.key).length }}</span>
              </div>
              <div class="text-muted-sm" style="margin:-4px 0 8px 2px">{{ column.hint }}</div>
              <div class="kanban-cards">
                @for (task of columnTasks(column.key); track task.id) {
                  <article
                    class="task-card"
                    draggable="true"
                    (dragstart)="onDragStart(task, $event)"
                    (dragend)="dragId.set(null)"
                    (click)="openDetail(task)"
                  >
                    <div class="hstack-8 justify-content-between">
                      <app-status-badge [label]="task.priority" [tone]="priorityTone(task.priority)" />
                      @if (task.deadline) {
                        <span class="text-muted-sm" [class.text-danger]="task.isOverdue">
                          <i class="bi bi-calendar3 me-1"></i>{{ date(task.deadline) }}
                        </span>
                      }
                    </div>
                    <h4>{{ task.title }}</h4>
                    <div class="text-muted-sm text-truncate">{{ projectName(task) }}</div>
                    <div class="task-meta">
                      <span class="due" [class.overdue]="task.isOverdue">
                        <i class="bi bi-clock me-1"></i>{{ daysText(task) }}
                      </span>
                      <span class="hstack-8">
                        @if (task.commentCount) {
                          <span><i class="bi bi-chat-left-text me-1"></i>{{ task.commentCount }}</span>
                        }
                        @if (task.attachmentCount) {
                          <span><i class="bi bi-paperclip me-1"></i>{{ task.attachmentCount }}</span>
                        }
                      </span>
                    </div>
                    <div class="hstack-8 justify-content-between mt-2">
                      <div class="avatar-stack">
                        @for (person of (task.assignees || []).slice(0, 3); track person.id) {
                          <app-avatar [name]="person.name" [color]="person.avatarColor || '#274b8f'" size="sm" />
                        }
                        @if (!task.assignees?.length) {
                          <span class="text-muted-sm">Unassigned</span>
                        }
                      </div>
                      <i class="bi bi-chevron-right text-muted-sm"></i>
                    </div>
                  </article>
                } @empty {
                  <div class="kanban-empty">
                    <i [class]="'bi ' + column.icon"></i>
                    <span>No tasks here</span>
                  </div>
                }
              </div>
            </section>
          }
        </div>
        <p class="text-muted-sm mt-2" style="font-size:11.5px">
          <i class="bi bi-info-circle me-1"></i>Drag cards between columns to update status. The Overdue column is generated automatically from deadlines.
        </p>
      } @else {
        @if (!filtered().length) {
          <app-empty-state icon="bi-list-check" title="No tasks found" message="Adjust your filters or create a new task to get started." />
        } @else {
          <div class="panel table-panel mt-3">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Assignees</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th style="text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (task of filtered(); track task.id) {
                    <tr>
                      <td>
                        <button type="button" class="cell-title link-button" (click)="openDetail(task)">{{ task.title }}</button>
                        <div class="cell-sub">{{ task.category || 'General' }}</div>
                      </td>
                      <td>{{ projectName(task) }}</td>
                      <td>
                        <div class="avatar-stack">
                          @for (person of (task.assignees || []).slice(0, 3); track person.id) {
                            <app-avatar [name]="person.name" [color]="person.avatarColor || '#274b8f'" size="sm" />
                          }
                          @if (!task.assignees?.length) {
                            <span class="text-muted-sm">Unassigned</span>
                          }
                        </div>
                      </td>
                      <td><app-status-badge [label]="task.priority" [tone]="priorityTone(task.priority)" /></td>
                      <td><app-status-badge [label]="effectiveStatus(task)" /></td>
                      <td>
                        <div>{{ date(task.deadline) }}</div>
                        <div class="cell-sub" [class.text-danger]="task.isOverdue">{{ daysText(task) }}</div>
                      </td>
                      <td>
                        <div class="hstack-8 justify-content-end">
                          <button type="button" class="btn btn-soft btn-sm" title="Open task" (click)="openDetail(task)">
                            <i class="bi bi-arrow-right"></i>
                          </button>
                          @if (canDelete(task)) {
                            <button type="button" class="btn btn-danger-soft btn-sm" title="Delete task" (click)="remove(task)">
                              <i class="bi bi-trash3"></i>
                            </button>
                          }
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
    }

    <app-modal [open]="formOpen()" [title]="editingId() ? 'Edit task' : 'New task'" subtitle="Assign work, set a priority, and keep the deadline realistic." size="lg" (close)="closeForm()">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="grid-2">
          <div>
            <label class="form-label">Project <span class="text-danger">*</span></label>
            <select class="form-select" formControlName="projectId" (change)="onProjectChange()">
              <option value="">Select a project</option>
              @for (project of projects(); track project.id) {
                <option [value]="project.id">{{ project.title }}</option>
              }
            </select>
            @if (form.controls.projectId.touched && form.controls.projectId.invalid) {
              <div class="form-error">Choose the project this task belongs to.</div>
            }
          </div>
          <div>
            <label class="form-label">Category</label>
            <input class="form-control" formControlName="category" placeholder="e.g. Frontend, Research, Documentation" />
          </div>
        </div>

        <div class="mt-2">
          <label class="form-label">Task title <span class="text-danger">*</span></label>
          <input class="form-control" formControlName="title" placeholder="What needs to be done?" maxlength="160" />
          @if (form.controls.title.touched && form.controls.title.invalid) {
            <div class="form-error">A task title of at least 3 characters is required.</div>
          }
        </div>

        <div class="mt-2">
          <label class="form-label">Description</label>
          <textarea class="form-control" rows="3" formControlName="description" placeholder="Add context, acceptance criteria, or links."></textarea>
        </div>

        <div class="grid-3 mt-2">
          <div>
            <label class="form-label">Priority</label>
            <select class="form-select" formControlName="priority">
              @for (priority of priorities; track priority) {
                <option [value]="priority">{{ priority }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label">Status</label>
            <select class="form-select" formControlName="status">
              @for (status of statusOptions; track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
          </div>
          <div>
            <label class="form-label">Start date</label>
            <input type="date" class="form-control" formControlName="startDate" />
          </div>
        </div>

        <div class="grid-2 mt-2">
          <div>
            <label class="form-label">Deadline</label>
            <input type="date" class="form-control" formControlName="deadline" />
          </div>
          <div>
            <label class="form-label">Assign to team members</label>
            @if (!members().length) {
              <div class="text-muted-sm" style="padding-top:9px">
                {{ form.controls.projectId.value ? 'No members found for this project.' : 'Select a project first.' }}
              </div>
            } @else {
              <div class="assignee-picker">
                @for (person of members(); track person.id) {
                  <label class="assignee-option">
                    <input
                      type="checkbox"
                      [checked]="isAssigned(person.id)"
                      (change)="toggleAssignee(person.id, $event)"
                    />
                    <app-avatar [name]="person.name" [color]="person.avatarColor || '#274b8f'" size="sm" />
                    <span>
                      <strong>{{ person.name }}</strong>
                      <small>{{ person.roleInProject }}</small>
                    </span>
                  </label>
                }
              </div>
            }
          </div>
        </div>

        @if (formError()) {
          <div class="alert alert-danger py-2 px-3 mt-2" style="font-size:12.5px">{{ formError() }}</div>
        }
      </form>

      <div modalFooter class="hstack-8 justify-content-end w-100">
        <button type="button" class="btn btn-soft" (click)="closeForm()">Cancel</button>
        <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">
          @if (saving()) {
            <span class="spinner-border spinner-border-sm me-1"></span> Saving...
          } @else {
            <i class="bi bi-check2"></i> {{ editingId() ? 'Save changes' : 'Create task' }}
          }
        </button>
      </div>
    </app-modal>

    <app-modal [open]="detailOpen()" [title]="detail()?.task?.title || 'Task'" [subtitle]="detail()?.project?.title || ''" size="xl" [hideFooter]="true" (close)="closeDetail()">
      @if (detail(); as current) {
        <div class="hstack-8 justify-content-between flex-wrap">
          <div class="hstack-8">
            <app-status-badge [label]="current.task.priority" [tone]="priorityTone(current.task.priority)" />
            <app-status-badge [label]="effectiveStatus(current.task)" />
            @if (current.task.category) {
              <span class="badge-soft tone-gray">{{ current.task.category }}</span>
            }
          </div>
          <div class="hstack-8">
            <select class="form-select form-select-sm" style="width:150px" [value]="current.task.status" (change)="changeStatus(current.task, readValue($event))">
              @for (status of statusOptions; track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
            <button type="button" class="btn btn-soft btn-sm" (click)="editTask(current.task)"><i class="bi bi-pencil"></i> Edit</button>
            @if (canDelete(current.task)) {
              <button type="button" class="btn btn-danger-soft btn-sm" (click)="remove(current.task)">
                <i class="bi bi-trash3"></i> Delete
              </button>
            }
            <button type="button" class="icon-btn" aria-label="Close" (click)="closeDetail()"><i class="bi bi-x-lg"></i></button>
          </div>
        </div>

        <div class="detail-grid mt-3">
          <div>
            <div class="panel">
              <div class="panel-body">
                <h4 style="font-size:13px;margin:0 0 6px">Description</h4>
                <p style="font-size:13px;color:var(--muted);white-space:pre-line;margin:0">
                  {{ current.task.description || 'No description was provided for this task.' }}
                </p>
              </div>
            </div>

            <div class="panel mt-3">
              <div class="panel-head">
                <div>
                  <h3>Comments</h3>
                  <div class="sub">{{ comments().length }} comment{{ comments().length === 1 ? '' : 's' }}</div>
                </div>
              </div>
              <div class="panel-body" style="padding-top:6px">
                <div class="comment-list">
                  @for (comment of comments(); track comment.id) {
                    <div class="comment-item">
                      <app-avatar [name]="comment.user.name" [color]="comment.user.avatarColor || '#274b8f'" size="sm" />
                      <div class="comment-body">
                        <div class="meta">
                          <strong>{{ comment.user.name }}</strong>
                          <span class="time">{{ relative(comment.createdAt) }}</span>
                        </div>
                        <p>{{ comment.comment }}</p>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-muted-sm" style="padding:8px 0">No comments yet. Start the conversation below.</div>
                  }
                </div>

                <div class="mt-2">
                  <textarea
                    class="form-control"
                    rows="2"
                    placeholder="Write a comment for the team..."
                    [value]="newComment()"
                    (input)="newComment.set(readValue($event))"
                  ></textarea>
                  <div class="hstack-8 justify-content-end mt-2">
                    <button type="button" class="btn btn-primary btn-sm" [disabled]="!newComment().trim() || commenting()" (click)="addComment()">
                      @if (commenting()) {
                        <span class="spinner-border spinner-border-sm me-1"></span>
                      } @else {
                        <i class="bi bi-send"></i>
                      }
                      Post comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="panel">
              <div class="panel-head"><div><h3>Task details</h3></div></div>
              <div class="panel-body" style="padding-top:8px">
                <dl class="detail-list">
                  <div><dt>Project</dt><dd><a [routerLink]="['/projects', current.project.id]">{{ current.project.title }}</a></dd></div>
                  <div><dt>Created by</dt><dd>{{ current.task.createdBy?.name || 'Unknown' }}</dd></div>
                  <div><dt>Start date</dt><dd>{{ date(current.task.startDate) }}</dd></div>
                  <div><dt>Deadline</dt><dd>{{ date(current.task.deadline) }}</dd></div>
                  <div><dt>Time left</dt><dd [class.text-danger]="current.task.isOverdue">{{ daysText(current.task) }}</dd></div>
                  <div><dt>Last updated</dt><dd>{{ relative(current.task.updatedAt) }}</dd></div>
                  <div><dt>Completed</dt><dd>{{ current.task.completedAt ? date(current.task.completedAt) : 'Not yet' }}</dd></div>
                </dl>

                <h4 style="font-size:12px;margin:14px 0 6px">Assignees</h4>
                @for (person of current.task.assignees || []; track person.id) {
                  <div class="hstack-8" style="padding:5px 0">
                    <app-avatar [name]="person.name" [color]="person.avatarColor || '#274b8f'" size="sm" />
                    <div>
                      <div style="font-size:12px;font-weight:600">{{ person.name }}</div>
                      <div class="text-muted-sm">{{ person.email }}</div>
                    </div>
                  </div>
                } @empty {
                  <div class="text-muted-sm">No one is assigned yet.</div>
                }
              </div>
            </div>

            <div class="panel mt-3">
              <div class="panel-head">
                <div>
                  <h3>Attachments</h3>
                  <div class="sub">{{ attachments().length }} file{{ attachments().length === 1 ? '' : 's' }}</div>
                </div>
                <button type="button" class="btn btn-soft btn-sm" [disabled]="uploading()" (click)="picker.click()">
                  <i class="bi bi-paperclip"></i> Attach
                </button>
                <input #picker type="file" hidden (change)="uploadAttachment($event)" />
              </div>
              <div class="panel-body" style="padding-top:8px">
                @for (attachment of attachments(); track attachment.id) {
                  <div class="file-row">
                    <span [class]="'file-icon ' + attachmentKind(attachment)">
                      <i [class]="'bi ' + attachmentIcon(attachment)"></i>
                    </span>
                    <div class="file-meta">
                      <strong>{{ attachment.fileName }}</strong>
                      <span>{{ attachmentSize(attachment) }} · {{ attachment.uploadedBy }} · {{ date(attachment.createdAt) }}</span>
                    </div>
                    <div class="file-actions">
                      <button type="button" class="btn btn-soft btn-sm" title="Download" (click)="downloadAttachment(attachment)">
                        <i class="bi bi-download"></i>
                      </button>
                      @if (canDeleteAttachment(attachment)) {
                        <button type="button" class="btn btn-danger-soft btn-sm" title="Delete" (click)="deleteAttachment(attachment)">
                          <i class="bi bi-trash3"></i>
                        </button>
                      }
                    </div>
                  </div>
                } @empty {
                  <div class="empty-state" style="padding:24px 8px">
                    <i class="bi bi-paperclip"></i>
                    <strong>No attachments</strong>
                    <p>Attach screenshots, drafts, or evidence for this task.</p>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </app-modal>
  `,
})
export class TasksPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly tasks = signal<Task[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly members = signal<ProjectMember[]>([]);
  readonly loading = signal(true);
  readonly view = signal<'kanban' | 'list'>('kanban');
  readonly search = signal('');
  readonly projectFilter = signal(this.route.snapshot.queryParamMap.get('projectId') || 'All');
  readonly statusFilter = signal('All');
  readonly priorityFilter = signal('All');
  readonly assigneeFilter = signal('All');
  readonly sort = signal('deadline');
  readonly dragOver = signal<string | null>(null);
  readonly dragId = signal<number | null>(null);

  readonly formOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');

  readonly detailOpen = signal(false);
  readonly detail = signal<TaskDetail | null>(null);
  readonly comments = signal<TaskComment[]>([]);
  readonly attachments = signal<TaskAttachment[]>([]);
  readonly newComment = signal('');
  readonly commenting = signal(false);
  readonly uploading = signal(false);

  readonly columns = TASK_COLUMNS;
  readonly priorities = ['Low', 'Medium', 'High', 'Urgent'];
  readonly statusOptions = taskStatusOptions();

  readonly canCreate = computed(() => this.auth.isStudent() || this.auth.isAdmin());

  private pendingNew = false;

  readonly form = this.fb.group({
    projectId: ['', Validators.required],
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(160)]],
    description: [''],
    category: [''],
    priority: ['Medium', Validators.required],
    status: ['To Do', Validators.required],
    startDate: [''],
    deadline: [''],
    assigneeIds: this.fb.nonNullable.control<number[]>([]),
  });

  readonly people = computed(() => {
    const map = new Map<number, { id: number; name: string }>();
    for (const task of this.tasks()) {
      for (const person of task.assignees || []) {
        if (!map.has(person.id)) map.set(person.id, { id: person.id, name: person.name });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const priority = this.priorityFilter();
    const assignee = this.assigneeFilter();
    const me = this.auth.user()?.id;

    const list = this.tasks().filter((task) => {
      const matchesTerm =
        !term ||
        [task.title, task.description, task.category, task.projectTitle]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = status === 'All' || this.effectiveStatus(task) === status;
      const matchesPriority = priority === 'All' || task.priority === priority;
      const matchesAssignee =
        assignee === 'All' ||
        (assignee === 'me'
          ? (task.assignees || []).some((person) => person.id === me)
          : (task.assignees || []).some((person) => person.id === Number(assignee)));
      return matchesTerm && matchesStatus && matchesPriority && matchesAssignee;
    });

    return [...list].sort((a, b) => {
      switch (this.sort()) {
        case 'priority':
          return this.priorityRank(a.priority) - this.priorityRank(b.priority);
        case 'updated':
          return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        case 'created':
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return (a.deadline || '9999').localeCompare(b.deadline || '9999');
      }
    });
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadTasks();
    this.route.queryParamMap.subscribe((params) => {
      const projectId = params.get('projectId');
      if (projectId && projectId !== this.projectFilter()) {
        this.projectFilter.set(projectId);
        this.loadTasks();
      }
      const taskId = Number(params.get('task'));
      if (taskId) this.openDetailById(taskId);
      if (params.get('new') === '1') {
        if (this.projects().length) this.openCreate();
        else this.pendingNew = true;
      }
    });
  }

  loadProjects(): void {
    this.api.get<{ projects: Project[] }>('/projects').subscribe({
      next: (response) => {
        this.projects.set(response.projects);
        if (this.pendingNew) {
          this.pendingNew = false;
          this.openCreate();
        }
      },
    });
  }

  loadTasks(): void {
    this.loading.set(true);
    const projectId = this.projectFilter();
    this.api.get<{ tasks: Task[] }>('/tasks', { projectId: projectId === 'All' ? undefined : projectId }).subscribe({
      next: (response) => {
        this.tasks.set(response.tasks);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  changeProject(value: string): void {
    this.projectFilter.set(value);
    this.loadTasks();
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  effectiveStatus(task: Task): string {
    if (task.status !== 'Completed' && (task.status === 'Overdue' || task.isOverdue)) return 'Overdue';
    return task.status;
  }

  columnTasks(status: string): Task[] {
    return this.filtered().filter((task) => this.effectiveStatus(task) === status);
  }

  countEffective(status: string): number {
    return this.tasks().filter((task) => this.effectiveStatus(task) === status).length;
  }

  projectName(task: Task): string {
    return task.projectTitle || this.projects().find((project) => project.id === task.projectId)?.title || 'Project';
  }

  priorityRank(priority: string): number {
    return ['Urgent', 'High', 'Medium', 'Low'].indexOf(priority);
  }

  priorityTone(priority: string): string {
    switch (priority) {
      case 'Urgent':
        return 'tone-red';
      case 'High':
        return 'tone-amber';
      case 'Medium':
        return 'tone-blue';
      default:
        return 'tone-slate';
    }
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  relative(value?: string | null): string {
    return relativeTime(value);
  }

  daysText(task: Task): string {
    return task.status === 'Completed' ? 'Completed' : daysLabel(task.daysLeft, task.status);
  }

  canDelete(task: Task): boolean {
    if (task.createdBy?.id && task.createdBy.id === this.auth.user()?.id) return true;
    const project = this.projects().find((item) => item.id === task.projectId);
    return !!project?.canManage || this.auth.isAdmin();
  }

  onDragStart(task: Task, event: DragEvent): void {
    this.dragId.set(task.id);
    event.dataTransfer?.setData('text/plain', String(task.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  onDragOver(event: DragEvent, column: KanbanColumn): void {
    if (column.auto) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOver.set(column.key);
  }

  onDragLeave(column: KanbanColumn): void {
    if (this.dragOver() === column.key) this.dragOver.set(null);
  }

  onDrop(event: DragEvent, column: KanbanColumn): void {
    event.preventDefault();
    this.dragOver.set(null);
    if (column.auto) {
      this.toast.info('Overdue is set automatically from the deadline. Extend the deadline instead.');
      return;
    }
    const id = Number(event.dataTransfer?.getData('text/plain')) || this.dragId();
    const task = this.tasks().find((item) => item.id === id);
    this.dragId.set(null);
    if (!task || task.status === column.key) return;
    this.applyStatus(task, column.key);
  }

  applyStatus(task: Task, status: string): void {
    this.api.patch<{ task: Task }>(`/tasks/${task.id}/status`, { status }).subscribe({
      next: (response) => {
        this.tasks.update((list) => list.map((item) => (item.id === task.id ? { ...item, ...response.task } : item)));
        if (this.detail()?.task.id === task.id) {
          this.detail.update((current) => (current ? { ...current, task: { ...current.task, ...response.task } } : current));
        }
        this.toast.success(`Task moved to ${status}.`);
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  changeStatus(task: Task, status: string): void {
    if (!status || status === task.status) return;
    this.applyStatus(task, status);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.members.set([]);
    this.form.reset({
      projectId: this.projectFilter() !== 'All' ? this.projectFilter() : '',
      title: '',
      description: '',
      category: '',
      priority: 'Medium',
      status: 'To Do',
      startDate: '',
      deadline: '',
      assigneeIds: [],
    });
    if (this.form.controls.projectId.value) this.onProjectChange();
    this.formOpen.set(true);
  }

  editTask(task: Task): void {
    this.detailOpen.set(false);
    this.editingId.set(task.id);
    this.formError.set('');
    this.form.reset({
      projectId: String(task.projectId || ''),
      title: task.title,
      description: task.description || '',
      category: task.category || '',
      priority: task.priority,
      status: task.status,
      startDate: dateInputValue(task.startDate),
      deadline: dateInputValue(task.deadline),
      assigneeIds: (task.assignees || []).map((person) => person.id),
    });
    this.onProjectChange(false);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.saving.set(false);
  }

  onProjectChange(clearAssignees = true): void {
    const projectId = Number(this.form.controls.projectId.value);
    if (!projectId) {
      this.members.set([]);
      return;
    }
    if (clearAssignees) this.form.controls.assigneeIds.setValue([]);
    this.api.get<{ members: ProjectMember[] }>(`/projects/${projectId}`).subscribe({
      next: (response) => this.members.set(response.members),
      error: () => this.members.set([]),
    });
  }

  isAssigned(id: number): boolean {
    return this.form.controls.assigneeIds.value.includes(id);
  }

  toggleAssignee(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = this.form.controls.assigneeIds.value;
    this.form.controls.assigneeIds.setValue(checked ? [...current, id] : current.filter((value) => value !== id));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Please fix the highlighted fields before saving.');
      return;
    }
    const value = this.form.getRawValue();
    const payload = {
      projectId: Number(value.projectId),
      title: (value.title ?? '').trim(),
      description: value.description?.trim() || null,
      category: value.category?.trim() || null,
      priority: value.priority,
      status: value.status,
      startDate: value.startDate || null,
      deadline: value.deadline || null,
      assigneeIds: value.assigneeIds,
    };
    if (payload.startDate && payload.deadline && payload.startDate > payload.deadline) {
      this.formError.set('The deadline must be on or after the start date.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const editing = this.editingId();
    const request = editing
      ? this.api.put<{ task: Task }>(`/tasks/${editing}`, payload)
      : this.api.post<{ task: Task }>('/tasks', payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success(editing ? 'Task updated.' : 'Task created.');
        this.loadTasks();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(apiError(error));
      },
    });
  }

  openDetail(task: Task): void {
    this.openDetailById(task.id);
  }

  openDetailById(id: number): void {
    this.api.get<{ task: Task; project: TaskDetail['project']; comments: TaskComment[]; attachments: TaskAttachment[] }>(`/tasks/${id}`).subscribe({
      next: (response) => {
        this.detail.set({ task: response.task, project: response.project });
        this.comments.set(response.comments);
        this.attachments.set(response.attachments);
        this.newComment.set('');
        this.detailOpen.set(true);
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  closeDetail(): void {
    this.detailOpen.set(false);
  }

  addComment(): void {
    const current = this.detail();
    const text = this.newComment().trim();
    if (!current || !text) return;
    this.commenting.set(true);
    this.api.post<{ comment: TaskComment }>(`/tasks/${current.task.id}/comments`, { comment: text }).subscribe({
      next: (response) => {
        this.commenting.set(false);
        this.newComment.set('');
        this.comments.update((list) => [...list, response.comment]);
        this.toast.success('Comment posted.');
      },
      error: (error) => {
        this.commenting.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  uploadAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const current = this.detail();
    input.value = '';
    if (!file || !current) return;
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('Attachments must be 10 MB or smaller.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    this.uploading.set(true);
    this.api.upload<{ attachment: TaskAttachment }>(`/tasks/${current.task.id}/attachments`, form).subscribe({
      next: (response) => {
        this.uploading.set(false);
        this.attachments.update((list) => [response.attachment, ...list]);
        this.tasks.update((list) =>
          list.map((task) =>
            task.id === current.task.id ? { ...task, attachmentCount: (task.attachmentCount || 0) + 1 } : task
          )
        );
        this.toast.success('Attachment uploaded.');
      },
      error: (error) => {
        this.uploading.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  downloadAttachment(attachment: TaskAttachment): void {
    this.api.download(`/task-attachments/${attachment.id}/download`).subscribe({
      next: (blob) => downloadBlob(blob, attachment.fileName),
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  canDeleteAttachment(attachment: TaskAttachment): boolean {
    return this.detail()?.project.canManage || attachment.uploadedBy === this.auth.user()?.name;
  }

  async deleteAttachment(attachment: TaskAttachment): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete attachment?',
      message: `"${attachment.fileName}" will be removed from this task.`,
      confirmLabel: 'Delete file',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/task-attachments/${attachment.id}`).subscribe({
      next: () => {
        this.attachments.update((list) => list.filter((item) => item.id !== attachment.id));
        const current = this.detail();
        if (current) {
          this.tasks.update((list) =>
            list.map((task) =>
              task.id === current.task.id ? { ...task, attachmentCount: Math.max(0, (task.attachmentCount || 0) - 1) } : task
            )
          );
        }
        this.toast.success('Attachment deleted.');
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  async remove(task: Task): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete task?',
      message: `"${task.title}" and all of its comments, attachments, and contribution points will be deleted.`,
      confirmLabel: 'Delete task',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/tasks/${task.id}`).subscribe({
      next: () => {
        this.detailOpen.set(false);
        this.toast.success('Task deleted.');
        this.loadTasks();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  attachmentKind(attachment: TaskAttachment): string {
    return fileKind(attachment.fileType || attachment.fileName);
  }

  attachmentIcon(attachment: TaskAttachment): string {
    return fileIcon(this.attachmentKind(attachment));
  }

  attachmentSize(attachment: TaskAttachment): string {
    return fileSize(attachment.fileSize);
  }

  detailDate(value?: string | null): string {
    return formatDateTime(value);
  }
}
