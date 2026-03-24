import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrandsList } from './brands-list';

describe('BrandsList', () => {
  let component: BrandsList;
  let fixture: ComponentFixture<BrandsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandsList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BrandsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
