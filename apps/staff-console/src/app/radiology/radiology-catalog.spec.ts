import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { RadiologyCatalog } from './radiology-catalog.js';
import { RadiologyApiService } from './radiology-api.service.js';
import { RadiologyImagingItem, RadiologyImagingType } from './radiology.model.js';

describe('RadiologyCatalog', () => {
  const types: RadiologyImagingType[] = [
    {
      id: 'type-1',
      name: 'X-Ray',
      procedureCoding: null,
      displaySequence: 1,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];
  const items: RadiologyImagingItem[] = [
    {
      id: 'item-1',
      imagingTypeId: 'type-1',
      name: 'Chest X-Ray PA',
      procedureCode: null,
      displaySequence: 1,
      price: 500,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];

  function setup() {
    const radiologyApi = {
      listImagingTypes: jest.fn().mockReturnValue(of(types)),
      listItemsByType: jest.fn().mockReturnValue(of(items)),
    } as unknown as RadiologyApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [RadiologyCatalog],
      providers: [
        { provide: RadiologyApiService, useValue: radiologyApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(RadiologyCatalog);
    return { fixture, radiologyApi };
  }

  it('loads imaging types on init', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(radiologyApi.listImagingTypes).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.types()).toEqual(types);
    expect(fixture.componentInstance.typeOptions()).toEqual([{ label: 'X-Ray', value: 'type-1' }]);
  });

  it('loads items when an imaging type is selected', async () => {
    const { fixture, radiologyApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onTypeChange('type-1');

    expect(radiologyApi.listItemsByType).toHaveBeenCalledWith('type-1');
    expect(fixture.componentInstance.selectedTypeId()).toBe('type-1');
    expect(fixture.componentInstance.items()).toEqual(items);
  });

  it('clears items when the type selection is cleared', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onTypeChange('type-1');
    fixture.componentInstance.onTypeChange('');

    expect(fixture.componentInstance.items()).toEqual([]);
    expect(fixture.componentInstance.loadingItems()).toBe(false);
  });

  it('clears the loading flag when loading types errors', async () => {
    const { fixture, radiologyApi } = setup();
    (radiologyApi.listImagingTypes as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loadingTypes()).toBe(false);
  });

  it('clears the loading flag when loading items errors', async () => {
    const { fixture, radiologyApi } = setup();
    (radiologyApi.listItemsByType as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onTypeChange('type-1');

    expect(fixture.componentInstance.loadingItems()).toBe(false);
  });

  it('resets type selection via resetType()', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onTypeChange('type-1');
    expect(fixture.componentInstance.selectedTypeId()).toBe('type-1');

    fixture.componentInstance.resetType();
    expect(fixture.componentInstance.selectedTypeId()).toBe('');
    expect(fixture.componentInstance.items()).toEqual([]);
  });
});

