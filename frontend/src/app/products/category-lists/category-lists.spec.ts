import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryLists } from './category-lists';

describe('CategoryLists', () => {
  let component: CategoryLists;
  let fixture: ComponentFixture<CategoryLists>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryLists]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryLists);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
