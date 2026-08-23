import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { CssdConsole } from './cssd-console.js';
import { CssdApiService } from './cssd-api.service.js';

describe('CssdConsole', () => {
  function setup() {
    const api = {
      listInstruments: jest.fn().mockReturnValue(of([])),
      createInstrument: jest.fn().mockReturnValue(of({})),
      deactivateInstrument: jest.fn().mockReturnValue(of({})),
      reactivateInstrument: jest.fn().mockReturnValue(of({})),
      listCycles: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      startCycle: jest.fn().mockReturnValue(of({})),
      completeCycle: jest.fn().mockReturnValue(of({})),
      failCycle: jest.fn().mockReturnValue(of({})),
    } as unknown as CssdApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [CssdConsole],
      providers: [
        { provide: CssdApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(CssdConsole);
    return { fixture, api, messageService };
  }

  it('loads instruments and cycles on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listInstruments).toHaveBeenCalled();
    expect(api.listCycles).toHaveBeenCalled();
  });

  it('creates an instrument and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openInstrumentModal();
    fixture.componentInstance.instrumentForm.set({ code: 'F-01', name: 'Forceps', quantity: 5 });
    fixture.componentInstance.submitInstrument();
    await fixture.whenStable();

    expect(api.createInstrument).toHaveBeenCalledWith({ code: 'F-01', name: 'Forceps', quantity: 5 });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Instrument added' }));
  });

  it('starts a sterilization cycle', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.cycleForm.set({ instrumentId: 'i1', method: 'Steam' });
    fixture.componentInstance.submitCycle();
    await fixture.whenStable();

    expect(api.startCycle).toHaveBeenCalledWith({ instrumentId: 'i1', method: 'Steam' });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Sterilization cycle started' }));
  });

  it('completes a cycle with the given sterile hours', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCompleteModal({ id: 'c1' } as never);
    fixture.componentInstance.sterileHours.set(72);
    fixture.componentInstance.submitComplete();
    await fixture.whenStable();

    expect(api.completeCycle).toHaveBeenCalledWith('c1', { sterileHours: 72 });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Cycle completed' }));
  });

  it('fails a cycle with a reason', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openFailModal({ id: 'c1' } as never);
    fixture.componentInstance.failureReason.set('Indicator failed');
    fixture.componentInstance.submitFail();
    await fixture.whenStable();

    expect(api.failCycle).toHaveBeenCalledWith('c1', { failureReason: 'Indicator failed' });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Cycle marked failed' }));
  });

  it('shows an error toast when creating an instrument fails', async () => {
    const { fixture, api } = setup();
    (api.createInstrument as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Duplicate code', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.instrumentForm.set({ code: 'DUP', name: 'X' });
    fixture.componentInstance.submitInstrument();
    await fixture.whenStable();

    expect(fixture.componentInstance.instrumentError()).toBe('Duplicate code');
  });
});
