import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { GlobalCatalogList } from './global-catalog-list.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';

describe('GlobalCatalogList', () => {
  function setup() {
    const mdApi = {
      listDepartmentCatalogs: jest.fn().mockReturnValue(of([])),
      createDepartmentCatalog: jest.fn().mockReturnValue(of({})),
      getRoles: jest.fn().mockReturnValue(of([])),
      createRole: jest.fn().mockReturnValue(of({})),
    } as unknown as MasterDataApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [GlobalCatalogList],
      providers: [
        { provide: MasterDataApiService, useValue: mdApi },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(GlobalCatalogList);
    return { fixture, mdApi, messageService };
  }

  it('creates a role with the catalog DTO only (no bypass flag) and toasts success', async () => {
    const { fixture, mdApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openRoleModal();
    fixture.componentInstance.roleForm.set({
      name: 'Telehealth Consultant',
      description: 'Remote consultations',
      priority: 55,
      isCrossTenant: false,
    });
    fixture.componentInstance.submitRole();
    await fixture.whenStable();

    expect(mdApi.createRole).toHaveBeenCalledWith({
      name: 'Telehealth Consultant',
      description: 'Remote consultations',
      priority: 55,
      isCrossTenant: false,
    });
    expect(fixture.componentInstance.showRoleModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Role created' }),
    );
  });

  it('creates a global department and toasts success', async () => {
    const { fixture, mdApi, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openDeptModal();
    fixture.componentInstance.deptForm.set({
      departmentCode: 'TEL',
      departmentName: 'Telemedicine',
      description: null,
      isAppointmentApplicable: true,
    });
    fixture.componentInstance.submitDept();
    await fixture.whenStable();

    expect(mdApi.createDepartmentCatalog).toHaveBeenCalledWith({
      departmentCode: 'TEL',
      departmentName: 'Telemedicine',
      description: null,
      isAppointmentApplicable: true,
    });
    expect(fixture.componentInstance.showDeptModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Department added' }),
    );
  });
});
