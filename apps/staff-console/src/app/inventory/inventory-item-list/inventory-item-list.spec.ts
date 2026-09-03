import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { InventoryItemList } from './inventory-item-list.js';
import { InventoryApiService, InventoryItem, InventoryItemSubCategory, LowStockItem } from '../inventory-api.service.js';

describe('InventoryItemList', () => {
  function setup(opts: { lowStockItems?: LowStockItem[] | 'error'; canManageCatalog?: boolean } = {}) {
    const inventoryApi = {
      listCategories: jest.fn().mockReturnValue(of([])),
      listSubCategories: jest.fn().mockReturnValue(of([])),
      listItemsBySubCategory: jest.fn().mockReturnValue(of([])),
      listLowStockItems: jest.fn().mockReturnValue(
        opts.lowStockItems === 'error' ? throwError(() => new Error('boom')) : of(opts.lowStockItems ?? []),
      ),
      createCategory: jest.fn().mockReturnValue(of({ id: 'cat-new', name: 'New Category', displaySequence: 0 })),
      createSubCategory: jest.fn().mockReturnValue(
        of({ id: 'sub-new', categoryId: 'cat-1', name: 'New Sub', isConsumable: false }),
      ),
      createItem: jest.fn().mockReturnValue(
        of({ id: 'item-new', subCategoryId: 'sub-1', name: 'New Item', code: 'NI-1', unitOfMeasure: 'unit', salePrice: null }),
      ),
    } as unknown as InventoryApiService;
    const auth = { hasPermission: () => opts.canManageCatalog ?? true } as unknown as AuthService;

    TestBed.configureTestingModule({
      imports: [InventoryItemList],
      providers: [
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: AuthService, useValue: auth },
      ],
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

  it('loads low-stock items on init and exposes them for the banner', async () => {
    const lowStockItems: LowStockItem[] = [
      { itemId: 'item-1', code: 'PCM-001', name: 'Paracetamol', reorderLevel: '20', minimumStock: '10', availableQuantity: '5' },
    ];
    const { fixture, inventoryApi } = setup({ lowStockItems });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(inventoryApi.listLowStockItems).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.lowStockItems()).toEqual(lowStockItems);
  });

  it('leaves the low-stock list empty (no banner) rather than failing the page when the lookup errors', async () => {
    const { fixture } = setup({ lowStockItems: 'error' });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.lowStockItems()).toEqual([]);
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

  it('resets category filter and clears subcategories and items on resetFilters()', async () => {
    const { fixture, inventoryApi } = setup();
    (inventoryApi.listSubCategories as jest.Mock).mockReturnValue(
      of([{ id: 'sub-1', categoryId: 'cat-1', name: 'Tablets', isConsumable: true }]),
    );
    fixture.detectChanges();

    fixture.componentInstance.onCategoryChange('cat-1');
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedCategoryId()).toBe('cat-1');

    fixture.componentInstance.resetFilters();
    expect(fixture.componentInstance.selectedCategoryId()).toBe('');
    expect(fixture.componentInstance.subCategories()).toEqual([]);
    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('identifies low stock items and retrieves low stock info', async () => {
    const lowStockItems: LowStockItem[] = [
      { itemId: 'item-1', code: 'PCM-001', name: 'Paracetamol', reorderLevel: '20', minimumStock: '10', availableQuantity: '5' },
    ];
    const { fixture } = setup({ lowStockItems });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isItemLowStock('item-1')).toBe(true);
    expect(fixture.componentInstance.isItemLowStock('item-2')).toBe(false);
    expect(fixture.componentInstance.getLowStockInfo('item-1')?.availableQuantity).toBe('5');
    expect(fixture.componentInstance.getLowStockInfo('item-2')).toBeUndefined();
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

  describe('catalog management', () => {
    it('exposes canManageCatalog from the inventory.catalog.manage permission', () => {
      const { fixture } = setup({ canManageCatalog: false });
      fixture.detectChanges();

      expect(fixture.componentInstance.canManageCatalog).toBe(false);
    });

    it('adds a category and appends it to the loaded list', async () => {
      const { fixture, inventoryApi } = setup();
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.openAddCategoryModal();
      component.categoryName.set('New Category');
      component.submitAddCategory();
      await fixture.whenStable();

      expect(inventoryApi.createCategory).toHaveBeenCalledWith({ name: 'New Category' });
      expect(component.showAddCategoryModal()).toBe(false);
      expect(component.categories()).toEqual([{ id: 'cat-new', name: 'New Category', displaySequence: 0 }]);
    });

    it('does not submit an add-category request with a blank name', () => {
      const { fixture, inventoryApi } = setup();
      fixture.detectChanges();

      fixture.componentInstance.openAddCategoryModal();
      fixture.componentInstance.categoryName.set('   ');
      fixture.componentInstance.submitAddCategory();

      expect(inventoryApi.createCategory).not.toHaveBeenCalled();
    });

    it('surfaces the backend error and keeps the dialog open when adding a category fails', async () => {
      const { fixture, inventoryApi } = setup();
      (inventoryApi.createCategory as jest.Mock).mockReturnValue(throwError(() => ({ message: 'Name already exists' })));
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.openAddCategoryModal();
      component.categoryName.set('Duplicate');
      component.submitAddCategory();
      await fixture.whenStable();

      expect(component.categorySaving()).toBe(false);
      expect(component.categoryError()).toBe('Name already exists');
      expect(component.showAddCategoryModal()).toBe(true);
    });

    it('adds a sub-category under the selected category and appends it to the loaded list', async () => {
      const { fixture, inventoryApi } = setup();
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.selectedCategoryId.set('cat-1');
      component.openAddSubCategoryModal();
      component.subCategoryName.set('New Sub');
      component.subCategoryIsConsumable.set(true);
      component.submitAddSubCategory();
      await fixture.whenStable();

      expect(inventoryApi.createSubCategory).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        name: 'New Sub',
        isConsumable: true,
      });
      expect(component.showAddSubCategoryModal()).toBe(false);
      expect(component.subCategories()).toEqual([{ id: 'sub-new', categoryId: 'cat-1', name: 'New Sub', isConsumable: false }]);
    });

    it('adds an item under the selected sub-category, omitting blank optional fields', async () => {
      const { fixture, inventoryApi } = setup();
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.selectedSubCategoryId.set('sub-1');
      component.openAddItemModal();
      component.itemForm.set({
        name: 'New Item',
        code: 'NI-1',
        unitOfMeasure: 'unit',
        reorderLevel: null,
        minimumStock: null,
        salePrice: null,
      });
      component.submitAddItem();
      await fixture.whenStable();

      expect(inventoryApi.createItem).toHaveBeenCalledWith({
        subCategoryId: 'sub-1',
        name: 'New Item',
        code: 'NI-1',
        unitOfMeasure: 'unit',
        reorderLevel: undefined,
        minimumStock: undefined,
        salePrice: undefined,
      });
      expect(component.showAddItemModal()).toBe(false);
      expect(component.items().length).toBe(1);
    });

    it('does not submit an add-item request without a sub-category selected', () => {
      const { fixture, inventoryApi } = setup();
      fixture.detectChanges();

      const component = fixture.componentInstance;
      component.openAddItemModal();
      component.itemForm.set({ ...component.itemForm(), name: 'New Item', code: 'NI-1', unitOfMeasure: 'unit' });
      component.submitAddItem();

      expect(inventoryApi.createItem).not.toHaveBeenCalled();
    });
  });
});
