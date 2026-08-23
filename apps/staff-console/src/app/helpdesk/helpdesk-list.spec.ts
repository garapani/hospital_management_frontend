import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { HelpdeskList } from './helpdesk-list.js';
import { HelpdeskApiService } from './helpdesk-api.service.js';

describe('HelpdeskList', () => {
  function setup() {
    const api = {
      list: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      create: jest.fn().mockReturnValue(of({ id: 't1', ticketNumber: 'HD-0001' })),
      assign: jest.fn().mockReturnValue(of({})),
      start: jest.fn().mockReturnValue(of({})),
      resolve: jest.fn().mockReturnValue(of({})),
      close: jest.fn().mockReturnValue(of({})),
    } as unknown as HelpdeskApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [HelpdeskList],
      providers: [
        { provide: HelpdeskApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(HelpdeskList);
    return { fixture, api, messageService };
  }

  it('loads tickets on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.list).toHaveBeenCalledWith({ q: undefined, status: undefined, page: 1, limit: 20 });
  });

  it('creates a ticket and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.createForm.set({ title: 'Printer broken', description: 'Ward 3' });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledWith({ title: 'Printer broken', description: 'Ward 3' });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Ticket created' }));
  });

  it('starts, resolves, and closes a ticket', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.start({ id: 't1' } as never);
    await fixture.whenStable();
    expect(api.start).toHaveBeenCalledWith('t1');

    fixture.componentInstance.resolve({ id: 't1' } as never);
    await fixture.whenStable();
    expect(api.resolve).toHaveBeenCalledWith('t1');

    fixture.componentInstance.close({ id: 't1' } as never);
    await fixture.whenStable();
    expect(api.close).toHaveBeenCalledWith('t1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Ticket closed' }));
  });

  it('shows an error toast when creating a ticket fails', async () => {
    const { fixture, api } = setup();
    (api.create as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Title required', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.createForm.set({ title: '', description: 'X' });
    fixture.componentInstance.submitCreate();
    await fixture.whenStable();

    expect(fixture.componentInstance.createError()).toBe('Title required');
  });
});
