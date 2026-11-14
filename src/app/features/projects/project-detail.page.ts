import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import {
  ActivityItem,
  Feedback,
  Milestone,
  Project,
  ProjectFile,
  ProjectMember,
  StudentLookup,
  Task,
} from '../../core/models';
import {
  actionIcon,
  apiError,
  dateInputValue,
  daysLabel,
  formatDate,
  relativeTime,
  toneClass,
} from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { EmptyStateComponent } from '../../shared/empty-state';
import { FilePanelComponent } from '../../shared/file-panel';
import { ModalComponent } from '../../shared/modal';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-project-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    AvatarComponent,
    EmptyStateComponent,
    FilePanelComponent,
    ModalComponent,
    StatusBadgeComponent,
  ],
  template: `
    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else if (project(); as detail) {
      <div class="page-header">
        <div>
          <div class="hstack-8 mb-1">
            <a routerLink="/projects" class="text-muted-sm"><i class="bi bi-arrow-left"></i> Projects</a>
            <span class="dot-sep">/</span>
            <app-status-badge [label]="detail.status" />
          </div>
          <h1>{{ detail.title }}</h1>
          <p>{{ detail.course || 'Academic project' }} · {{ detail.academicYear || 'Current year' }} · {{ detail.semester || '' }}</p>
        </div>
        <div class="page-actions">
          @if (detail.canManage) {
            <a [routerLink]="['/projects', detail.id, 'edit']" class="btn btn-outline-secondary"><i class="bi bi-pencil"></i> Edit</a>
          }
          <a [routerLink]="['/tasks']" [queryParams]="{ projectId: detail.id, new: 1 }" class="btn btn-primary"><i class="bi bi-plus-lg"></i> New task</a>
        </div>
      </div>

      <div class="summary-strip">
        <div><strong>{{ detail.stats?.members }}</strong><span class="text-muted-sm">Members</span></div>
        <div><strong>{{ detail.stats?.totalTasks }}</strong><span class="text-muted-sm">Tasks</span></div>
        <div><strong>{{ detail.stats?.completedTasks }}</strong><span class="text-muted-sm">Completed</span></div>
        <div><strong>{{ detail.stats?.overdueTasks }}</strong><span class="text-muted-sm">Overdue</span></div>
        <div><strong>{{ detail.stats?.approvedMilestones }}/{{ detail.stats?.milestones }}</strong><span class="text-muted-sm">Milestones</span></div>
        <div><strong>{{ detail.stats?.progress || 0 }}%</strong><span class="text-muted-sm">Progress</span></div>
      </div>

      <div class="tabs mt-3">
        <button type="button" class="tab-btn" [class.active]="tab() === 'overview'" (click)="tab.set('overview')">Overview</button>
        <button type="button" class="tab-btn" [class.active]="tab() === 'team'" (click)="tab.set('team')">Team <span class="count">{{ members().length }}</span></button>
        <button type="button" class="tab-btn" [class.active]="tab() === 'tasks'" (click)="tab.set('tasks')">Tasks <span class="count">{{ tasks().length }}</span></button>
        <button type="button" class="tab-btn" [class.active]="tab() === 'milestones'" (click)="tab.set('milestones')">Milestones <span class="count">{{ milestones().length }}</span></button>
        <button type="button" class="tab-btn" [class.active]="tab() === 'files'" (click)="tab.set('files')">Files <span class="count">{{ files().length }}</span></button>
        <button type="button" class="tab-btn" [class.active]="tab() === 'feedback'" (click)="tab.set('feedback')">Feedback <span class="count">{{ feedback().length }}</span></button>
        <button type="button" class="tab-btn" [class.active]="tab() === 'activity'" (click)="tab.set('activity')">Activity</button>
      </div>

      @if (tab() === 'overview') {
        <div class="grid-main-side mt-3">
          <div>
            <div class="panel">
              <div class="panel-head"><div><h3>About this project</h3><div class="sub">{{ detail.category || 'Academic project' }}</div></div></div>
              <div class="panel-body">
                <p style="color:#3d4658;line-height:1.7;margin:0">{{ detail.description || 'No description has been provided yet.' }}</p>
                <div class="divider"></div>
                <div class="hstack-8 justify-content-between">
                  <span class="text-muted-sm">Overall completion</span>
                  <strong style="font-size:13px">{{ detail.stats?.progress || 0 }}%</strong>
                </div>
                <div class="progress-track mt-1"><div class="fill" [style.width.%]="detail.stats?.progress || 0"></div></div>
              </div>
            </div>

            <div class="panel mt-3">
              <div class="panel-head">
                <div><h3>Milestones</h3><div class="sub">Adviser-reviewed checkpoints</div></div>
                <button type="button" class="btn btn-soft btn-sm" (click)="tab.set('milestones')">View milestones</button>
              </div>
              <div class="panel-body">
                @for (milestone of milestones().slice(0, 4); track milestone.id) {
                  <div class="deadline-item">
                    <div class="deadline-date">
                      <span class="d">{{ dayOf(milestone.dueDate) }}</span>
                      <span class="m">{{ monthOf(milestone.dueDate) }}</span>
                    </div>
                    <div class="deadline-body">
                      <strong>{{ milestone.title }}</strong>
                      <span>{{ milestone.latestSubmission ? 'Submitted by ' + milestone.latestSubmission.submittedBy : 'Not submitted yet' }}</span>
                    </div>
                    <app-status-badge [label]="milestone.status" />
                  </div>
                } @empty {
                  <p class="text-muted-sm">No milestones have been added.</p>
                }
              </div>
            </div>

            <div class="panel mt-3">
              <div class="panel-head">
                <div><h3>Recent activity</h3><div class="sub">What changed recently</div></div>
                <button type="button" class="btn btn-soft btn-sm" (click)="tab.set('activity')">Full log</button>
              </div>
              <div class="panel-body">
                <div class="activity-list">
                  @for (activity of activities().slice(0, 6); track activity.id) {
                    <div class="activity-item">
                      <span class="activity-icon"><i [class]="'bi ' + icon(activity.action)"></i></span>
                      <div class="activity-body">
                        <strong>{{ activity.user?.name }}</strong>
                        <div>{{ activity.details }}</div>
                      </div>
                      <span class="activity-time">{{ relative(activity.createdAt) }}</span>
                    </div>
                  } @empty {
                    <p class="text-muted-sm">No activity recorded yet.</p>
                  }
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="panel">
              <div class="panel-head"><div><h3>Project details</h3><div class="sub">Academic information</div></div></div>
              <div class="panel-body" style="padding-top:6px">
                <div class="info-row"><span>Status</span><span><app-status-badge [label]="detail.status" /></span></div>
                <div class="info-row"><span>Category</span><span>{{ detail.category || '—' }}</span></div>
                <div class="info-row"><span>Course</span><span>{{ detail.course || '—' }}</span></div>
                <div class="info-row"><span>Academic year</span><span>{{ detail.academicYear || '—' }}</span></div>
                <div class="info-row"><span>Semester</span><span>{{ detail.semester || '—' }}</span></div>
                <div class="info-row"><span>Start date</span><span>{{ date(detail.startDate) }}</span></div>
                <div class="info-row"><span>Target completion</span><span>{{ date(detail.endDate) }}</span></div>
                <div class="info-row"><span>Created</span><span>{{ date(detail.createdAt) }}</span></div>
              </div>
            </div>

            <div class="panel mt-3">
              <div class="panel-head"><div><h3>Leadership &amp; guidance</h3><div class="sub">Who is steering the project</div></div></div>
              <div class="panel-body">
                <div class="hstack-12 mb-3">
                  <app-avatar [name]="detail.leader?.name || 'Unassigned'" [color]="detail.leader?.avatarColor || '#94a3b8'" size="lg" />
                  <div>
                    <div class="fw-650">{{ detail.leader?.name || 'No team leader' }}</div>
                    <div class="text-muted-sm">Team leader</div>
                    <div class="text-muted-sm">{{ detail.leader?.email }}</div>
                  </div>
                </div>
                <div class="hstack-12">
                  <app-avatar [name]="detail.adviser?.name || 'Unassigned'" [color]="detail.adviser?.avatarColor || '#94a3b8'" size="lg" />
                  <div>
                    <div class="fw-650">{{ detail.adviser?.name || 'No adviser assigned' }}</div>
                    <div class="text-muted-sm">Project adviser</div>
                    <div class="text-muted-sm">{{ detail.adviser?.email }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel mt-3">
              <div class="panel-head"><div><h3>Team snapshot</h3><div class="sub">{{ members().length }} members</div></div></div>
              <div class="panel-body">
                @for (member of members().slice(0, 5); track member.id) {
                  <div class="activity-item">
                    <app-avatar [name]="member.name" [color]="member.avatarColor || '#2563eb'" size="sm" />
                    <div class="activity-body">
                      <strong>{{ member.name }}</strong>
                      <div class="text-muted-sm">{{ member.roleInProject }} · {{ member.section || member.program }}</div>
                    </div>
                    <span class="rank-badge">{{ member.contributionPoints }} pts</span>
                  </div>
                }
                <button type="button" class="btn btn-soft btn-sm w-100 mt-2" (click)="tab.set('team')">Manage team</button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (tab() === 'team') {
        <div class="panel mt-3">
          <div class="panel-head">
            <div><h3>Team members</h3><div class="sub">Roles and contribution points</div></div>
            @if (canManage()) {
              <span class="badge-soft tone-blue">{{ members().length }} members</span>
            }
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr><th>Member</th><th>Role</th><th>Section</th><th>Contribution</th><th>Joined</th><th style="text-align:right">Actions</th></tr>
              </thead>
              <tbody>
                @for (member of members(); track member.id) {
                  <tr>
                    <td>
                      <div class="hstack-8">
                        <app-avatar [name]="member.name" [color]="member.avatarColor || '#2563eb'" />
                        <div>
                          <div class="cell-title">{{ member.name }}</div>
                          <div class="cell-sub">{{ member.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span [class]="'badge-soft ' + (member.roleInProject === 'Leader' ? 'tone-violet' : 'tone-slate')">{{ member.roleInProject }}</span>
                    </td>
                    <td>{{ member.section || '—' }}</td>
                    <td class="fw-650">{{ member.contributionPoints }} pts</td>
                    <td>{{ date(member.joinedAt) }}</td>
                    <td>
                      @if (canManage()) {
                        <div class="hstack-8 justify-content-end">
                          @if (member.roleInProject !== 'Leader') {
                            <button type="button" class="btn btn-soft btn-sm" title="Make team leader" (click)="makeLeader(member)">
                              <i class="bi bi-award"></i>
                            </button>
                            <button type="button" class="btn btn-danger-soft btn-sm" title="Remove member" (click)="removeMember(member)">
                              <i class="bi bi-person-dash"></i>
                            </button>
                          } @else {
                            <span class="text-muted-sm">Current leader</span>
                          }
                        </div>
                      } @else {
                        <span class="text-muted-sm">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (canManage()) {
          <div class="panel mt-3">
            <div class="panel-head"><div><h3>Add a team member</h3><div class="sub">Only active student accounts can be added.</div></div></div>
            <div class="panel-body">
              @if (!availableStudents().length) {
                <p class="text-muted-sm" style="margin:0">All eligible students are already members of this project.</p>
              } @else {
                <div class="hstack-8 wrap">
                  <select class="form-select" style="max-width:360px" [value]="selectedStudent()" (change)="selectedStudent.set(readValue($event))">
                    <option value="">Select a student</option>
                    @for (student of availableStudents(); track student.id) {
                      <option [value]="student.id">{{ student.name }} — {{ student.section || student.program }}</option>
                    }
                  </select>
                  <button type="button" class="btn btn-primary" [disabled]="!selectedStudent()" (click)="addMember()">
                    <i class="bi bi-person-plus"></i> Add member
                  </button>
                </div>
              }
            </div>
          </div>
        }
      }

      @if (tab() === 'tasks') {
        <div class="panel mt-3">
          <div class="panel-head">
            <div><h3>Project tasks</h3><div class="sub">Open the Kanban board to create and move tasks.</div></div>
            <a [routerLink]="['/tasks']" [queryParams]="{ projectId: detail.id }" class="btn btn-soft btn-sm">Open Kanban</a>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Assignees</th><th>Deadline</th><th>Due</th></tr></thead>
              <tbody>
                @for (task of tasks(); track task.id) {
                  <tr>
                    <td>
                      <a class="cell-title" [routerLink]="['/tasks']" [queryParams]="{ projectId: detail.id, task: task.id }">{{ task.title }}</a>
                      <div class="cell-sub">{{ task.category || 'General' }}</div>
                    </td>
                    <td><app-status-badge [label]="task.status" /></td>
                    <td><app-status-badge [label]="task.priority" /></td>
                    <td>
                      <div class="avatar-stack">
                        @for (assignee of task.assignees || []; track assignee.id) {
                          <app-avatar [name]="assignee.name" [color]="assignee.avatarColor || '#2563eb'" size="sm" />
                        }
                        @if (!(task.assignees || []).length) {
                          <span class="text-muted-sm">Unassigned</span>
                        }
                      </div>
                    </td>
                    <td>{{ date(task.deadline) }}</td>
                    <td [style.color]="task.isOverdue ? 'var(--danger)' : ''">{{ dueLabel(task.daysLeft, task.status) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6"><div class="empty-state" style="padding:26px"><i class="bi bi-list-task"></i><strong>No tasks yet</strong><p>Create the first task to get the team moving.</p></div></td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (tab() === 'milestones') {
        <div class="panel mt-3">
          <div class="panel-head">
            <div><h3>Milestones &amp; submissions</h3><div class="sub">Adviser review workflow</div></div>
            @if (canManage()) {
              <button type="button" class="btn btn-primary btn-sm" (click)="openMilestoneModal()"><i class="bi bi-plus-lg"></i> Add milestone</button>
            }
          </div>
          <div class="panel-body">
            @for (milestone of milestones(); track milestone.id) {
              <div class="panel" style="border:1px solid var(--border);box-shadow:none;margin-bottom:12px">
                <div class="panel-body">
                  <div class="hstack-8 justify-content-between wrap">
                    <div class="hstack-12">
                      <div class="deadline-date">
                        <span class="d">{{ dayOf(milestone.dueDate) }}</span>
                        <span class="m">{{ monthOf(milestone.dueDate) }}</span>
                      </div>
                      <div>
                        <div class="fw-650" style="font-size:14px">{{ milestone.title }}</div>
                        <div class="text-muted-sm">{{ milestone.description || 'No description' }}</div>
                      </div>
                    </div>
                    <div class="hstack-8">
                      <app-status-badge [label]="milestone.status" />
                      @if (canManage()) {
                        <button type="button" class="btn btn-soft btn-sm" title="Edit milestone" (click)="openMilestoneModal(milestone)"><i class="bi bi-pencil"></i></button>
                        <button type="button" class="btn btn-danger-soft btn-sm" title="Delete milestone" (click)="deleteMilestone(milestone)"><i class="bi bi-trash3"></i></button>
                      }
                      @if (canSubmit()) {
                        @if (milestone.status === 'Pending' || milestone.status === 'Revision Required') {
                          <button type="button" class="btn btn-primary btn-sm" (click)="openSubmitModal(milestone)"><i class="bi bi-send"></i> Submit</button>
                        }
                      }
                      @if (canReview() && milestone.latestSubmission?.reviewStatus === 'Pending') {
                        <button type="button" class="btn btn-primary btn-sm" (click)="openReviewModal(milestone)"><i class="bi bi-clipboard-check"></i> Review</button>
                      }
                    </div>
                  </div>

                  @if (milestone.latestSubmission; as submission) {
                    <div class="formula-box mt-2" style="margin-bottom:0">
                      <div class="hstack-8 justify-content-between">
                        <strong style="font-size:12.5px">Submission by {{ submission.submittedBy }}</strong>
                        <span class="text-muted-sm">{{ relative(submission.submittedAt) }}</span>
                      </div>
                      <p style="margin:4px 0 0;font-size:12px;color:var(--muted)">{{ submission.notes || 'No submission notes.' }}</p>
                      <div class="hstack-8 mt-1">
                        <app-status-badge [label]="submission.reviewStatus" />
                        @if (submission.reviewedBy) {
                          <span class="text-muted-sm">Reviewed by {{ submission.reviewedBy }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            } @empty {
              <app-empty-state icon="bi-flag" title="No milestones yet" message="Milestones let advisers review progress at key checkpoints." />
            }
          </div>
        </div>
      }

      @if (tab() === 'files') {
        <div class="mt-3">
          <app-file-panel
            [projectId]="detail.id"
            [files]="files()"
            [allowUpload]="canUploadFiles()"
            (changed)="loadFiles()"
          />
        </div>
      }

      @if (tab() === 'feedback') {
        @if (canReview()) {
          <div class="panel mt-3">
            <div class="panel-head"><div><h3>Provide adviser feedback</h3><div class="sub">Students and leaders are notified immediately.</div></div></div>
            <div class="panel-body">
              <form [formGroup]="feedbackForm" (ngSubmit)="addFeedback()">
                <div class="mb-2">
                  <label class="form-label">Feedback</label>
                  <textarea class="form-control" rows="3" formControlName="content" placeholder="Share observations, approvals, or revision requests."></textarea>
                </div>
                <div class="grid-2">
                  <div>
                    <label class="form-label">Review status</label>
                    <select class="form-select" formControlName="reviewStatus">
                      <option>Comment</option>
                      <option>Approved</option>
                      <option>Revision Required</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-label">Related milestone</label>
                    <select class="form-select" formControlName="milestoneId">
                      <option value="">General feedback</option>
                      @for (milestone of milestones(); track milestone.id) {
                        <option [value]="milestone.id">{{ milestone.title }}</option>
                      }
                    </select>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary btn-sm mt-2" [disabled]="feedbackForm.invalid || savingFeedback()">
                  <i class="bi bi-chat-left-text"></i> Post feedback
                </button>
              </form>
            </div>
          </div>
        }

        <div class="panel mt-3">
          <div class="panel-head"><div><h3>Adviser feedback</h3><div class="sub">{{ feedback().length }} entries for this project</div></div></div>
          <div class="panel-body">
            @for (item of feedback(); track item.id) {
              <div class="comment-item" style="align-items:flex-start">
                <app-avatar [name]="item.adviser.name" [color]="item.adviser.avatarColor || '#7c3aed'" />
                <div class="comment-body">
                  <div class="meta">
                    <strong>{{ item.adviser.name }}</strong>
                    <span class="time">{{ relative(item.createdAt) }}</span>
                    <app-status-badge [label]="item.reviewStatus" />
                  </div>
                  <p>{{ item.content }}</p>
                  @if (item.milestoneTitle) {
                    <div class="text-muted-sm"><i class="bi bi-flag"></i> {{ item.milestoneTitle }}</div>
                  }
                  @if (item.canDelete) {
                    <button type="button" class="btn btn-danger-soft btn-sm mt-1" (click)="removeFeedback(item)">
                      <i class="bi bi-trash3"></i> Delete
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <app-empty-state icon="bi-chat-square-text" title="No feedback yet" message="Adviser feedback and review decisions will appear here." />
            }
          </div>
        </div>
      }

      @if (tab() === 'activity') {
        <div class="panel mt-3">
          <div class="panel-head"><div><h3>Project activity log</h3><div class="sub">Who did what, in reverse chronological order</div></div></div>
          <div class="panel-body">
            <div class="activity-list">
              @for (activity of activities(); track activity.id) {
                <div class="activity-item">
                  <span class="activity-icon"><i [class]="'bi ' + icon(activity.action)"></i></span>
                  <div class="activity-body">
                    <strong>{{ activity.user?.name }}</strong>
                    <div>{{ activity.details }}</div>
                  </div>
                  <span class="activity-time">{{ relative(activity.createdAt) }}</span>
                </div>
              } @empty {
                <p class="text-muted-sm">No activity recorded.</p>
              }
            </div>
          </div>
        </div>
      }
    }

    <app-modal
      [open]="milestoneModal()"
      [title]="editingMilestone() ? 'Edit milestone' : 'Add milestone'"
      subtitle="Milestones are reviewed by the project adviser."
      (close)="milestoneModal.set(false)"
    >
      <form [formGroup]="milestoneForm">
        <div class="mb-3">
          <label class="form-label">Title *</label>
          <input class="form-control" formControlName="title" placeholder="e.g. Prototype Demo" />
        </div>
        <div class="mb-3">
          <label class="form-label">Description</label>
          <textarea class="form-control" rows="2" formControlName="description"></textarea>
        </div>
        <div class="grid-2">
          <div>
            <label class="form-label">Due date</label>
            <input type="date" class="form-control" formControlName="dueDate" />
          </div>
          @if (editingMilestone()) {
            <div>
              <label class="form-label">Status</label>
              <select class="form-select" formControlName="status">
                <option>Pending</option>
                <option>Submitted</option>
                <option>Approved</option>
                <option>Revision Required</option>
              </select>
            </div>
          }
        </div>
      </form>
      <button modalFooter type="button" class="btn btn-outline-secondary" (click)="milestoneModal.set(false)">Cancel</button>
      <button modalFooter type="button" class="btn btn-primary" [disabled]="milestoneForm.invalid || savingMilestone()" (click)="saveMilestone()">
        @if (savingMilestone()) { Saving... } @else { Save milestone }
      </button>
    </app-modal>

    <app-modal
      [open]="milestoneToSubmit() !== null"
      title="Submit milestone"
      subtitle="Send this milestone to your adviser for review."
      (close)="milestoneToSubmit.set(null)"
    >
      @if (milestoneToSubmit(); as milestone) {
        <p style="font-size:13px"><strong>{{ milestone.title }}</strong></p>
        <form [formGroup]="submitForm">
          <div class="mb-2">
            <label class="form-label">Submission notes</label>
            <textarea class="form-control" rows="3" formControlName="notes" placeholder="Summarize what is being submitted."></textarea>
          </div>
          <div>
            <label class="form-label">Attach a project file</label>
            <select class="form-select" formControlName="fileId">
              <option value="">No attachment</option>
              @for (file of files(); track file.id) {
                <option [value]="file.id">{{ file.fileName }}</option>
              }
            </select>
          </div>
        </form>
      }
      <ng-container modalFooter>
        <button type="button" class="btn btn-outline-secondary" (click)="milestoneToSubmit.set(null)">Cancel</button>
        <button type="button" class="btn btn-primary" [disabled]="savingMilestone()" (click)="submitMilestone()">
          <i class="bi bi-send"></i> Submit for review
        </button>
      </ng-container>
    </app-modal>

    <app-modal
      [open]="milestoneToReview() !== null"
      title="Review submission"
      subtitle="Approve the milestone or request revisions."
      (close)="milestoneToReview.set(null)"
    >
      @if (milestoneToReview(); as milestone) {
        <p style="font-size:13px"><strong>{{ milestone.title }}</strong></p>
        @if (milestone.latestSubmission; as submission) {
          <div class="formula-box">
            <div class="text-muted-sm">Submitted by {{ submission.submittedBy }} · {{ relative(submission.submittedAt) }}</div>
            <p style="margin:4px 0 0;font-size:12.5px">{{ submission.notes || 'No notes provided.' }}</p>
          </div>
        }
        <form [formGroup]="reviewForm">
          <div class="mb-2">
            <label class="form-label">Decision</label>
            <select class="form-select" formControlName="reviewStatus">
              <option>Approved</option>
              <option>Revision Required</option>
            </select>
          </div>
          <div>
            <label class="form-label">Feedback</label>
            <textarea class="form-control" rows="3" formControlName="feedback" placeholder="Explain your decision and next steps."></textarea>
          </div>
        </form>
      }
      <ng-container modalFooter>
        <button type="button" class="btn btn-outline-secondary" (click)="milestoneToReview.set(null)">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="reviewMilestone()">
          <i class="bi bi-clipboard-check"></i> Submit review
        </button>
      </ng-container>
    </app-modal>
  `,
})
export class ProjectDetailPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly projectId = Number(this.route.snapshot.paramMap.get('id'));
  readonly loading = signal(true);
  readonly tab = signal('overview');
  readonly project = signal<Project | null>(null);
  readonly members = signal<ProjectMember[]>([]);
  readonly milestones = signal<Milestone[]>([]);
  readonly tasks = signal<Task[]>([]);
  readonly files = signal<ProjectFile[]>([]);
  readonly feedback = signal<Feedback[]>([]);
  readonly activities = signal<ActivityItem[]>([]);
  readonly students = signal<StudentLookup[]>([]);
  readonly selectedStudent = signal('');

  readonly milestoneModal = signal(false);
  readonly editingMilestone = signal<Milestone | null>(null);
  readonly milestoneToSubmit = signal<Milestone | null>(null);
  readonly milestoneToReview = signal<Milestone | null>(null);
  readonly savingMilestone = signal(false);
  readonly savingFeedback = signal(false);

  readonly canManage = computed(() => !!this.project()?.canManage);
  readonly canReview = computed(() => this.auth.isAdviser() || this.auth.isAdmin());
  readonly canSubmit = computed(() => this.project()?.myAccess !== 'Adviser');
  readonly canUploadFiles = computed(() => this.project()?.myAccess !== 'Adviser');
  readonly availableStudents = computed(() => {
    const memberIds = new Set(this.members().map((member) => member.id));
    return this.students().filter((student) => !memberIds.has(student.id));
  });

  readonly milestoneForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    dueDate: [''],
    status: ['Pending'],
  });

  readonly submitForm = this.fb.group({
    notes: [''],
    fileId: [''],
  });

  readonly reviewForm = this.fb.group({
    reviewStatus: ['Approved', Validators.required],
    feedback: [''],
  });

  readonly feedbackForm = this.fb.group({
    content: ['', Validators.required],
    reviewStatus: ['Comment'],
    milestoneId: [''],
  });

  ngOnInit(): void {
    this.loadCore();
    this.loadTasks();
    this.loadFiles();
    this.loadFeedback();
    this.loadActivity();
  }

  loadCore(): void {
    this.loading.set(true);
    this.api
      .get<{ project: Project; members: ProjectMember[]; milestones: Milestone[] }>(`/projects/${this.projectId}`)
      .subscribe({
        next: (response) => {
          this.project.set(response.project);
          this.members.set(response.members);
          this.milestones.set(response.milestones);
          this.loading.set(false);
          if (response.project.canManage && !this.students().length) {
            this.api.get<{ students: StudentLookup[] }>('/students').subscribe({
              next: (students) => this.students.set(students.students),
            });
          }
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(apiError(error));
        },
      });
  }

  loadTasks(): void {
    this.api.get<{ tasks: Task[] }>('/tasks', { projectId: this.projectId }).subscribe({
      next: (response) => this.tasks.set(response.tasks),
    });
  }

  loadFiles(): void {
    this.api.get<{ files: ProjectFile[] }>('/files', { projectId: this.projectId }).subscribe({
      next: (response) => this.files.set(response.files),
    });
  }

  loadFeedback(): void {
    this.api.get<{ feedback: Feedback[] }>('/feedback', { projectId: this.projectId }).subscribe({
      next: (response) => this.feedback.set(response.feedback),
    });
  }

  loadActivity(): void {
    this.api.get<{ activities: ActivityItem[] }>(`/projects/${this.projectId}/activity`).subscribe({
      next: (response) => this.activities.set(response.activities),
    });
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  relative(value?: string | null): string {
    return relativeTime(value);
  }

  dueLabel(days?: number | null, status?: string): string {
    return daysLabel(days, status);
  }

  icon(action: string): string {
    return actionIcon(action);
  }

  dayOf(value?: string | null): string {
    if (!value) return '--';
    return new Date(value).getDate().toString().padStart(2, '0');
  }

  monthOf(value?: string | null): string {
    if (!value) return '---';
    return new Date(value).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  }

  addMember(): void {
    const userId = Number(this.selectedStudent());
    if (!userId) return;
    this.api.post<{ project: Project; members: ProjectMember[]; milestones: Milestone[] }>(`/projects/${this.projectId}/members`, { userId }).subscribe({
      next: (response) => {
        this.project.set(response.project);
        this.members.set(response.members);
        this.selectedStudent.set('');
        this.toast.success('Member added to the project.');
        this.loadActivity();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  async removeMember(member: ProjectMember): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Remove team member?',
      message: `${member.name} will lose access to this project and their task assignments in it.`,
      confirmLabel: 'Remove member',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/projects/${this.projectId}/members/${member.id}`).subscribe({
      next: () => {
        this.toast.success('Member removed.');
        this.loadCore();
        this.loadActivity();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  async makeLeader(member: ProjectMember): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Change team leader?',
      message: `${member.name} will become the team leader for this project.`,
      confirmLabel: 'Make leader',
    });
    if (!confirmed) return;
    this.api.put<{ project: Project; members: ProjectMember[]; milestones: Milestone[] }>(`/projects/${this.projectId}/leader`, { userId: member.id }).subscribe({
      next: (response) => {
        this.project.set(response.project);
        this.members.set(response.members);
        this.toast.success('Team leader updated.');
        this.loadActivity();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  openMilestoneModal(milestone?: Milestone): void {
    this.editingMilestone.set(milestone || null);
    this.milestoneForm.reset({
      title: milestone?.title || '',
      description: milestone?.description || '',
      dueDate: dateInputValue(milestone?.dueDate),
      status: milestone?.status || 'Pending',
    });
    this.milestoneModal.set(true);
  }

  saveMilestone(): void {
    if (this.milestoneForm.invalid) {
      this.milestoneForm.markAllAsTouched();
      return;
    }
    this.savingMilestone.set(true);
    const value = this.milestoneForm.getRawValue();
    const payload = {
      title: value.title,
      description: value.description,
      dueDate: value.dueDate || null,
      status: value.status,
    };
    const editing = this.editingMilestone();
    const request = editing
      ? this.api.put<{ milestones: Milestone[] }>(`/milestones/${editing.id}`, payload)
      : this.api.post<{ milestones: Milestone[] }>(`/projects/${this.projectId}/milestones`, payload);
    request.subscribe({
      next: (response) => {
        this.savingMilestone.set(false);
        this.milestones.set(response.milestones);
        this.milestoneModal.set(false);
        this.toast.success(editing ? 'Milestone updated.' : 'Milestone added.');
        this.loadActivity();
      },
      error: (error) => {
        this.savingMilestone.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  async deleteMilestone(milestone: Milestone): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete milestone?',
      message: `"${milestone.title}" and its submission history will be removed.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/milestones/${milestone.id}`).subscribe({
      next: () => {
        this.milestones.update((list) => list.filter((item) => item.id !== milestone.id));
        this.toast.success('Milestone deleted.');
        this.loadActivity();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  openSubmitModal(milestone: Milestone): void {
    this.submitForm.reset({ notes: '', fileId: '' });
    this.milestoneToSubmit.set(milestone);
  }

  submitMilestone(): void {
    const milestone = this.milestoneToSubmit();
    if (!milestone) return;
    this.savingMilestone.set(true);
    const value = this.submitForm.getRawValue();
    this.api
      .post<{ milestones: Milestone[] }>(`/milestones/${milestone.id}/submit`, {
        notes: value.notes,
        fileId: value.fileId ? Number(value.fileId) : null,
      })
      .subscribe({
        next: (response) => {
          this.savingMilestone.set(false);
          this.milestones.set(response.milestones);
          this.milestoneToSubmit.set(null);
          this.toast.success('Milestone submitted for adviser review.');
          this.loadActivity();
        },
        error: (error) => {
          this.savingMilestone.set(false);
          this.toast.error(apiError(error));
        },
      });
  }

  openReviewModal(milestone: Milestone): void {
    this.reviewForm.reset({ reviewStatus: 'Approved', feedback: '' });
    this.milestoneToReview.set(milestone);
  }

  reviewMilestone(): void {
    const milestone = this.milestoneToReview();
    if (!milestone) return;
    const value = this.reviewForm.getRawValue();
    this.api
      .post<{ milestones: Milestone[] }>(`/milestones/${milestone.id}/review`, {
        reviewStatus: value.reviewStatus,
        feedback: value.feedback,
      })
      .subscribe({
        next: (response) => {
          this.milestones.set(response.milestones);
          this.milestoneToReview.set(null);
          this.toast.success(value.reviewStatus === 'Approved' ? 'Milestone approved.' : 'Revision requested.');
          this.loadFeedback();
          this.loadActivity();
        },
        error: (error) => this.toast.error(apiError(error)),
      });
  }

  addFeedback(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }
    this.savingFeedback.set(true);
    const value = this.feedbackForm.getRawValue();
    this.api
      .post(`/projects/${this.projectId}/feedback`, {
        content: value.content,
        reviewStatus: value.reviewStatus,
        milestoneId: value.milestoneId ? Number(value.milestoneId) : null,
      })
      .subscribe({
        next: () => {
          this.savingFeedback.set(false);
          this.feedbackForm.reset({ content: '', reviewStatus: 'Comment', milestoneId: '' });
          this.toast.success('Feedback posted.');
          this.loadFeedback();
          this.loadActivity();
        },
        error: (error) => {
          this.savingFeedback.set(false);
          this.toast.error(apiError(error));
        },
      });
  }

  async removeFeedback(item: Feedback): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete feedback?',
      message: 'This feedback entry will be permanently removed.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/feedback/${item.id}`).subscribe({
      next: () => {
        this.toast.success('Feedback deleted.');
        this.loadFeedback();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }
}
