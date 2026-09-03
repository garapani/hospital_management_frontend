import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { FractionConsole } from './fraction-console.js';
import { FractionApiService } from './fraction-api.service.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';
import { UsersApiService } from '../users/users-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';

describe('FractionConsole', () => {
  function setup(options: { canManage?: boolean } = {}) {
    const api = {
      listRules: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      createRule: jest.fn().mockReturnValue(of({})),
      deactivateRule: jest.fn().mockReturnValue(of({})),
      reactivateRule: jest.fn().mockReturnValue(of({})),
      listEntries: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      recordEntry: jest.fn().mockReturnValue(of({})),
    } as unknown as FractionApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const auth = { hasPermission: jest.fn().mockReturnValue(options.canManage ?? true) } as unknown as AuthService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;
    const usersApi = {
      listDirectory: jest.fn().mockReturnValue(of([{ id: 'd1', displayName: 'Dr. Jane' }])),
    } as unknown as UsersApiService;
    const masterDataApi = {
      listDepartments: jest.fn().mockReturnValue(of([{ id: 'dept1', departmentName: 'Cardiology' }])),
    } as unknown as MasterDataApiService;

    TestBed.configureTestingModule({
      imports: [FractionConsole],
      providers: [
        { provide: FractionApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
        { provide: AuthService, useValue: auth },
        { provide: DirectoryResolverService, useValue: directoryResolver },
        { provide: UsersApiService, useValue: usersApi },
        { provide: MasterDataApiService, useValue: masterDataApi },
      ],
    });

    const fixture = TestBed.createComponent(FractionConsole);
    return { fixture, api, messageService, auth, usersApi, masterDataApi };
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

  it('hides New Rule/Record Share/Deactivate for a caller without fraction.manage (e.g. Doctor with read-only access)', async () => {
    const { fixture } = setup({ canManage: false });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.canManage).toBe(false);
    const text = fixture.nativeElement.textContent as string;
    expect(text).not.toContain('New Rule');
    expect(text).not.toContain('Record Share');
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

  it('loads doctor and department dropdown options for pickers', async () => {
    const { fixture, usersApi, masterDataApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(usersApi.listDirectory).toHaveBeenCalledWith('Doctor');
    expect(fixture.componentInstance.doctorOptions()).toEqual([{ label: 'Dr. Jane', value: 'd1' }]);
    expect(masterDataApi.listDepartments).toHaveBeenCalled();
    expect(fixture.componentInstance.departmentOptions()).toEqual([{ label: 'Cardiology', value: 'dept1' }]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Doctor');
    expect(text).toContain('Department');
    expect(text).not.toContain('Doctor ID');
    expect(text).not.toContain('Department ID');
  });
});

