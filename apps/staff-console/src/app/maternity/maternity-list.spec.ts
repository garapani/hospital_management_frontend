import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { MaternityList } from './maternity-list.js';
import { MaternityApiService } from './maternity-api.service.js';

describe('MaternityList', () => {
  function setup() {
    const api = {
      list: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      findOne: jest.fn().mockReturnValue(of({})),
      create: jest.fn().mockReturnValue(of({})),
      recordDelivery: jest.fn().mockReturnValue(of({})),
    } as unknown as MaternityApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [MaternityList],
      providers: [
        { provide: MaternityApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(MaternityList);
    return { fixture, api, messageService };
  }

  it('loads records on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.list).toHaveBeenCalledWith({ patientId: undefined, page: 1, limit: 20 });
  });

  it('creates a maternity record and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.set({ admissionId: 'adm-1', patientId: 'p1', gravida: 2, para: 1 });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledWith({ admissionId: 'adm-1', patientId: 'p1', gravida: 2, para: 1 });
    expect(fixture.componentInstance.showCreateModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Maternity record created' }));
  });

  it('records a delivery and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeliveryModal({ id: 'r1' } as never);
    fixture.componentInstance.deliveryForm.set({ deliveryDate: '2026-08-23', deliveryType: 'Normal', babyCount: 1 });
    fixture.componentInstance.submitDelivery();
    await fixture.whenStable();

    expect(api.recordDelivery).toHaveBeenCalledWith('r1', { deliveryDate: '2026-08-23', deliveryType: 'Normal', babyCount: 1 });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Delivery recorded' }));
  });

  it('shows an error toast when creating a record fails', async () => {
    const { fixture, api } = setup();
    (api.create as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid patient', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createForm.set({ admissionId: 'bad', patientId: 'bad' });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(fixture.componentInstance.createError()).toBe('Invalid patient');
  });
});
