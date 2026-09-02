import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { AuthService } from '@org/auth';
import { AppointmentsApiService, Appointment } from '../appointments/appointments-api.service.js';
import { appointmentDisplayName, appointmentStatusSeverity, APPOINTMENT_STATUSES } from '../appointments/appointment.model.js';
import { NursingApiService } from '../nursing/nursing-api.service.js';
import { NursingTask } from '../nursing/nursing.model.js';
import { PharmacyDispensingApiService } from '../pharmacy/pharmacy-dispensing-api.service.js';
import { PendingPharmacyItem } from '../pharmacy/pharmacy-dispensing.model.js';
import { LabApiService, LabRequisition } from '../lab/lab-api.service.js';
import { RadiologyApiService } from '../radiology/radiology-api.service.js';
import { RadiologyRequisition } from '../radiology/radiology.model.js';
import { InvoicesApiService } from '../billing/invoices-api.service.js';
import { Invoice, invoiceReference, outstandingBalance, statusSeverity as invoiceStatusSeverity } from '../billing/invoice.model.js';
import { InventoryApiService, LowStockItem } from '../inventory/inventory-api.service.js';
import { PayrollApiService, Payslip } from '../payroll/payroll-api.service.js';
import { HelpdeskApiService } from '../helpdesk/helpdesk-api.service.js';
import { HelpdeskTicket } from '../helpdesk/helpdesk.model.js';
import { EntityName } from '../directory/entity-name.js';
import { todayLocal as today } from '../shared/date.util.js';

const DASHBOARD_LIST_LIMIT = 100;

@Component({
  selector: 'hms-dashboard-home',
  standalone: true,
  imports: [CommonModule, RouterModule, TableModule, TagModule, EntityName],
  templateUrl: './dashboard-home.html',
})
export class DashboardHome {
  private readonly appointmentsApi = inject(AppointmentsApiService);
  private readonly nursingApi = inject(NursingApiService);
  private readonly pharmacyApi = inject(PharmacyDispensingApiService);
  private readonly labApi = inject(LabApiService);
  private readonly radiologyApi = inject(RadiologyApiService);
  private readonly invoicesApi = inject(InvoicesApiService);
  private readonly inventoryApi = inject(InventoryApiService);
  private readonly payrollApi = inject(PayrollApiService);
  private readonly helpdeskApi = inject(HelpdeskApiService);
  readonly auth = inject(AuthService);

  readonly displayName = appointmentDisplayName;
  readonly statusSeverity = appointmentStatusSeverity;
  readonly today = today();

  // Role-shaped, not permission-shaped: Receptionist and Doctor both hold appointment.read, but
  // "everyone's appointments today" vs "just mine" is a role distinction a permission check alone
  // can't make. A user can hold more than one role (PRD §6.1), so more than one section may show.
  private readonly roles = computed(() => this.auth.currentUser()?.roles ?? []);
  readonly isReceptionist = computed(() => this.roles().includes('Receptionist / Front Desk'));
  readonly isDoctor = computed(() => this.roles().includes('Doctor'));
  readonly isNurse = computed(() => this.roles().includes('Nurse'));
  readonly isPharmacist = computed(() => this.roles().includes('Pharmacist'));
  readonly isLabTechnician = computed(() => this.roles().includes('Lab Technician'));
  readonly isRadiologyTechnician = computed(() => this.roles().includes('Radiology Technician'));
  readonly isBillingStaff = computed(() => this.roles().includes('Billing/Accounts Staff'));
  readonly isInventoryManager = computed(() => this.roles().includes('Inventory/Store Manager'));
  readonly isHrPayrollAdmin = computed(() => this.roles().includes('HR/Payroll Admin'));
  readonly isHelpdeskAgent = computed(() => this.roles().includes('Helpdesk Agent'));
  readonly hasNoWidgets = computed(
    () =>
      !this.isReceptionist() &&
      !this.isDoctor() &&
      !this.isNurse() &&
      !this.isPharmacist() &&
      !this.isLabTechnician() &&
      !this.isRadiologyTechnician() &&
      !this.isBillingStaff() &&
      !this.isInventoryManager() &&
      !this.isHrPayrollAdmin() &&
      !this.isHelpdeskAgent(),
  );

