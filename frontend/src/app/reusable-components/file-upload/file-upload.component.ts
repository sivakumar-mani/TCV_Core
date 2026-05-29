import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface UploadedFile {
  file: File;
  name: string;
  size: number;
  sizeLabel: string;
  type: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  errorMessage?: string;
  previewUrl?: string;
}

@Component({
  selector: 'app-file-upload-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent implements OnInit, OnDestroy {

  /** Button/trigger label */
  @Input() label: string = 'Upload';

  /** Accepted file types, e.g. '.pdf,.docx' or 'image/*' */
  @Input() accept: string = '*';

  /** Allow selecting multiple files */
  @Input() multiple: boolean = false;

  /** Max file size in MB */
  @Input() maxSizeMB: number = 10;

  /** Show drag-and-drop zone instead of just a button */
  @Input() showDropZone: boolean = false;

  /** Hint text shown below the upload area */
  @Input() hint: string = '';

  /** Reactive form control to bind the uploaded file(s) */
  @Input() control: AbstractControl | FormControl | null = null;

  /** Whether the field is required */
  @Input() required: boolean = false;

  /** Whether the component is disabled */
  @Input() disabled: boolean = false;

  uploadedFiles: UploadedFile[] = [];
  isDragging: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';

  private controlSub?: Subscription;

  ngOnInit(): void {
    if (this.control) {
      // Reflect any external reset (null / undefined) on the control
      this.controlSub = this.control.valueChanges.subscribe(val => {
        if (!val) {
          this.uploadedFiles = [];
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.controlSub?.unsubscribe();
  }

  /** Triggered by the hidden <input type="file"> */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.processFiles(Array.from(input.files));
    // Reset input so the same file can be re-selected after removal
    input.value = '';
  }

  /** Drag-over: highlight drop zone */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled) this.isDragging = true;
  }

  /** Drag-leave: remove highlight */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /** Drop: process dropped files */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (this.disabled) return;
    const files = event.dataTransfer?.files;
    if (files?.length) this.processFiles(Array.from(files));
  }

  /** Core file processing: validate → add to list → patch control */
  private processFiles(files: File[]): void {
    this.hasError = false;
    this.errorMessage = '';

    if (!this.multiple) {
      // Single-file mode: replace existing
      this.uploadedFiles = [];
      files = [files[0]];
    }

    for (const file of files) {
      const validation = this.validate(file);
      if (!validation.valid) {
        this.hasError = true;
        this.errorMessage = validation.message;
        continue;
      }

      const uploadedFile: UploadedFile = {
        file,
        name: file.name,
        size: file.size,
        sizeLabel: this.formatSize(file.size),
        type: file.type,
        status: 'uploading',
        progress: 0
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.previewUrl = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      this.uploadedFiles.push(uploadedFile);
      this.simulateUpload(uploadedFile);
    }
  }

  /** Simulate upload progress (replace with real HTTP call as needed) */
  private simulateUpload(uploadedFile: UploadedFile): void {
    const interval = setInterval(() => {
      if (uploadedFile.progress < 100) {
        uploadedFile.progress += 20;
      } else {
        uploadedFile.status = 'success';
        clearInterval(interval);
        this.patchControl();
      }
    }, 150);
  }

  /** Patch the reactive control with current file(s) */
  private patchControl(): void {
    if (!this.control) return;
    const successFiles = this.uploadedFiles
      .filter(f => f.status === 'success')
      .map(f => f.file);

    const value = this.multiple ? successFiles : (successFiles[0] ?? null);
    (this.control as FormControl).setValue(value, { emitEvent: false });
    (this.control as FormControl).markAsDirty();
    (this.control as FormControl).markAsTouched();
  }

  /** Remove a specific file from the list */
  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
    this.patchControl();
    if (this.uploadedFiles.length === 0) {
      this.hasError = false;
      this.errorMessage = '';
    }
  }

  /** Validate file type and size */
  private validate(file: File): { valid: boolean; message: string } {
    // Size check
    const maxBytes = this.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return { valid: false, message: `"${file.name}" exceeds the ${this.maxSizeMB} MB limit.` };
    }

    // Type check
    if (this.accept && this.accept !== '*') {
      const accepted = this.accept.split(',').map(a => a.trim().toLowerCase());
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const mime = file.type.toLowerCase();
      const ok = accepted.some(a =>
        a === ext ||
        a === mime ||
        (a.endsWith('/*') && mime.startsWith(a.replace('/*', '/')))
      );
      if (!ok) {
        return { valid: false, message: `"${file.name}" is not an accepted file type (${this.accept}).` };
      }
    }

    return { valid: true, message: '' };
  }

  /** Human-readable file size */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /** Returns true when the control is invalid and has been touched */
  get showValidationError(): boolean {
    if (!this.control) return false;
    return this.control.invalid && (this.control.dirty || this.control.touched);
  }

  /** Icon per file extension */
  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      pdf: 'bi-file-earmark-pdf',
      doc: 'bi-file-earmark-word',
      docx: 'bi-file-earmark-word',
      xls: 'bi-file-earmark-excel',
      xlsx: 'bi-file-earmark-excel',
      png: 'bi-file-earmark-image',
      jpg: 'bi-file-earmark-image',
      jpeg: 'bi-file-earmark-image',
      gif: 'bi-file-earmark-image',
      zip: 'bi-file-earmark-zip',
      txt: 'bi-file-earmark-text',
    };
    return iconMap[ext ?? ''] ?? 'bi-file-earmark';
  }
}
