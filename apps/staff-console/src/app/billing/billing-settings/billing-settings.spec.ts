import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { BillingSettingsComponent } from './billing-settings.js';
import { BillingSettingsApiService } from './billing-settings-api.service.js';

describe('BillingSettingsComponent', () => {
  function setup(updateResult: 'ok' | 'error') {
    const api = {
      getSettings: jest
        .fn()
        .mockReturnValue(
          of({ gstin: '27ABC', stateCode: 'MH', hospitalLegalName: 'Demo Hospital' }),
        ),
      updateSettings:
        updateResult === 'ok'
          ? jest.fn().mockReturnValue(of({ gstin: '27ABC', stateCode: 'MH', hospitalLegalName: 'Demo Hospital' }))
          : jest
              .fn()
              .mockReturnValue(
                throwError(() => ({ status: 500, message: 'boom' } as ApiError)),
              ),
    } as unknown as BillingSettingsApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [BillingSettingsComponent],
      providers: [
        { provide: BillingSettingsApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(BillingSettingsComponent);
    return { fixture, api, messageService };
  }

  it('loads the settings on construction', async () => {
    const { fixture, api } = setup('ok');
    await fixture.whenStable();

    expect(api.getSettings).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.settingsForm()).toEqual({
      gstin: '27ABC',
      stateCode: 'MH',
      hospitalLegalName: 'Demo Hospital',
    });
  });

  it('toasts success on save instead of alert()', async () => {
    const { fixture, api, messageService } = setup('ok');
    await fixture.whenStable();

    fixture.componentInstance.save();

    expect(api.updateSettings).toHaveBeenCalledWith(fixture.componentInstance.settingsForm());
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Settings saved' }),
    );
  });

  it('toasts failure on save instead of alert()', async () => {
    const { fixture, messageService } = setup('error');
    await fixture.whenStable();

    fixture.componentInstance.save();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Save failed' }),
    );
    expect(fixture.componentInstance.saving()).toBe(false);
  });
});
