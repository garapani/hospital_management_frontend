import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { AdmissionList } from './admission-list.js';
import { AdmissionsApiService } from './admissions-api.service.js';

describe('AdmissionList', () => {
  function setup() {
    const admissionsApi = {
      list: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      listActive: jest.fn().mockReturnValue(of([])),
      create: jest.fn().mockReturnValue(of({ id: 'admission-1' })),
    } as unknown as AdmissionsApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [AdmissionList],
      providers: [
        provideRouter([]),
        { provide: AdmissionsApiService, useValue: admissionsApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(AdmissionList);
    return { fixture, admissionsApi };
  }

  it('loads admissions on init, page 1', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(admissionsApi.list).toHaveBeenCalledTimes(1);
    const call = (admissionsApi.list as jest.Mock).mock.calls[0][0];
    expect(call.page).toBe(1);
    expect(call.limit).toBe(fixture.componentInstance.pageSize());
    expect(fixture.componentInstance.admissions()).toEqual([]);
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 20 });

    const call = (admissionsApi.list as jest.Mock).mock.calls[1][0];
    expect(call.page).toBe(3);
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });

  it('resets to page 1 when filters are applied', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.onLazyLoad({ first: 20 });

    fixture.componentInstance.applyFilters();

    expect(fixture.componentInstance.firstRecord()).toBe(0);
    const call = (admissionsApi.list as jest.Mock).mock.calls[2][0];
    expect(call.page).toBe(1);
  });

  it('fetches active admissions via the active endpoint when the view switches', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onViewChange('Active');

    expect(admissionsApi.listActive).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.view()).toBe('Active');
    expect(admissionsApi.list).toHaveBeenCalledTimes(1);
  });

  it('pages the Active view client-side over the already-fetched list, without refetching', async () => {
    const allActive = Array.from({ length: 35 }, (_, i) => ({ id: `admission-${i}` }));
    const { fixture, admissionsApi } = setup();
    (admissionsApi.listActive as jest.Mock).mockReturnValue(of(allActive));
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onViewChange('Active');
    await fixture.whenStable();

    expect(fixture.componentInstance.admissions()).toHaveLength(10);
    expect(fixture.componentInstance.admissions()[0].id).toBe('admission-0');
    expect(fixture.componentInstance.totalRecords()).toBe(35);

    fixture.componentInstance.onLazyLoad({ first: 20 });

    expect(admissionsApi.listActive).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.admissions()).toHaveLength(10);
    expect(fixture.componentInstance.admissions()[0].id).toBe('admission-20');
  });

  it('creates an admission via the API when the create form is submitted', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createForm.set({
      patientId: 'patient-1',
      admissionSource: 'ER',
      admittingDoctorId: 'doctor-1',
      bedId: 'bed-1',
    });
    fixture.componentInstance.submitCreate();

    expect(admissionsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ patientId: 'patient-1', admissionSource: 'ER', admittingDoctorId: 'doctor-1', bedId: 'bed-1' }),
    );
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
  });

  it('clears the loading flag when the list request errors', async () => {
    const { fixture, admissionsApi } = setup();
    (admissionsApi.list as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('clears the saving flag and keeps the modal open when create errors', async () => {
    const { fixture, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (admissionsApi.create as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.componentInstance.showCreateModal.set(true);
    fixture.componentInstance.submitCreate();

    expect(fixture.componentInstance.saving()).toBe(false);
    expect(fixture.componentInstance.showCreateModal()).toBe(true);
  });
});
