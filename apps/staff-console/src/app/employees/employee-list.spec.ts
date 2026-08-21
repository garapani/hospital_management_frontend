import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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

    TestBed.configureTestingModule({
      imports: [EmployeeList],
      providers: [
        { provide: EmployeesApiService, useValue: employeesApi },
        { provide: MasterDataApiService, useValue: mdApi },
        { provide: AuthService, useValue: auth },
      ],
    });

    const fixture = TestBed.createComponent(EmployeeList);
    return { fixture, employeesApi, mdApi };
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

  it('deactivates and reactivates an employee', async () => {
    const { fixture, employeesApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    const employee = { id: 'e1', isActive: true };
    fixture.componentInstance.toggleActive(employee);
    await fixture.whenStable();
    expect(employeesApi.deactivate).toHaveBeenCalledWith('e1');

    fixture.componentInstance.toggleActive({ id: 'e1', isActive: false });
    await fixture.whenStable();
    expect(employeesApi.reactivate).toHaveBeenCalledWith('e1');
  });
});
