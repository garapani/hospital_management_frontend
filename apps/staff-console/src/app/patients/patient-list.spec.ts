import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@org/auth';
import { PatientList } from './patient-list.js';
import { PatientsApiService, Patient } from './patients-api.service.js';

describe('PatientList', () => {
  function setup(overrides: Partial<PatientsApiService> = {}) {
    const patientsApi = {
      search: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      create: jest.fn().mockReturnValue(of({ id: 'patient-1' } as Patient)),
      checkDuplicates: jest.fn().mockReturnValue(of([])),
      ...overrides,
    } as unknown as PatientsApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [PatientList],
      providers: [
        provideRouter([]),
        { provide: PatientsApiService, useValue: patientsApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(PatientList);
    return { fixture, patientsApi };
  }

  it('resets hasInsurance when the registration modal is (re)opened', () => {
    const { fixture } = setup();
    fixture.detectChanges();

    fixture.componentInstance.hasInsurance.set(true);
    fixture.componentInstance.openRegistration();

    expect(fixture.componentInstance.hasInsurance()).toBe(false);
  });

  it('sends the captured insurance fields when "Has Insurance?" is checked', async () => {
    const { fixture, patientsApi } = setup();
    fixture.detectChanges();

    fixture.componentInstance.hasInsurance.set(true);
    fixture.componentInstance.patientForm.set({
      firstName: 'Asha',
      lastName: 'Rao',
      gender: 'Female',
      insuranceProvider: 'Star Health',
      insurancePolicyNumber: 'SH-001',
      allowDuplicate: true,
    });
    await fixture.componentInstance.checkAndSubmit();

    expect(patientsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ insuranceProvider: 'Star Health', insurancePolicyNumber: 'SH-001' }),
    );
  });

  it('strips insurance fields from the payload when "Has Insurance?" is unchecked, even if previously typed', async () => {
    const { fixture, patientsApi } = setup();
    fixture.detectChanges();

    fixture.componentInstance.hasInsurance.set(false);
    fixture.componentInstance.patientForm.set({
      firstName: 'Vikram',
      lastName: 'Nair',
      gender: 'Male',
      // Simulates a value left over from before the checkbox was unchecked.
      insuranceProvider: 'Stale Provider',
      allowDuplicate: true,
    });
    await fixture.componentInstance.checkAndSubmit();

    const payload = (patientsApi.create as jest.Mock).mock.calls[0][0];
    expect(payload.insuranceProvider).toBeUndefined();
    expect(payload.insurancePolicyNumber).toBeUndefined();
  });
});
