import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { InventoryItemList } from './inventory-item-list.js';
import { InventoryApiService, InventoryItem, InventoryItemSubCategory } from '../inventory-api.service.js';

describe('InventoryItemList', () => {
  function setup() {
    const inventoryApi = {
      listCategories: jest.fn().mockReturnValue(of([])),
      listSubCategories: jest.fn().mockReturnValue(of([])),
      listItemsBySubCategory: jest.fn().mockReturnValue(of([])),
    } as unknown as InventoryApiService;

    TestBed.configureTestingModule({
      imports: [InventoryItemList],
      providers: [{ provide: InventoryApiService, useValue: inventoryApi }],
    });

    const fixture = TestBed.createComponent(InventoryItemList);
    return { fixture, inventoryApi };
  }

  it('loads categories on init', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inventoryApi.listCategories).toHaveBeenCalledTimes(1);
  });

  it('loads sub-categories when a category is selected and resets dependent state', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.listSubCategories as jest.Mock).mockReturnValue(
      of([{ id: 'sub-1', categoryId: 'cat-1', name: 'Tablets', isConsumable: true }]),
    );
    fixture.componentInstance.items.set([{ id: 'stale' } as InventoryItem]);
    fixture.detectChanges();

    fixture.componentInstance.onCategoryChange('cat-1');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedCategoryId()).toBe('cat-1');
    expect(inventoryApi.listSubCategories).toHaveBeenCalledWith('cat-1');
    expect(fixture.componentInstance.subCategories()).toEqual([
      { id: 'sub-1', categoryId: 'cat-1', name: 'Tablets', isConsumable: true },
    ]);
    expect(fixture.componentInstance.selectedSubCategoryId()).toBe('');
    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('does not load sub-categories when the category filter is cleared', async () => {
    const { fixture, inventoryApi } = setup();
    fixture.detectChanges();

    fixture.componentInstance.onCategoryChange('');

    expect(inventoryApi.listSubCategories).not.toHaveBeenCalled();
    expect(fixture.componentInstance.subCategories()).toEqual([]);
  });

  it('loads items when a sub-category is selected', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.listItemsBySubCategory as jest.Mock).mockReturnValue(
      of([{ id: 'item-1', subCategoryId: 'sub-1', name: 'Paracetamol', code: 'PCM-001', unitOfMeasure: 'Tab', salePrice: 5 }]),
    );
    fixture.detectChanges();

    fixture.componentInstance.onSubCategoryChange('sub-1');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inventoryApi.listItemsBySubCategory).toHaveBeenCalledWith('sub-1');
    expect(fixture.componentInstance.items()).toEqual([
      expect.objectContaining({ id: 'item-1', name: 'Paracetamol', code: 'PCM-001', unitOfMeasure: 'Tab', salePrice: 5 }),
    ]);
  });

  it('clears the loading flag when the categories request errors', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.listCategories as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.categoriesLoading()).toBe(false);
  });

  it('does not let a slower earlier category response overwrite a later one that resolved first', async () => {
    const { fixture, inventoryApi } = setup();
    const firstResponse$ = new Subject<InventoryItemSubCategory[]>();
    const secondResponse$ = new Subject<InventoryItemSubCategory[]>();
    (inventoryApi.listSubCategories as jest.Mock).mockReturnValueOnce(firstResponse$).mockReturnValueOnce(secondResponse$);
    fixture.detectChanges();

    fixture.componentInstance.onCategoryChange('cat-1');
    fixture.componentInstance.onCategoryChange('cat-2');
    secondResponse$.next([{ id: 'sub-2', categoryId: 'cat-2', name: 'Syrups', isConsumable: true, createdAt: '', updatedAt: '' }]);
    firstResponse$.next([{ id: 'sub-1', categoryId: 'cat-1', name: 'Tablets', isConsumable: true, createdAt: '', updatedAt: '' }]);

    expect(fixture.componentInstance.subCategories()).toEqual([
      { id: 'sub-2', categoryId: 'cat-2', name: 'Syrups', isConsumable: true, createdAt: '', updatedAt: '' },
    ]);
  });

  it('clears the loading flag when the items request errors', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.listItemsBySubCategory as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();

    fixture.componentInstance.onSubCategoryChange('sub-1');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.itemsLoading()).toBe(false);
    expect(fixture.componentInstance.items()).toEqual([]);
  });
});
