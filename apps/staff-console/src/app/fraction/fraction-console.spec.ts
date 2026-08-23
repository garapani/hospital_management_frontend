import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { FractionConsole } from './fraction-console.js';
import { FractionApiService } from './fraction-api.service.js';

describe('FractionConsole', () => {
  function setup() {
    const api = {
      listRules: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      createRule: jest.fn().mockReturnValue(of({})),
      deactivateRule: jest.fn().mockReturnValue(of({})),
      reactivateRule: jest.fn().mockReturnValue(of({})),
      listEntries: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      recordEntry: jest.fn().mockReturnValue(of({})),
    } as unknown as FractionApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [FractionConsole],
      providers: [
        { provide: FractionApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(FractionConsole);
    return { fixture, api, messageService };
  }

  it('loads rules and entries on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listRules).toHaveBeenCalled();
    expect(api.listEntries).toHaveBeenCalled();
  });

  it('creates a rule and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openRuleModal();
    fixture.componentInstance.ruleForm.set({ doctorId: 'd1', fractionPercent: 30 });
    fixture.componentInstance.submitRule();
    await fixture.whenStable();

    expect(api.createRule).toHaveBeenCalledWith({ doctorId: 'd1', fractionPercent: 30 });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Rule created' }));
  });

  it('records a share and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openEntryModal();
    fixture.componentInstance.entryForm.set({ invoiceId: 'inv1', doctorId: 'd1' });
    fixture.componentInstance.submitEntry();
    await fixture.whenStable();

    expect(api.recordEntry).toHaveBeenCalledWith({ invoiceId: 'inv1', doctorId: 'd1' });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Share recorded' }));
  });

  it('shows an error toast when creating a rule fails', async () => {
    const { fixture, api } = setup();
    (api.createRule as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid doctor', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.ruleForm.set({ doctorId: 'bad', fractionPercent: 10 });
    fixture.componentInstance.submitRule();
    await fixture.whenStable();

    expect(fixture.componentInstance.ruleError()).toBe('Invalid doctor');
  });
});