  readonly todaysAppointments = signal<Appointment[]>([]);
  readonly appointmentsLoading = signal(false);
  // number | undefined, not number: a status with no appointments today is simply absent from
  // the map, and the template's `?? 0` needs the type checker to know that's possible (NG8102).
  readonly appointmentStatusCounts = computed(() => {
    const counts: Record<string, number | undefined> = {};
    for (const appt of this.todaysAppointments()) {
      counts[appt.status] = (counts[appt.status] ?? 0) + 1;
    }
    return counts;
  });
  readonly appointmentStatuses = APPOINTMENT_STATUSES;

  readonly myAppointmentsToday = signal<Appointment[]>([]);
  readonly myAppointmentsLoading = signal(false);

  readonly pendingTasks = signal<NursingTask[]>([]);
  readonly tasksLoading = signal(false);

  readonly pendingDispenseItems = signal<PendingPharmacyItem[]>([]);
  readonly dispenseItemsLoading = signal(false);

  readonly pendingRequisitions = signal<LabRequisition[]>([]);
  readonly requisitionsLoading = signal(false);

  readonly pendingScans = signal<RadiologyRequisition[]>([]);
  readonly scansLoading = signal(false);

  readonly unpaidInvoices = signal<Invoice[]>([]);
  readonly invoicesLoading = signal(false);
  readonly invoiceReference = invoiceReference;
  readonly outstandingBalance = outstandingBalance;
  readonly invoiceStatusSeverity = invoiceStatusSeverity;

  readonly lowStockItems = signal<LowStockItem[]>([]);
  readonly lowStockLoading = signal(false);

  readonly draftPayslips = signal<Payslip[]>([]);
  readonly payslipsLoading = signal(false);

  readonly openTickets = signal<HelpdeskTicket[]>([]);
  readonly ticketsLoading = signal(false);

  constructor() {
    if (this.isReceptionist() && this.auth.hasPermission('appointment.read')) {
      this.loadTodaysAppointments();
    }
    if (this.isDoctor() && this.auth.hasPermission('appointment.read')) {
      this.loadMyAppointmentsToday();
    }
    if (this.isNurse() && this.auth.hasPermission('nursing.read')) {
      this.loadPendingTasks();
    }
    if (this.isPharmacist() && this.auth.hasPermission('pharmacy.read')) {
      this.loadPendingDispenseItems();
    }
    if (this.isLabTechnician() && this.auth.hasPermission('lab.read')) {
      this.loadPendingRequisitions();
    }
    if (this.isRadiologyTechnician() && this.auth.hasPermission('radiology.read')) {
      this.loadPendingScans();
    }
    if (this.isBillingStaff() && this.auth.hasPermission('billing.read')) {
      this.loadUnpaidInvoices();
    }
    if (this.isInventoryManager() && this.auth.hasPermission('inventory.read')) {
      this.loadLowStockItems();
    }
    if (this.isHrPayrollAdmin() && this.auth.hasPermission('payroll.read')) {
      this.loadDraftPayslips();
    }
    if (this.isHelpdeskAgent() && this.auth.hasPermission('helpdesk.read')) {
      this.loadOpenTickets();
    }
  }

  private loadTodaysAppointments(): void {
    this.appointmentsLoading.set(true);
    this.appointmentsApi.list({ date: this.today, limit: DASHBOARD_LIST_LIMIT }).subscribe({
      next: (res) => {
        this.todaysAppointments.set(res.data);
        this.appointmentsLoading.set(false);
      },
      error: () => this.appointmentsLoading.set(false),
    });
  }

  private loadMyAppointmentsToday(): void {
    const doctorId = this.auth.currentUser()?.sub;
    if (!doctorId) return;
    this.myAppointmentsLoading.set(true);
    this.appointmentsApi.list({ date: this.today, doctorId, limit: DASHBOARD_LIST_LIMIT }).subscribe({
      next: (res) => {
        this.myAppointmentsToday.set(res.data);
        this.myAppointmentsLoading.set(false);
      },
      error: () => this.myAppointmentsLoading.set(false),
    });
  }

