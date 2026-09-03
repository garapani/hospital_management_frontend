import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@org/auth';
import { WardBoard } from './ward-board.js';
import { AdmissionsApiService, ActiveAdmission } from './admissions-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Ward, Bed } from '../master-data/master-data.model.js';

describe('WardBoard', () => {
  const wardA: Ward = {
    id: 'ward-1', wardCode: 'W1', wardName: 'ICU', wardType: 'ICU', bedCapacity: 2, isActive: true, createdAt: '', updatedAt: '',
  };
  const wardB: Ward = {
    id: 'ward-2', wardCode: 'W2', wardName: 'General', wardType: 'General', bedCapacity: 1, isActive: true, createdAt: '', updatedAt: '',
  };
  const bedAvailable: Bed = { id: 'bed-1', wardId: 'ward-1', bedNumber: '1', bedType: null, status: 'Available', isActive: true, createdAt: '' };
  const bedOccupied: Bed = { id: 'bed-2', wardId: 'ward-1', bedNumber: '2', bedType: null, status: 'Occupied', isActive: true, createdAt: '' };
  const admission: ActiveAdmission = {
    id: 'admission-1', patientId: 'patient-1', admissionSource: 'ER', sourceAppointmentId: null, sourceTriageEntryId: null,
    admittingDoctorId: 'doctor-1', wardId: 'ward-1', bedId: 'bed-2', admissionDate: '2026-09-01T00:00:00Z', status: 'Admitted',
    dischargeDate: null, dischargeType: null, dischargeCondition: null, dischargeSummary: null, dischargedBy: null,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    patientDisplayName: 'Jane Doe', patientNo: 'PAT-2026-00001',
  };

  function setup(options: { wardId?: string } = {}) {
    const masterDataApi = {
      listWards: jest.fn().mockReturnValue(of([wardA, wardB])),
      listBedsByWard: jest.fn().mockReturnValue(of([bedAvailable, bedOccupied])),
    } as unknown as MasterDataApiService;
    const admissionsApi = {
      listActive: jest.fn().mockReturnValue(of([admission])),
    } as unknown as AdmissionsApiService;
    const auth = { currentUser: () => (options.wardId ? { sub: 'nurse-1', wardId: options.wardId } : { sub: 'nurse-1' }) } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [WardBoard],
      providers: [
        provideRouter([]),
        { provide: MasterDataApiService, useValue: masterDataApi },
        { provide: AdmissionsApiService, useValue: admissionsApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(WardBoard);
    return { fixture, masterDataApi, admissionsApi };
  }

  it('defaults to the first ward and loads its beds joined with active admissions', async () => {
    const { fixture, masterDataApi, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedWardId()).toBe('ward-1');
    expect(masterDataApi.listBedsByWard).toHaveBeenCalledWith('ward-1');
    expect(admissionsApi.listActive).toHaveBeenCalledWith('ward-1');

    const beds = fixture.componentInstance.beds();
    expect(beds).toHaveLength(2);
    expect(beds.find((b) => b.id === 'bed-2')?.admission?.patientDisplayName).toBe('Jane Doe');
    expect(beds.find((b) => b.id === 'bed-1')?.admission).toBeNull();
    expect(fixture.componentInstance.availableCount()).toBe(1);
    expect(fixture.componentInstance.occupiedCount()).toBe(1);
    expect(fixture.componentInstance.maintenanceCount()).toBe(0);
  });

  it("defaults to the viewer's own assigned ward when she has one", async () => {
    const { fixture, masterDataApi } = setup({ wardId: 'ward-2' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedWardId()).toBe('ward-2');
    expect(masterDataApi.listBedsByWard).toHaveBeenCalledWith('ward-2');
  });

  it('reloads beds when the ward selection changes', async () => {
    const { fixture, masterDataApi, admissionsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectWard('ward-2');
    await fixture.whenStable();

    expect(masterDataApi.listBedsByWard).toHaveBeenCalledWith('ward-2');
    expect(admissionsApi.listActive).toHaveBeenCalledWith('ward-2');
  });

  it('filters beds by status and resets the filter', async () => {
    const { fixture } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.filteredBeds()).toHaveLength(2);

    fixture.componentInstance.setStatusFilter('Available');
    expect(fixture.componentInstance.filteredBeds()).toHaveLength(1);
    expect(fixture.componentInstance.filteredBeds()[0].status).toBe('Available');

    fixture.componentInstance.setStatusFilter('Occupied');
    expect(fixture.componentInstance.filteredBeds()).toHaveLength(1);
    expect(fixture.componentInstance.filteredBeds()[0].status).toBe('Occupied');

    fixture.componentInstance.resetStatusFilter();
    expect(fixture.componentInstance.statusFilter()).toBeNull();
    expect(fixture.componentInstance.filteredBeds()).toHaveLength(2);
  });
});

