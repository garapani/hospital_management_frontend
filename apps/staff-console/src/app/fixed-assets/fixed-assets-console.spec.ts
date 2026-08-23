import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { FixedAssetsConsole } from './fixed-assets-console.js';
import { FixedAssetsApiService } from './fixed-assets-api.service.js';

describe('FixedAssetsConsole', () => {
  function setup() {
    const api = {
      listCategories: jest.fn().mockReturnValue(of([])),
      createCategory: jest.fn().mockReturnValue(of({})),
      deactivateCategory: jest.fn().mockReturnValue(of({})),
      reactivateCategory: jest.fn().mockReturnValue(of({})),
      listAssets: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      createAsset: jest.fn().mockReturnValue(of({ id: 'a1', assetCode: 'FA-0001' })),
      getValuation: jest.fn().mockReturnValue(of({})),
      deactivateAsset: jest.fn().mockReturnValue(of({})),
      reactivateAsset: jest.fn().mockReturnValue(of({})),
    } as unknown as FixedAssetsApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [FixedAssetsConsole],
      providers: [
        { provide: FixedAssetsApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(FixedAssetsConsole);
    return { fixture, api, messageService };
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
});
