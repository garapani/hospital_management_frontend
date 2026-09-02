import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { DashboardHome } from './dashboard-home.js';
import { AppointmentsApiService, Appointment } from '../appointments/appointments-api.service.js';
import { NursingApiService } from '../nursing/nursing-api.service.js';
import { NursingTask } from '../nursing/nursing.model.js';
import { PharmacyDispensingApiService } from '../pharmacy/pharmacy-dispensing-api.service.js';
import { PendingPharmacyItem } from '../pharmacy/pharmacy-dispensing.model.js';
import { LabApiService, LabRequisition } from '../lab/lab-api.service.js';
import { RadiologyApiService } from '../radiology/radiology-api.service.js';
import { RadiologyRequisition } from '../radiology/radiology.model.js';
import { InvoicesApiService } from '../billing/invoices-api.service.js';
import { Invoice } from '../billing/invoice.model.js';
import { InventoryApiService, LowStockItem } from '../inventory/inventory-api.service.js';
import { PayrollApiService, Payslip } from '../payroll/payroll-api.service.js';
import { HelpdeskApiService } from '../helpdesk/helpdesk-api.service.js';
import { HelpdeskTicket } from '../helpdesk/helpdesk.model.js';
import { AuditApiService } from '../audit/audit-api.service.js';
import { AuditRecord } from '../audit/audit.model.js';
import { DirectoryResolverService } from '../directory/directory-resolver.service.js';

function fakeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    patientId: 'patient-1',
    firstName: 'Jane',
    lastName: 'Doe',
    contactNumber: '9998887777',
    appointmentDate: '2026-09-01',
    appointmentTime: '10:00',
    doctorId: null,
    departmentId: null,
    appointmentType: 'Consultation',
    status: 'Scheduled',
    reason: null,
    cancelledRemarks: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function fakeTask(overrides: Partial<NursingTask> = {}): NursingTask {
  return {
    id: 'task-1',
    admissionId: 'adm-1',
    taskType: 'Vitals Check',
    description: 'Q4H vitals',
    dueAt: null,
    status: 'Pending',
    assignedTo: null,
    completedBy: null,
    completedAt: null,
    ...overrides,
  };
}

function fakePendingPharmacyItem(overrides: Partial<PendingPharmacyItem> = {}): PendingPharmacyItem {
  return {
    id: 'item-1',
    orderId: 'order-1',
    itemType: 'Medication',
    itemDescription: 'Paracetamol 500mg',
    priority: 'Routine',
    status: 'Pending',
    completedBy: null,
    completedAt: null,
    cancelReason: null,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    patientId: 'patient-1',
    ...overrides,
  };
}

function fakeLabRequisition(overrides: Partial<LabRequisition> = {}): LabRequisition {
  return {
    id: 'req-1',
    orderItemId: 'orderitem-1',
    patientId: 'patient-1',
    testId: 'test-1',
    requisitionNumber: 'REQ-0001',
    specimenType: 'Blood',
    status: 'Pending',
    sampleCollectedBy: null,
    sampleCollectedAt: null,
    verifiedBy: null,
    verifiedAt: null,
    cancelReason: null,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    ...overrides,
  };
}

function fakeRadiologyRequisition(overrides: Partial<RadiologyRequisition> = {}): RadiologyRequisition {
  return {
    id: 'radreq-1',
    orderItemId: 'orderitem-1',
    patientId: 'patient-1',
    imagingItemId: 'imaging-1',
    requisitionNumber: 'RAD-0001',
    status: 'Pending',
    scannedBy: null,
    scannedAt: null,
    reportText: null,
    indication: null,
    performerId: null,
    reportEnteredBy: null,
    reportEnteredAt: null,
    verifiedBy: null,
    verifiedAt: null,
    cancelReason: null,
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    ...overrides,
  };
}

function fakeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    patientId: 'patient-1',
    invoiceNumber: 1,
    financialYear: '2026-27',
    subtotal: 1000,
    discountAmount: 0,
    taxableAmount: 1000,
    taxAmount: 0,
    totalAmount: 1000,
    paidAmount: 0,
    status: 'Unpaid',
    notes: null,
    createdBy: 'user-1',
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-01T08:00:00Z',
    ...overrides,
  };
}

function fakeLowStockItem(overrides: Partial<LowStockItem> = {}): LowStockItem {
  return {
    itemId: 'item-1',
    code: 'MED-001',
    name: 'Paracetamol 500mg',
    reorderLevel: '50',
    minimumStock: '20',
    availableQuantity: '10',
    ...overrides,
  };
}

function fakePayslip(overrides: Partial<Payslip> = {}): Payslip {
  return {
    id: 'payslip-1',
    employeeId: 'employee-1',
    periodMonth: 9,
    periodYear: 2026,
    basicAmount: 30000,
    allowanceAmount: 3000,
    grossAmount: 33000,
    deductionAmount: 1000,
    netAmount: 32000,
    status: 'Draft',
    paidAt: null,
    createdAt: '2026-09-01T08:00:00Z',
    ...overrides,
  };
}

function fakeHelpdeskTicket(overrides: Partial<HelpdeskTicket> = {}): HelpdeskTicket {
  return {
    id: 'ticket-1',
    ticketNumber: 'TCK-0001',
    title: 'Printer not working',
    description: 'The reception printer is jammed.',
    category: null,
    priority: 'Medium',
    status: 'Open',
    requesterAccountId: 'account-1',
    requesterName: 'Jane Doe',
    assigneeAccountId: null,
    assigneeName: null,
    resolvedBy: null,
    resolvedAt: null,
    closedAt: null,
    ...overrides,
  };
}

function fakeAuditRecord(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    id: 'audit-1',
    tableName: 'patients',
    recordId: 'patient-1',
    action: 'update',
    changedByAccountId: 'account-1',
    correlationId: null,
    diff: {},
    occurredAt: '2026-09-01T08:00:00Z',
    ...overrides,
  };
}

