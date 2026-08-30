import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { FixedAssetsConsole } from './fixed-assets-console.js';
import { FixedAssetsApiService } from './fixed-assets-api.service.js';

describe('FixedAssetsConsole', () => {
  function setup(canManage = true) {
    const api = {
      listCategories: jest.fn().mockReturnValue(of([])),
      createCategory: jest.fn().mockReturnValue(of({})),
      deactivateCategory: jest.fn().mockReturnValue(of({})),
      reactivateCategory: jest.fn().mockReturnValue(of({})),
      listAssets: jest.fn().mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } })),
      createAsset: jest.fn().mockReturnValue(of({ id: 'a1', assetCode: 'FA-0001' })),
      getValuation: jest.fn().mockReturnValue(of({})),
      deactivateAsset: jest.fn().mockReturnValue(of({})),
      reactivateAsset: jest.fn().mockReturnValue(of({})),
    } as unknown as FixedAssetsApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;
    const auth = { hasPermission: () => canManage } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [FixedAssetsConsole],
      providers: [
        { provide: FixedAssetsApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
        { provide: ConfirmationService, useValue: confirmationService },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(FixedAssetsConsole);
    return { fixture, api, messageService, confirmationService };
  }

  it('loads categories and assets on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listCategories).toHaveBeenCalled();
    expect(api.listAssets).toHaveBeenCalled();
  });

  it('adds a category and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.newCategoryName.set('Medical Equipment');
    fixture.componentInstance.addCategory();
    await fixture.whenStable();

    expect(api.createCategory).toHaveBeenCalledWith('Medical Equipment');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Category added' }));
  });

  it('registers an asset and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openAssetModal();
    fixture.componentInstance.assetForm.set({ categoryId: 'c1', name: 'MRI Machine', purchaseDate: '2026-01-01', purchaseCost: 5000000 });
    fixture.componentInstance.submitAsset();
    await fixture.whenStable();

    expect(api.createAsset).toHaveBeenCalledWith({ categoryId: 'c1', name: 'MRI Machine', purchaseDate: '2026-01-01', purchaseCost: 5000000 });
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Asset registered' }));
  });

  it('loads the valuation dialog for an asset', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.viewValuation({ id: 'a1', assetCode: 'FA-0001', name: 'MRI Machine' } as never);
    await fixture.whenStable();

    expect(api.getValuation).toHaveBeenCalledWith('a1');
    expect(fixture.componentInstance.showValuation()).toBe(true);
  });

  it('shows an error toast when registering an asset fails', async () => {
    const { fixture, api } = setup();
    (api.createAsset as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid category', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.assetForm.set({ categoryId: 'bad', name: 'X', purchaseDate: '2026-01-01', purchaseCost: 1 });
    fixture.componentInstance.submitAsset();
    await fixture.whenStable();

    expect(fixture.componentInstance.assetError()).toBe('Invalid category');
  });

  it('confirms before deactivating an asset, but not before reactivating one', async () => {
    const { fixture, api, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.toggleAssetActive({ id: 'a1', isActive: true, assetCode: 'FA-0001', name: 'MRI' } as never);
    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(api.deactivateAsset).toHaveBeenCalledWith('a1');

    fixture.componentInstance.toggleAssetActive({ id: 'a2', isActive: false, assetCode: 'FA-0002', name: 'X-Ray' } as never);
    expect(api.reactivateAsset).toHaveBeenCalledWith('a2');
  });

  it('loads assets with page/limit, page 1 on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listAssets).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('hides mutating actions for a read-only user', async () => {
    const { fixture } = setup(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
  });
});
