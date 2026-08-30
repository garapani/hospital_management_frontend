import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService, ConfirmationService, Confirmation } from 'primeng/api';
import { AuthService } from '@org/auth';
import { EmployeeList } from './employee-list.js';
import { EmployeesApiService } from './employees-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';

describe('EmployeeList', () => {
  function setup() {
    const employeesApi = {
      list: jest.fn().mockReturnValue(
        of({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } }),
      ),
      create: jest.fn().mockReturnValue(of({})),
      update: jest.fn().mockReturnValue(of({})),
      deactivate: jest.fn().mockReturnValue(of({})),
      reactivate: jest.fn().mockReturnValue(of({})),
    } as unknown as EmployeesApiService;
    const mdApi = {
      listDepartments: jest.fn().mockReturnValue(of([])),
    } as unknown as MasterDataApiService;
    const auth = { hasPermission: () => true } as unknown as AuthService;
    const messageService = { add: jest.fn() } as unknown as MessageService;
    const confirmationService = {
      confirm: jest.fn((c: Confirmation) => c.accept?.()),
    } as unknown as ConfirmationService;

    TestBed.configureTestingModule({
      imports: [EmployeeList],
      providers: [
        { provide: EmployeesApiService, useValue: employeesApi },
        { provide: MasterDataApiService, useValue: mdApi },
        { provide: AuthService, useValue: auth },
        { provide: MessageService, useValue: messageService },
        { provide: ConfirmationService, useValue: confirmationService },
      ],
    });

    const fixture = TestBed.createComponent(EmployeeList);
    return { fixture, employeesApi, mdApi, messageService, confirmationService };
  }

  it('loads the employee list and departments on init', async () => {
    const { fixture, employeesApi, mdApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(employeesApi.list).toHaveBeenCalledWith({ page: 1, limit: 10, q: undefined });
    expect(mdApi.listDepartments).toHaveBeenCalledTimes(1);
  });

  it('creates an employee and reloads the list', async () => {
    const { fixture, employeesApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openCreateModal();
    fixture.componentInstance.editForm.update((v) => ({
      ...v,
      firstName: 'Priya',
      lastName: 'Menon',
      monthlyBasicSalary: 25000,
    }));
    fixture.componentInstance.submitSave();
    await fixture.whenStable();

    expect(employeesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Priya', lastName: 'Menon', monthlyBasicSalary: 25000 }),
    );
    expect(fixture.componentInstance.showEditModal()).toBe(false);
  });

  it('seeds the join date as a Date for the datepicker and submits it as a local YYYY-MM-DD string', async () => {
    const { fixture, employeesApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openEditModal({
      id: 'e1',
      firstName: 'Priya',
      lastName: 'Menon',
      designation: null,
      departmentId: null,
      joinDate: '2026-01-15',
      employmentType: 'FullTime',
      monthlyBasicSalary: 25000,
    });

    const seededJoinDate = fixture.componentInstance.editForm().joinDate;
    expect(seededJoinDate).toBeInstanceOf(Date);
    expect(seededJoinDate.getFullYear()).toBe(2026);
    expect(seededJoinDate.getMonth()).toBe(0);
    expect(seededJoinDate.getDate()).toBe(15);

    fixture.componentInstance.submitSave();
    await fixture.whenStable();

    expect(employeesApi.update).toHaveBeenCalledWith(
      'e1',
      expect.objectContaining({ joinDate: '2026-01-15' }),
    );
  });

  it('confirms before deactivating an employee, but not before reactivating one, and toasts success', async () => {
    const { fixture, employeesApi, confirmationService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const employee = { id: 'e1', firstName: 'Priya', lastName: 'Menon', isActive: true };
    fixture.componentInstance.toggleActive(employee);
    await fixture.whenStable();
    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(employeesApi.deactivate).toHaveBeenCalledWith('e1');

    fixture.componentInstance.toggleActive({ id: 'e1', firstName: 'Priya', lastName: 'Menon', isActive: false });
    await fixture.whenStable();
    expect(employeesApi.reactivate).toHaveBeenCalledWith('e1');
  });

  it('toasts an error instead of failing silently when deactivation is rejected', async () => {
    const { fixture, employeesApi, messageService } = setup();
    (employeesApi.deactivate as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: unknown) => void }) => handlers.error(new Error('boom')),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.toggleActive({ id: 'e1', firstName: 'Priya', lastName: 'Menon', isActive: true });

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', summary: 'Deactivate failed' }),
    );
    expect(fixture.componentInstance.togglingId()).toBe(null);
  });
});