describe('DashboardHome', () => {
  function setup(options: {
    roles?: string[];
    permissions?: string[];
    sub?: string;
    appointments?: Appointment[];
    tasks?: NursingTask[];
    pendingDispenseItems?: PendingPharmacyItem[];
    pendingRequisitions?: LabRequisition[];
    pendingScans?: RadiologyRequisition[];
    unpaidInvoices?: Invoice[];
    lowStockItems?: LowStockItem[];
    draftPayslips?: Payslip[];
    openTickets?: HelpdeskTicket[];
    recentAuditRecords?: AuditRecord[];
    appointmentsError?: boolean;
    tasksError?: boolean;
    dispenseItemsError?: boolean;
    requisitionsError?: boolean;
    scansError?: boolean;
    invoicesError?: boolean;
    lowStockError?: boolean;
    payslipsError?: boolean;
    ticketsError?: boolean;
    auditRecordsError?: boolean;
  } = {}) {
    const { roles = [], permissions = [], sub = 'user-1' } = options;
    const appointmentsApi = {
      list: jest.fn().mockReturnValue(
        options.appointmentsError
          ? throwError(() => new Error('boom'))
          : of({ data: options.appointments ?? [], meta: { total: (options.appointments ?? []).length, page: 1, limit: 100, totalPages: 1 } }),
      ),
    } as unknown as AppointmentsApiService;
    const nursingApi = {
      listTasks: jest.fn().mockReturnValue(
        options.tasksError
          ? throwError(() => new Error('boom'))
          : of({ data: options.tasks ?? [], meta: { total: (options.tasks ?? []).length, page: 1, limit: 100, totalPages: 1 } }),
      ),
    } as unknown as NursingApiService;
    const pharmacyApi = {
      listPendingItems: jest.fn().mockReturnValue(
        options.dispenseItemsError
          ? throwError(() => new Error('boom'))
          : of({
              data: options.pendingDispenseItems ?? [],
              meta: { total: (options.pendingDispenseItems ?? []).length, page: 1, limit: 100, totalPages: 1 },
            }),
      ),
    } as unknown as PharmacyDispensingApiService;
    const labApi = {
      listRequisitions: jest.fn().mockReturnValue(
        options.requisitionsError
          ? throwError(() => new Error('boom'))
          : of({
              data: options.pendingRequisitions ?? [],
              meta: { total: (options.pendingRequisitions ?? []).length, page: 1, limit: 100, totalPages: 1 },
            }),
      ),
    } as unknown as LabApiService;
    const radiologyApi = {
      list: jest.fn().mockReturnValue(
        options.scansError
          ? throwError(() => new Error('boom'))
          : of({
              data: options.pendingScans ?? [],
              meta: { total: (options.pendingScans ?? []).length, page: 1, limit: 100, totalPages: 1 },
            }),
      ),
    } as unknown as RadiologyApiService;
    const invoicesApi = {
      list: jest.fn().mockReturnValue(
        options.invoicesError
          ? throwError(() => new Error('boom'))
          : of({
              data: options.unpaidInvoices ?? [],
              meta: { total: (options.unpaidInvoices ?? []).length, page: 1, limit: 100, totalPages: 1 },
            }),
      ),
    } as unknown as InvoicesApiService;
    const inventoryApi = {
      listLowStockItems: jest.fn().mockReturnValue(
        options.lowStockError ? throwError(() => new Error('boom')) : of(options.lowStockItems ?? []),
      ),
    } as unknown as InventoryApiService;
    const payrollApi = {
      listPayslips: jest.fn().mockReturnValue(
        options.payslipsError
          ? throwError(() => new Error('boom'))
          : of({
              data: options.draftPayslips ?? [],
              meta: { total: (options.draftPayslips ?? []).length, page: 1, limit: 100, totalPages: 1 },
            }),
      ),
    } as unknown as PayrollApiService;
    const helpdeskApi = {
      list: jest.fn().mockReturnValue(
        options.ticketsError
          ? throwError(() => new Error('boom'))
          : of({ data: options.openTickets ?? [], total: (options.openTickets ?? []).length }),
      ),
    } as unknown as HelpdeskApiService;
    const auditApi = {
      list: jest.fn().mockReturnValue(
        options.auditRecordsError ? throwError(() => new Error('boom')) : of(options.recentAuditRecords ?? []),
      ),
    } as unknown as AuditApiService;
    const auth = {
      currentUser: () => ({ sub, roles }),
      hasPermission: (permission: string) => permissions.includes(permission),
    } as unknown as AuthService;
    const directoryResolver = { resolve: jest.fn().mockReturnValue(of(null)) } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [DashboardHome],
      providers: [
        provideRouter([]),
        { provide: AppointmentsApiService, useValue: appointmentsApi },
        { provide: NursingApiService, useValue: nursingApi },
        { provide: PharmacyDispensingApiService, useValue: pharmacyApi },
        { provide: LabApiService, useValue: labApi },
        { provide: RadiologyApiService, useValue: radiologyApi },
        { provide: InvoicesApiService, useValue: invoicesApi },
        { provide: InventoryApiService, useValue: inventoryApi },
        { provide: PayrollApiService, useValue: payrollApi },
        { provide: HelpdeskApiService, useValue: helpdeskApi },
        { provide: AuditApiService, useValue: auditApi },
        { provide: AuthService, useValue: auth },
        { provide: DirectoryResolverService, useValue: directoryResolver },
      ],
    });

    const fixture = TestBed.createComponent(DashboardHome);
    return {
      fixture,
      appointmentsApi,
      nursingApi,
      pharmacyApi,
      labApi,
      radiologyApi,
      invoicesApi,
      inventoryApi,
      payrollApi,
      helpdeskApi,
      auditApi,
    };
  }

  it('shows nothing scoped and makes no calls for a role with no dashboard widget', async () => {
    const {
      fixture,
      appointmentsApi,
      nursingApi,
      pharmacyApi,
      labApi,
      radiologyApi,
      invoicesApi,
      inventoryApi,
      payrollApi,
      helpdeskApi,
      auditApi,
    } = setup({
      roles: ['Hospital Admin'],
      permissions: [],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.hasNoWidgets()).toBe(true);
    expect(appointmentsApi.list).not.toHaveBeenCalled();
    expect(nursingApi.listTasks).not.toHaveBeenCalled();
    expect(pharmacyApi.listPendingItems).not.toHaveBeenCalled();
    expect(labApi.listRequisitions).not.toHaveBeenCalled();
    expect(radiologyApi.list).not.toHaveBeenCalled();
    expect(invoicesApi.list).not.toHaveBeenCalled();
    expect(inventoryApi.listLowStockItems).not.toHaveBeenCalled();
    expect(payrollApi.listPayslips).not.toHaveBeenCalled();
    expect(helpdeskApi.list).not.toHaveBeenCalled();
    expect(auditApi.list).not.toHaveBeenCalled();
  });

  it("loads today's appointments and tallies status counts for a Receptionist", async () => {
    const appointments = [
      fakeAppointment({ id: 'a1', status: 'Scheduled' }),
      fakeAppointment({ id: 'a2', status: 'Scheduled' }),
      fakeAppointment({ id: 'a3', status: 'CheckedIn' }),
    ];
    const { fixture, appointmentsApi } = setup({
      roles: ['Receptionist / Front Desk'],
      permissions: ['appointment.read'],
      appointments,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isReceptionist()).toBe(true);
    expect(appointmentsApi.list).toHaveBeenCalledWith(expect.objectContaining({ date: fixture.componentInstance.today, limit: 100 }));
    expect(fixture.componentInstance.todaysAppointments()).toHaveLength(3);
    expect(fixture.componentInstance.appointmentStatusCounts()).toEqual({ Scheduled: 2, CheckedIn: 1 });
  });

  it("filters to the signed-in doctor's own appointments for a Doctor", async () => {
    const { fixture, appointmentsApi } = setup({
      roles: ['Doctor'],
      permissions: ['appointment.read'],
      sub: 'doctor-42',
      appointments: [fakeAppointment({ doctorId: 'doctor-42' })],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isDoctor()).toBe(true);
    expect(appointmentsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ date: fixture.componentInstance.today, doctorId: 'doctor-42', limit: 100 }),
    );
    expect(fixture.componentInstance.myAppointmentsToday()).toHaveLength(1);
  });

  it('loads pending/in-progress tasks for a Nurse, sorted by due date with unscheduled tasks last', async () => {
    const tasks = [
      fakeTask({ id: 't1', dueAt: '2026-09-01T14:00:00Z' }),
      fakeTask({ id: 't2', dueAt: null }),
      fakeTask({ id: 't3', dueAt: '2026-09-01T09:00:00Z' }),
      fakeTask({ id: 't4', status: 'Completed' }),
      fakeTask({ id: 't5', status: 'Cancelled' }),
    ];
    const { fixture, nursingApi } = setup({ roles: ['Nurse'], permissions: ['nursing.read'], tasks });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isNurse()).toBe(true);
    expect(nursingApi.listTasks).toHaveBeenCalledWith(undefined, 1, 100);
    expect(fixture.componentInstance.pendingTasks().map((t) => t.id)).toEqual(['t3', 't1', 't2']);
  });

  it('loads items pending dispensing for a Pharmacist', async () => {
    const pendingDispenseItems = [fakePendingPharmacyItem({ id: 'item-1' }), fakePendingPharmacyItem({ id: 'item-2' })];
    const { fixture, pharmacyApi } = setup({
      roles: ['Pharmacist'],
      permissions: ['pharmacy.read'],
      pendingDispenseItems,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isPharmacist()).toBe(true);
    expect(pharmacyApi.listPendingItems).toHaveBeenCalledWith({ status: 'Pending', limit: 100 });
    expect(fixture.componentInstance.pendingDispenseItems()).toHaveLength(2);
  });

  it('loads requisitions pending sample collection for a Lab Technician', async () => {
    const pendingRequisitions = [fakeLabRequisition({ id: 'req-1' }), fakeLabRequisition({ id: 'req-2' })];
    const { fixture, labApi } = setup({
      roles: ['Lab Technician'],
      permissions: ['lab.read'],
      pendingRequisitions,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isLabTechnician()).toBe(true);
    expect(labApi.listRequisitions).toHaveBeenCalledWith({ status: 'Pending', limit: 100 });
    expect(fixture.componentInstance.pendingRequisitions()).toHaveLength(2);
  });

  it('loads requisitions pending a scan for a Radiology Technician', async () => {
    const pendingScans = [fakeRadiologyRequisition({ id: 'radreq-1' }), fakeRadiologyRequisition({ id: 'radreq-2' })];
    const { fixture, radiologyApi } = setup({
      roles: ['Radiology Technician'],
      permissions: ['radiology.read'],
      pendingScans,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isRadiologyTechnician()).toBe(true);
    expect(radiologyApi.list).toHaveBeenCalledWith({ status: 'Pending', limit: 100 });
    expect(fixture.componentInstance.pendingScans()).toHaveLength(2);
  });

  it('loads unpaid/partially-paid invoices for Billing/Accounts Staff, sorted oldest first, excluding paid/cancelled ones', async () => {
    const invoices = [
      fakeInvoice({ id: 'inv-1', status: 'Paid', createdAt: '2026-09-01T00:00:00Z' }),
      fakeInvoice({ id: 'inv-2', status: 'Unpaid', createdAt: '2026-09-01T12:00:00Z' }),
      fakeInvoice({ id: 'inv-3', status: 'PartiallyPaid', createdAt: '2026-09-01T06:00:00Z' }),
      fakeInvoice({ id: 'inv-4', status: 'Cancelled', createdAt: '2026-09-01T03:00:00Z' }),
    ];
    const { fixture, invoicesApi } = setup({
      roles: ['Billing/Accounts Staff'],
      permissions: ['billing.read'],
      unpaidInvoices: invoices,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isBillingStaff()).toBe(true);
    expect(invoicesApi.list).toHaveBeenCalledWith({ limit: 100 });
    expect(fixture.componentInstance.unpaidInvoices().map((i) => i.id)).toEqual(['inv-3', 'inv-2']);
  });

  it('loads low-stock items for an Inventory/Store Manager', async () => {
    const lowStockItems = [fakeLowStockItem({ itemId: 'item-1' }), fakeLowStockItem({ itemId: 'item-2' })];
    const { fixture, inventoryApi } = setup({
      roles: ['Inventory/Store Manager'],
      permissions: ['inventory.read'],
      lowStockItems,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isInventoryManager()).toBe(true);
    expect(inventoryApi.listLowStockItems).toHaveBeenCalled();
    expect(fixture.componentInstance.lowStockItems()).toHaveLength(2);
  });

  it('loads draft payslips for an HR/Payroll Admin', async () => {
    const draftPayslips = [fakePayslip({ id: 'payslip-1' }), fakePayslip({ id: 'payslip-2' })];
    const { fixture, payrollApi } = setup({
      roles: ['HR/Payroll Admin'],
      permissions: ['payroll.read'],
      draftPayslips,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isHrPayrollAdmin()).toBe(true);
    expect(payrollApi.listPayslips).toHaveBeenCalledWith({ page: 1, limit: 100, status: 'Draft' });
    expect(fixture.componentInstance.draftPayslips()).toHaveLength(2);
  });

  it('loads open/in-progress tickets for a Helpdesk Agent, excluding resolved/closed ones', async () => {
    const tickets = [
      fakeHelpdeskTicket({ id: 't1', status: 'Open' }),
      fakeHelpdeskTicket({ id: 't2', status: 'InProgress' }),
      fakeHelpdeskTicket({ id: 't3', status: 'Resolved' }),
      fakeHelpdeskTicket({ id: 't4', status: 'Closed' }),
    ];
    const { fixture, helpdeskApi } = setup({
      roles: ['Helpdesk Agent'],
      permissions: ['helpdesk.read'],
      openTickets: tickets,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isHelpdeskAgent()).toBe(true);
    expect(helpdeskApi.list).toHaveBeenCalledWith({ limit: 100 });
    expect(fixture.componentInstance.openTickets().map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('loads recent audit records for an Auditor/Compliance', async () => {
    const records = [fakeAuditRecord({ id: 'audit-1' }), fakeAuditRecord({ id: 'audit-2' })];
    const { fixture, auditApi } = setup({
      roles: ['Auditor/Compliance'],
      permissions: ['audit.read'],
      recentAuditRecords: records,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isAuditor()).toBe(true);
    expect(auditApi.list).toHaveBeenCalledWith(1, 10);
    expect(fixture.componentInstance.recentAuditRecords()).toHaveLength(2);
  });

  it('skips a widget load when the role matches but the permission does not', async () => {
    const { fixture, appointmentsApi } = setup({ roles: ['Doctor'], permissions: [] });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(appointmentsApi.list).not.toHaveBeenCalled();
  });

  it('renders multiple widgets for a user holding more than one role', async () => {
    const { fixture, appointmentsApi, nursingApi } = setup({
      roles: ['Doctor', 'Nurse'],
      permissions: ['appointment.read', 'nursing.read'],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.isDoctor()).toBe(true);
    expect(fixture.componentInstance.isNurse()).toBe(true);
    expect(appointmentsApi.list).toHaveBeenCalled();
    expect(nursingApi.listTasks).toHaveBeenCalled();
  });

  it('clears loading flags without throwing when every widget lookup errors', async () => {
    const { fixture } = setup({
      roles: [
        'Receptionist / Front Desk',
        'Nurse',
        'Pharmacist',
        'Lab Technician',
        'Radiology Technician',
        'Billing/Accounts Staff',
        'Inventory/Store Manager',
        'HR/Payroll Admin',
        'Helpdesk Agent',
        'Auditor/Compliance',
      ],
      permissions: [
        'appointment.read',
        'nursing.read',
        'pharmacy.read',
        'lab.read',
        'radiology.read',
        'billing.read',
        'inventory.read',
        'payroll.read',
        'helpdesk.read',
        'audit.read',
      ],
      appointmentsError: true,
      tasksError: true,
      dispenseItemsError: true,
      requisitionsError: true,
      scansError: true,
      invoicesError: true,
      lowStockError: true,
      payslipsError: true,
      ticketsError: true,
      auditRecordsError: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.appointmentsLoading()).toBe(false);
    expect(fixture.componentInstance.tasksLoading()).toBe(false);
    expect(fixture.componentInstance.dispenseItemsLoading()).toBe(false);
    expect(fixture.componentInstance.requisitionsLoading()).toBe(false);
    expect(fixture.componentInstance.scansLoading()).toBe(false);
    expect(fixture.componentInstance.invoicesLoading()).toBe(false);
    expect(fixture.componentInstance.lowStockLoading()).toBe(false);
    expect(fixture.componentInstance.payslipsLoading()).toBe(false);
    expect(fixture.componentInstance.ticketsLoading()).toBe(false);
    expect(fixture.componentInstance.auditRecordsLoading()).toBe(false);
  });
});
