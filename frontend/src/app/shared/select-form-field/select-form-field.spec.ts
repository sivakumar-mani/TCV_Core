import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectFormField } from './select-form-field';

describe('SelectFormField', () => {
  let component: SelectFormField;
  let fixture: ComponentFixture<SelectFormField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectFormField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectFormField);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
