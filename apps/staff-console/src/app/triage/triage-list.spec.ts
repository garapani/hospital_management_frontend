import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@org/auth';
import { TriageList } from './triage-list.js';
import { TriageApiService, TriageEntry } from './triage-api.service.js';

describe('TriageList', () => {
  function setup(entries: TriageEntry[] = []) {
    const triageApi = {
      listActive: jest.fn().mockReturnValue(
        of({ data: entries, meta: { total: entries.length, page: 1, limit: 10, totalPages: 1 } }),
      ),
      create: jest.fn().mockReturnValue(of({})),
    } as unknown as TriageApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [TriageList],
      providers: [
        provideRouter([]),
        { provide: TriageApiService, useValue: triageApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(TriageList);
    return { fixture, triageApi };
  }

  it('loads the active triage queue on init', async () => {
    const { fixture, triageApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(triageApi.listActive).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.entries()).toEqual([]);
  });

  it('creates a triage entry and reloads the queue', async () => {
    const { fixture, triageApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createForm.set({ firstName: 'Jane', chiefComplaint: 'Chest pain' });
    fixture.componentInstance.submitCreate();

    expect(triageApi.create).toHaveBeenCalledWith({ firstName: 'Jane', chiefComplaint: 'Chest pain' });
    expect(triageApi.listActive).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
  });

  it('requests the correct page when the table lazy-loads a later page', async () => {
    const { fixture, triageApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.onLazyLoad({ first: 20 });

    expect(triageApi.listActive).toHaveBeenLastCalledWith({ page: 3, limit: 10 });
    expect(fixture.componentInstance.firstRecord()).toBe(20);
  });
});