  private loadPendingTasks(): void {
    this.tasksLoading.set(true);
    // No status/due-date filter on the backend endpoint — fetch a page and filter/sort
    // client-side. Ward-scoping isn't implemented yet (a separate, already-tracked gap), so this
    // is every pending task tenant-wide, matching what nursing.read actually grants today.
    this.nursingApi.listTasks(undefined, 1, DASHBOARD_LIST_LIMIT).subscribe({
      next: (res) => {
        const pending = res.data
          .filter((task) => task.status === 'Pending' || task.status === 'InProgress')
          .sort((a, b) => {
            if (!a.dueAt && !b.dueAt) return 0;
            if (!a.dueAt) return 1;
            if (!b.dueAt) return -1;
            return a.dueAt.localeCompare(b.dueAt);
          });
        this.pendingTasks.set(pending);
        this.tasksLoading.set(false);
      },
      error: () => this.tasksLoading.set(false),
    });
  }

  private loadPendingDispenseItems(): void {
    this.dispenseItemsLoading.set(true);
    this.pharmacyApi.listPendingItems({ status: 'Pending', limit: DASHBOARD_LIST_LIMIT }).subscribe({
      next: (res) => {
        this.pendingDispenseItems.set(res.data);
        this.dispenseItemsLoading.set(false);
      },
      error: () => this.dispenseItemsLoading.set(false),
    });
  }

  private loadPendingRequisitions(): void {
    this.requisitionsLoading.set(true);
    // Matches the requisitions list screen's own default filter (status: 'Pending') — awaiting
    // sample collection, the Lab Technician's actual first step on a new order.
    this.labApi.listRequisitions({ status: 'Pending', limit: DASHBOARD_LIST_LIMIT }).subscribe({
      next: (res) => {
        this.pendingRequisitions.set(res.data);
        this.requisitionsLoading.set(false);
      },
      error: () => this.requisitionsLoading.set(false),
    });
  }

  private loadPendingScans(): void {
    this.scansLoading.set(true);
    this.radiologyApi.list({ status: 'Pending', limit: DASHBOARD_LIST_LIMIT }).subscribe({
      next: (res) => {
        this.pendingScans.set(res.data);
        this.scansLoading.set(false);
      },
      error: () => this.scansLoading.set(false),
    });
  }

  private loadUnpaidInvoices(): void {
    this.invoicesLoading.set(true);
    // No status filter on the backend endpoint (invoice-list.ts doesn't offer one either) - fetch
    // a page and filter client-side, same approach as the Nurse widget's pending-tasks query.
    this.invoicesApi.list({ limit: DASHBOARD_LIST_LIMIT }).subscribe({
      next: (res) => {
        const unpaid = res.data
          .filter((invoice) => invoice.status === 'Unpaid' || invoice.status === 'PartiallyPaid')
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        this.unpaidInvoices.set(unpaid);
        this.invoicesLoading.set(false);
      },
      error: () => this.invoicesLoading.set(false),
    });
  }

  private loadLowStockItems(): void {
    this.lowStockLoading.set(true);
    this.inventoryApi.listLowStockItems().subscribe({
      next: (items) => {
        this.lowStockItems.set(items);
        this.lowStockLoading.set(false);
      },
      error: () => this.lowStockLoading.set(false),
    });
  }

  private loadDraftPayslips(): void {
    this.payslipsLoading.set(true);
    this.payrollApi.listPayslips({ page: 1, limit: DASHBOARD_LIST_LIMIT, status: 'Draft' }).subscribe({
      next: (res) => {
        this.draftPayslips.set(res.data);
        this.payslipsLoading.set(false);
      },
      error: () => this.payslipsLoading.set(false),
    });
  }

  private loadOpenTickets(): void {
    this.ticketsLoading.set(true);
    // No way to ask the endpoint for two statuses at once (Open + InProgress) - fetch a page and
    // filter client-side, same approach as the Nurse widget's pending-tasks query.
    this.helpdeskApi.list({ limit: DASHBOARD_LIST_LIMIT }).subscribe({
      next: (res) => {
        const open = res.data.filter((ticket) => ticket.status === 'Open' || ticket.status === 'InProgress');
        this.openTickets.set(open);
        this.ticketsLoading.set(false);
      },
      error: () => this.ticketsLoading.set(false),
    });
  }
}
