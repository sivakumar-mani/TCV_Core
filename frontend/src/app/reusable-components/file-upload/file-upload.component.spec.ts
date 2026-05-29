import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { FileUploadComponent } from './file-upload.component';

// ── Helper: create a fake File ────────────────────────────────────────────────
function makeFile(name: string, sizeBytes: number, type: string): File {
  const blob = new Blob([new ArrayBuffer(sizeBytes)], { type });
  return new File([blob], name, { type });
}

// ── Helper: fire the native change event on a hidden file input ───────────────
function fireFileInputChange(fixture: ComponentFixture<FileUploadComponent>, files: File[]): void {
  const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
  // Simulate FileList (read-only in real browsers, writable in JSDOM)
  Object.defineProperty(input, 'files', {
    value: {
      length: files.length,
      item: (i: number) => files[i],
      [Symbol.iterator]: function* () { yield* files; }
    },
    writable: true
  });
  input.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}


describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule, FileUploadComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Instantiation ───────────────────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the upload button with default label', () => {
    const btn = fixture.nativeElement.querySelector('.btn-upload');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Upload');
  });

  it('should render custom label', () => {
    component.label = 'Attach File';
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-upload');
    expect(btn.textContent).toContain('Attach File');
  });

  // ── Drop-zone toggle ────────────────────────────────────────────────────────
  it('should NOT render drop-zone by default', () => {
    expect(fixture.nativeElement.querySelector('.drop-zone')).toBeNull();
  });

  it('should render drop-zone when showDropZone=true', () => {
    component.showDropZone = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drop-zone')).toBeTruthy();
  });

  // ── File validation: size ───────────────────────────────────────────────────
  it('should reject a file exceeding maxSizeMB', () => {
    component.maxSizeMB = 1;
    fixture.detectChanges();
    const bigFile = makeFile('big.pdf', 2 * 1024 * 1024, 'application/pdf'); // 2 MB
    fireFileInputChange(fixture, [bigFile]);
    expect(component.hasError).toBeTrue();
    expect(component.errorMessage).toContain('exceeds');
    expect(component.uploadedFiles.length).toBe(0);
  });

  it('should accept a file within size limit', fakeAsync(() => {
    component.maxSizeMB = 5;
    component.accept = '.pdf';
    fixture.detectChanges();
    const okFile = makeFile('doc.pdf', 100 * 1024, 'application/pdf'); // 100 KB
    fireFileInputChange(fixture, [okFile]);
    expect(component.hasError).toBeFalse();
    expect(component.uploadedFiles.length).toBe(1);
    tick(1000); // let simulated upload finish
  }));

  // ── File validation: type ───────────────────────────────────────────────────
  it('should reject a file with wrong extension', () => {
    component.accept = '.pdf';
    fixture.detectChanges();
    const wrongFile = makeFile('image.png', 50 * 1024, 'image/png');
    fireFileInputChange(fixture, [wrongFile]);
    expect(component.hasError).toBeTrue();
    expect(component.errorMessage).toContain('not an accepted file type');
  });

  it('should accept a file matching accept pattern', fakeAsync(() => {
    component.accept = '.pdf,.docx';
    fixture.detectChanges();
    const docx = makeFile('report.docx', 50 * 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    fireFileInputChange(fixture, [docx]);
    expect(component.hasError).toBeFalse();
    expect(component.uploadedFiles.length).toBe(1);
    tick(1000);
  }));

  // ── Single-file mode replaces existing file ────────────────────────────────
  it('should replace existing file in single-file mode', fakeAsync(() => {
    component.accept = '*';
    component.multiple = false;
    fixture.detectChanges();

    const file1 = makeFile('a.pdf', 10 * 1024, 'application/pdf');
    fireFileInputChange(fixture, [file1]);
    tick(1000);
    expect(component.uploadedFiles.length).toBe(1);

    const file2 = makeFile('b.pdf', 10 * 1024, 'application/pdf');
    fireFileInputChange(fixture, [file2]);
    tick(1000);
    expect(component.uploadedFiles.length).toBe(1);
    expect(component.uploadedFiles[0].name).toBe('b.pdf');
  }));

  // ── Multi-file mode accumulates ─────────────────────────────────────────────
  it('should accumulate files in multiple mode', fakeAsync(() => {
    component.accept = '*';
    component.multiple = true;
    fixture.detectChanges();

    fireFileInputChange(fixture, [makeFile('a.pdf', 1024, 'application/pdf')]);
    tick(1000);
    fireFileInputChange(fixture, [makeFile('b.pdf', 1024, 'application/pdf')]);
    tick(1000);

    expect(component.uploadedFiles.length).toBe(2);
  }));

  // ── Remove ──────────────────────────────────────────────────────────────────
  it('should remove a file at given index', fakeAsync(() => {
    component.accept = '*';
    component.multiple = true;
    fixture.detectChanges();

    fireFileInputChange(fixture, [
      makeFile('a.pdf', 1024, 'application/pdf'),
      makeFile('b.pdf', 1024, 'application/pdf')
    ]);
    tick(1000);
    expect(component.uploadedFiles.length).toBe(2);

    component.removeFile(0);
    fixture.detectChanges();
    expect(component.uploadedFiles.length).toBe(1);
    expect(component.uploadedFiles[0].name).toBe('b.pdf');
  }));

  // ── Reactive control patching ───────────────────────────────────────────────
  it('should patch FormControl with File value after upload', fakeAsync(() => {
    const ctrl = new FormControl(null, Validators.required);
    component.control = ctrl;
    component.accept = '*';
    fixture.detectChanges();

    const f = makeFile('test.pdf', 1024, 'application/pdf');
    fireFileInputChange(fixture, [f]);
    tick(1000); // simulate upload completion

    expect(ctrl.value).toBeInstanceOf(File);
    expect((ctrl.value as File).name).toBe('test.pdf');
    expect(ctrl.dirty).toBeTrue();
  }));

  it('should clear FormControl when all files are removed', fakeAsync(() => {
    const ctrl = new FormControl(null);
    component.control = ctrl;
    component.accept = '*';
    fixture.detectChanges();

    fireFileInputChange(fixture, [makeFile('test.pdf', 1024, 'application/pdf')]);
    tick(1000);
    expect(ctrl.value).toBeTruthy();

    component.removeFile(0);
    expect(ctrl.value).toBeNull();
  }));

  // ── Drag events ─────────────────────────────────────────────────────────────
  it('should set isDragging on dragover', () => {
    component.showDropZone = true;
    component.disabled = false;
    fixture.detectChanges();
    const event = new DragEvent('dragover');
    component.onDragOver(event);
    expect(component.isDragging).toBeTrue();
  });

  it('should clear isDragging on dragleave', () => {
    component.isDragging = true;
    component.onDragLeave(new DragEvent('dragleave'));
    expect(component.isDragging).toBeFalse();
  });

  it('should not set isDragging when disabled', () => {
    component.disabled = true;
    component.onDragOver(new DragEvent('dragover'));
    expect(component.isDragging).toBeFalse();
  });

  // ── Utility: formatSize ─────────────────────────────────────────────────────
  it('should format bytes correctly', () => {
    expect(component.formatSize(500)).toBe('500 B');
    expect(component.formatSize(2048)).toBe('2.0 KB');
    expect(component.formatSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  // ── Utility: getFileIcon ────────────────────────────────────────────────────
  it('should return correct icon for known extensions', () => {
    expect(component.getFileIcon('report.pdf')).toBe('bi-file-earmark-pdf');
    expect(component.getFileIcon('data.xlsx')).toBe('bi-file-earmark-excel');
    expect(component.getFileIcon('photo.png')).toBe('bi-file-earmark-image');
    expect(component.getFileIcon('archive.zip')).toBe('bi-file-earmark-zip');
    expect(component.getFileIcon('unknown.xyz')).toBe('bi-file-earmark');
  });

  // ── showValidationError ─────────────────────────────────────────────────────
  it('should show validation error when control is invalid and touched', () => {
    const ctrl = new FormControl(null, Validators.required);
    component.control = ctrl;
    fixture.detectChanges();

    ctrl.markAsTouched();
    ctrl.markAsDirty();
    fixture.detectChanges();

    expect(component.showValidationError).toBeTrue();
  });

  it('should NOT show validation error when control is untouched', () => {
    const ctrl = new FormControl(null, Validators.required);
    component.control = ctrl;
    fixture.detectChanges();
    expect(component.showValidationError).toBeFalse();
  });

  // ── Disabled state ──────────────────────────────────────────────────────────
  it('should add disabled class when disabled=true', () => {
    component.disabled = true;
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('.file-upload-wrapper');
    expect(wrapper.classList).toContain('disabled');
  });
});
