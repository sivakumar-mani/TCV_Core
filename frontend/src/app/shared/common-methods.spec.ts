import { TestBed } from '@angular/core/testing';

import { CommonMethods } from './common-methods';

describe('CommonMethods', () => {
  let service: CommonMethods;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommonMethods);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
