import { Component, effect, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { ProjectFile } from '../core/models';
import { apiError, downloadBlob, fileIcon, fileKind, fileSize, formatDate } from '../core/utils';

@Component({
  selector: 'app-file-panel',
  template: `
    @if (allowUpload()) {
      <div class="panel">
        <div class="panel-head">
          <div><h3>Upload a project document</h3><div class="sub">PDF, DOCX, PPTX, XLSX, PNG, JPG, or ZIP · max 10 MB</div></div>
        </div>
        <div class="panel-body">
          <div
            class="dropzone"
            [class.drag-over]="dragOver()"
            (dragover)="onDragOver($event)"
            (dragleave)="dragOver.set(false)"
            (drop)="onDrop($event)"
            (click)="picker.click()"
          >
            <i class="bi bi-cloud-arrow-up"></i>
            <strong>{{ selected() ? selected()?.name : 'Drag and drop a file here' }}</strong>
            <span>{{ selected() ? sizeOf(selected()?.size) : 'or click to browse your device' }}</span>
            <input #picker type="file" hidden (change)="onFileSelected($event)" />
          </div>

          <div class="grid-3 mt-2">
            @if (!projectId()) {
              <div>
                <label class="form-label">Project</label>
                <select class="form-select" [value]="uploadProjectId()" (change)="uploadProjectId.set(readValue($event))">
                  <option value="">Select project</option>
                  @for (project of projects(); track project.id) {
                    <option [value]="project.id">{{ project.title }}</option>
                  }
                </select>
              </div>
            }
            <div>
              <label class="form-label">Category</label>
              <select class="form-select" [value]="category()" (change)="category.set(readValue($event))">
                <option>General</option>
                <option>Proposal</option>
                <option>Design</option>
                <option>Technical</option>
                <option>Report</option>
                <option>Evidence</option>
                <option>Presentation</option>
              </select>
            </div>
            <div>
              <label class="form-label">Description</label>
              <input class="form-control" [value]="description()" (input)="description.set(readValue($event))" placeholder="Optional note" />
            </div>
          </div>

          @if (uploadError()) {
            <div class="alert alert-danger py-2 px-3 mt-2" style="font-size:12.5px">{{ uploadError() }}</div>
          }

          <div class="hstack-8 mt-2 justify-content-end">
            @if (selected()) {
              <button type="button" class="btn btn-soft btn-sm" (click)="clearSelection(picker)">Clear</button>
            }
            <button type="button" class="btn btn-primary btn-sm" [disabled]="!selected() || uploading()" (click)="upload()">
              @if (uploading()) {
                <span class="spinner-border spinner-border-sm me-1"></span> Uploading...
              } @else {
                <i class="bi bi-upload"></i> Upload file
              }
            </button>
          </div>
        </div>
      </div>
    }

    <div class="panel" [class.mt-3]="allowUpload()">
      <div class="panel-head">
        <div>
          <h3>Project files</h3>
          <div class="sub">{{ files().length }} document{{ files().length === 1 ? '' : 's' }} available</div>
        </div>
      </div>
      <div class="panel-body" style="padding-top:8px">
        @for (file of files(); track file.id) {
          <div class="file-row">
            <span [class]="'file-icon ' + kind(file)"><i [class]="'bi ' + icon(file)"></i></span>
            <div class="file-meta">
              <strong>{{ file.fileName }}</strong>
              <span>
                @if (showProject() && file.projectTitle) { {{ file.projectTitle }} · }
                {{ file.category || 'General' }} · {{ sizeOf(file.fileSize) }} · {{ uploaderName(file) }} · {{ date(file.createdAt) }}
              </span>
              @if (file.description) {
                <span style="color:var(--muted)">{{ file.description }}</span>
              }
            </div>
            <div class="file-actions">
              @if (file.isPreviewable) {
                <button type="button" class="btn btn-soft btn-sm" title="Preview" (click)="preview(file)">
                  <i class="bi bi-eye"></i>
                </button>
              }
              <button type="button" class="btn btn-soft btn-sm" title="Download" (click)="download(file)">
                <i class="bi bi-download"></i>
              </button>
              @if (file.canDelete) {
                <button type="button" class="btn btn-danger-soft btn-sm" title="Delete" (click)="remove(file)">
                  <i class="bi bi-trash3"></i>
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="empty-state" style="padding:34px 10px">
            <i class="bi bi-folder2-open"></i>
            <strong>No files yet</strong>
            <p>{{ allowUpload() ? 'Upload proposals, designs, reports, and evidence.' : 'Uploaded project documents will appear here.' }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class FilePanelComponent {
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly projectId = input<number | null>(null);
  readonly projects = input<{ id: number; title: string }[]>([]);
  readonly files = input<ProjectFile[]>([]);
  readonly allowUpload = input(true);
  readonly showProject = input(false);
  readonly changed = output<void>();

  readonly selected = signal<File | null>(null);
  readonly uploadProjectId = signal('');
  readonly category = signal('General');
  readonly description = signal('');
  readonly uploading = signal(false);
  readonly dragOver = signal(false);
  readonly uploadError = signal('');

  constructor() {
    effect(() => {
      const id = this.projectId();
      if (id) this.uploadProjectId.set(String(id));
    });
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  kind(file: ProjectFile): string {
    return fileKind(file.fileType || file.fileName);
  }

  icon(file: ProjectFile): string {
    return fileIcon(this.kind(file));
  }

  sizeOf(bytes?: number | null): string {
    return fileSize(bytes);
  }

  date(value: string): string {
    return formatDate(value);
  }

  uploaderName(file: ProjectFile): string {
    if (!file.uploadedBy) return 'Unknown';
    return typeof file.uploadedBy === 'string' ? file.uploadedBy : file.uploadedBy.name;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
    input.value = '';
  }

  clearSelection(picker: HTMLInputElement): void {
    this.selected.set(null);
    picker.value = '';
  }

  upload(): void {
    const file = this.selected();
    const project = Number(this.uploadProjectId());
    if (!file) return;
    if (!project) {
      this.uploadError.set('Choose a project for this file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError.set('Files must be 10 MB or smaller.');
      return;
    }
    this.uploading.set(true);
    this.uploadError.set('');
    const form = new FormData();
    form.append('file', file);
    form.append('projectId', String(project));
    form.append('category', this.category());
    form.append('description', this.description());
    this.api.upload<{ file: ProjectFile }>('/files', form).subscribe({
      next: () => {
        this.uploading.set(false);
        this.selected.set(null);
        this.description.set('');
        this.toast.success('File uploaded.');
        this.changed.emit();
      },
      error: (error) => {
        this.uploading.set(false);
        this.uploadError.set(apiError(error));
      },
    });
  }

  download(file: ProjectFile): void {
    this.api.download(`/files/${file.id}/download`).subscribe({
      next: (blob) => downloadBlob(blob, file.fileName),
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  preview(file: ProjectFile): void {
    this.api.download(`/files/${file.id}/preview`).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  async remove(file: ProjectFile): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete file?',
      message: `"${file.fileName}" will be permanently removed from this project.`,
      confirmLabel: 'Delete file',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/files/${file.id}`).subscribe({
      next: () => {
        this.toast.success('File deleted.');
        this.changed.emit();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  private setFile(file: File): void {
    this.uploadError.set('');
    this.selected.set(file);
  }
}
