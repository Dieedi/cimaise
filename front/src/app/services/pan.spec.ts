import { TestBed } from '@angular/core/testing';

import { PanService } from './pan';

describe('PanService', () => {
  let service: PanService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PanService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
