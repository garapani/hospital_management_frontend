import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@org/auth';
import { GlobalSearchComponent } from './global-search.js';
import { Patient, PatientsApiService } from '../../patients/patients-api.service.js';

function fakePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    patientNo: 'PAT-2026-00001',
    firstName: 'Asha',
    lastName: 'Rao',
    gender: 'Female',
    phoneNumber: '9999999999',
    isActive: true,
    createdAt: '2026-08-09T00:00:00Z',
    updatedAt: '2026-08-09T00:00:00Z',
    ...overrides,
  };
}

function fakeAuth(canSearch = true): AuthService {
  return { hasPermission: () => canSearch } as unknown as AuthService;
}

function setup(opts: { canSearch?: boolean; searchResult?: Patient[] } = {}) {
  const search = jest.fn().mockReturnValue(
    of({ data: opts.searchResult ?? [fakePatient()], meta: { total: 1, page: 1, limit: 8, totalPages: 1 } }),
  );
  const patientsApi = { search } as unknown as PatientsApiService;
  const navigate = jest.fn();
  const router = { navigate } as unknown as Router;

  TestBed.configureTestingModule({
    imports: [GlobalSearchComponent],
    providers: [
      { provide: PatientsApiService, useValue: patientsApi },
      { provide: AuthService, useValue: fakeAuth(opts.canSearch ?? true) },
      { provide: Router, useValue: router },
    ],
  });

  const fixture = TestBed.createComponent(GlobalSearchComponent);
  fixture.detectChanges();
  return { fixture, search, navigate };
}

function ctrlK(): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
}

describe('GlobalSearchComponent', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('opens on Ctrl+K when the account has patients.read', () => {
    const { fixture } = setup({ canSearch: true });
    document.dispatchEvent(ctrlK());

    expect(fixture.componentInstance.open()).toBe(true);
  });

  it('does nothing on Ctrl+K without patients.read', () => {
    const { fixture } = setup({ canSearch: false });
    document.dispatchEvent(ctrlK());

    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('closes on Escape', () => {
    const { fixture } = setup();
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance.open()).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('debounces the query and searches patients.read via PatientsApiService', () => {
    jest.useFakeTimers();
    const { fixture, search } = setup();
    const component = fixture.componentInstance;
    component.toggle();

    component.onQueryChange('asha');
    expect(search).not.toHaveBeenCalled();

    jest.advanceTimersByTime(250);
    expect(search).toHaveBeenCalledWith({ page: 1, limit: 8, q: 'asha' });
    expect(component.results()).toHaveLength(1);
  });

  it('clears results for an empty/whitespace query without calling the API', () => {
    jest.useFakeTimers();
    const { fixture, search } = setup();
    const component = fixture.componentInstance;
    component.toggle();

    component.onQueryChange('   ');
    jest.advanceTimersByTime(250);

    expect(search).not.toHaveBeenCalled();
    expect(component.results()).toHaveLength(0);
  });

  it('selecting a result navigates to the patient detail route and closes the palette', () => {
    const { fixture, navigate } = setup();
    const component = fixture.componentInstance;
    component.toggle();
    component.results.set([fakePatient({ id: 'patient-42' })]);

    component.select(component.results()[0]);

    expect(navigate).toHaveBeenCalledWith(['/clinical/patients', 'patient-42']);
    expect(component.open()).toBe(false);
  });

  it('ArrowDown/ArrowUp move the active index within bounds', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;
    component.toggle();
    component.results.set([fakePatient({ id: 'p1' }), fakePatient({ id: 'p2' })]);
    component.activeIndex.set(0);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.activeIndex()).toBe(1);

    // Stays at the last index rather than overflowing.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(component.activeIndex()).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(component.activeIndex()).toBe(0);
  });

  it('Enter selects the active result and navigates', () => {
    const { fixture, navigate } = setup();
    const component = fixture.componentInstance;
    component.toggle();
    component.results.set([fakePatient({ id: 'patient-7' })]);
    component.activeIndex.set(0);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(navigate).toHaveBeenCalledWith(['/clinical/patients', 'patient-7']);
  });
});
