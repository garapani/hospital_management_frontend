import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LabTests } from './lab-tests.js';
import { LabApiService, LabTest, LabTestCategory } from '../lab-api.service.js';

describe('LabTests', () => {
  const categories: LabTestCategory[] = [
    { id: 'cat-1', name: 'Hematology', displaySequence: 1, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' },
    { id: 'cat-2', name: 'Biochemistry', displaySequence: 2, createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z' },
  ];

  const tests: LabTest[] = [
    {
      id: 'test-1',
      categoryId: 'cat-1',
      name: 'Complete Blood Count',
      code: 'CBC',
      specimenType: 'Blood',
      price: 350,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
    {
      id: 'test-2',
      categoryId: 'cat-2',
      name: 'Lipid Profile',
      code: 'LIPID',
      specimenType: 'Blood',
      price: null,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];

  function setup(labApiOverrides: Partial<LabApiService> = {}) {
    const labApi = {
      listCategories: jest.fn().mockReturnValue(of(categories)),
      listTestsByCategory: jest.fn().mockReturnValue(of(tests)),
      ...labApiOverrides,
    } as unknown as LabApiService;

    TestBed.configureTestingModule({
      imports: [LabTests],
      providers: [{ provide: LabApiService, useValue: labApi }],
    });

    const fixture = TestBed.createComponent(LabTests);
    return { fixture, labApi };
  }

  it('loads categories on init and selects the first category', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(labApi.listCategories).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.categories()).toEqual(categories);
    expect(fixture.componentInstance.selectedCategoryId()).toBe('cat-1');
    expect(labApi.listTestsByCategory).toHaveBeenCalledWith('cat-1');
    expect(fixture.componentInstance.tests()).toEqual(tests);
  });

  it('loads the tests for a newly selected category', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectCategory('cat-2');

    expect(fixture.componentInstance.selectedCategoryId()).toBe('cat-2');
    expect(labApi.listTestsByCategory).toHaveBeenCalledWith('cat-2');
    expect(fixture.componentInstance.tests()).toEqual(tests);
  });

  it('ignores an undefined tab selection', async () => {
    const { fixture, labApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectCategory(undefined);

    expect(labApi.listTestsByCategory).toHaveBeenCalledTimes(1);
  });

  it('clears the loading flag when categories fail to load', async () => {
    const { fixture } = setup({
      listCategories: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.categories()).toEqual([]);
    expect(fixture.componentInstance.loadingCategories()).toBe(false);
  });

  it('clears the loading flag when the tests request errors', async () => {
    const { fixture } = setup({
      listTestsByCategory: jest.fn().mockReturnValue(throwError(() => new Error('boom'))),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.tests()).toEqual([]);
    expect(fixture.componentInstance.loadingTests()).toBe(false);
  });
});
