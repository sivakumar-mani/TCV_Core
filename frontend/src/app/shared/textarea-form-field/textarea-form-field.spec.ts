import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextareaFormField } from './textarea-form-field';

describe('TextareaFormField', () => {
  let component: TextareaFormField;
  let fixture: ComponentFixture<TextareaFormField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextareaFormField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextareaFormField);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
