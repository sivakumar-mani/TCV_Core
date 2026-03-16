import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputFormField } from './input-form-field';

describe('InputFormField', () => {
  let component: InputFormField;
  let fixture: ComponentFixture<InputFormField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputFormField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputFormField);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
