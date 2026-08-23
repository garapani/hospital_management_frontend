import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { WardSupplyConsole } from './ward-supply-console.js';
import { WardSupplyApiService } from './ward-supply-api.service.js';

describe('WardSupplyConsole', () => {
  function setup() {
    const api = {
      listBalances: jest.fn().mockReturnValue(of([])),
      listTransactions: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      receiveStock: jest.fn().mockReturnValue(of({})),
      consumeStock: jest.fn().mockReturnValue(of({})),
    } as unknown as WardSupplyApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [WardSupplyConsole],
      providers: [
        { provide: WardSupplyApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(WardSupplyConsole);
    return { fixture, api, messageService };
  }

  it('loads balances and transactions on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listBalances).toHaveBeenCalled();
    expect(api.listTransactions).toHaveBeenCalled();
  });

  it('receives stock and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openReceiveModal();
    fixture.componentInstance.receiveForm.set({ departmentId: 'd1', itemId: 'i1', quantity: 10 });
    fixture.componentInstance.submitReceive();
    await fixture.whenStable();

    expect(api.receiveStock).toHaveBeenCalledWith({ departmentId: 'd1', itemId: 'i1', quantity: 10 });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Stock received' }));
  });

  it('consumes stock and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openConsumeModal();
    fixture.componentInstance.consumeForm.set({ departmentId: 'd1', itemId: 'i1', quantity: 5 });
    fixture.componentInstance.submitConsume();
    await fixture.whenStable();

    expect(api.consumeStock).toHaveBeenCalledWith({ departmentId: 'd1', itemId: 'i1', quantity: 5 });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Stock consumed' }));
  });

  it('shows an error toast when receiving fails', async () => {
    const { fixture, api } = setup();
    (api.receiveStock as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid item', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.receiveForm.set({ departmentId: 'd1', itemId: 'bad', quantity: 10 });
    fixture.componentInstance.submitReceive();
    await fixture.whenStable();

    expect(fixture.componentInstance.receiveError()).toBe('Invalid item');
  });
});
