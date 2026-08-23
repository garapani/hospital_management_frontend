import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { VaccinationList } from './vaccination-list.js';
import { VaccinationApiService } from './vaccination-api.service.js';

describe('VaccinationList', () => {
  function setup() {
    const api = {
      list: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      record: jest.fn().mockReturnValue(of({})),
    } as unknown as VaccinationApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [VaccinationList],
      providers: [
        { provide: VaccinationApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(VaccinationList);
    return { fixture, api, messageService };
  }

  it('loads records on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.list).toHaveBeenCalledWith({ patientId: undefined, page: 1, limit: 20 });
  });

  it('records a vaccination and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openModal();
    fixture.componentInstance.form.set({ patientId: 'p1', vaccine: 'MMR', administeredDate: '2026-08-23' });
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(api.record).toHaveBeenCalledWith({ patientId: 'p1', vaccine: 'MMR', administeredDate: '2026-08-23' });
    expect(fixture.componentInstance.showModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Vaccination recorded' }));
  });

  it('shows an error toast when recording fails', async () => {
    const { fixture, api } = setup();
    (api.record as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid patient', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.form.set({ patientId: 'bad', vaccine: 'MMR', administeredDate: '2026-08-23' });
    fixture.componentInstance.submit();
    await fixture.whenStable();

    expect(fixture.componentInstance.error()).toBe('Invalid patient');
  });
});
