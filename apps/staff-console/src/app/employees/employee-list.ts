import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Department } from '../master-data/master-data.model.js';
import { CreateEmployeeDto, EmployeesApiService, EmploymentType } from './employees-api.service.js';
import { toLocalDateString } from '../shared/date.util.js';

const EMPLOYMENT_TYPES: EmploymentType[] = ['FullTime', 'PartTime', 'Contract'];

/** Parses a 'YYYY-MM-DD' string to a Date at local midnight, for seeding a p-datepicker — a plain
 *  `new Date('YYYY-MM-DD')` parses as UTC midnight, which renders as the previous day in any
 *  timezone behind UTC. */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Form state for the create/edit dialog. `joinDate` is a `Date` here (what `p-datepicker`
 *  actually reads/writes) — converted to a local 'YYYY-MM-DD' string only when building the DTO. */
interface EmployeeFormState {
  firstName: string;
  lastName: string;
  designation?: string;
  departmentId?: string;
  joinDate: Date;
  employmentType: EmploymentType;
  monthlyBasicSalary: number;
  phone?: string;
  email?: string;
}

@Component({
  selector: 'hms-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DatePickerModule,
    TagModule,
  ],
  templateUrl: './employee-list.html',
})
export class EmployeeList {
  private readonly employeesApi = inject(EmployeesApiService);
  private readonly mdApi = inject(MasterDataApiService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);

  readonly employees = signal<{ id: string; employeeCode: string; firstName: string; lastName: string; designation: string | null; departmentId: string | null; joinDate: string; employmentType: EmploymentType; monthlyBasicSalary: number; isActive: boolean }[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);
  readonly q = signal('');

  readonly showEditModal = signal(false);
  readonly editForm = signal<EmployeeFormState>({
    firstName: '',
    lastName: '',
    joinDate: new Date(),
    employmentType: 'FullTime',
    monthlyBasicSalary: 0,
  });
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly departmentOptions = signal<{ label: string; value: string }[]>([]);
  readonly employmentTypeOptions = EMPLOYMENT_TYPES.map((t) => ({ label: t, value: t }));

  readonly canManage = this.auth.hasPermission('employee.manage');
  readonly togglingId = signal<string | null>(null);

  constructor() {
    this.load(0);
    this.mdApi.listDepartments().subscribe({
      next: (departments: Department[]) => {
        this.departmentOptions.set(
          departments.map((d) => ({ label: d.departmentName, value: d.id })),
        );
      },
      error: () => undefined,
    });
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.employeesApi.list({ page, limit: this.pageSize(), q: this.q() || undefined }).subscribe({
      next: (res) => {
        this.employees.set(res.data);
        this.totalRecords.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.firstRecord.set(event.first || 0);
    this.load(event.first || 0);
  }

  search(): void {
    this.firstRecord.set(0);
    this.load(0);
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.editForm.set({
      firstName: '',
      lastName: '',
      joinDate: new Date(),
      employmentType: 'FullTime',
      monthlyBasicSalary: 0,
    });
    this.saveError.set(null);
    this.showEditModal.set(true);
  }

  openEditModal(employee: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string | null;
    departmentId: string | null;
    joinDate: string;
    employmentType: EmploymentType;
    monthlyBasicSalary: number;
  }): void {
    this.editingId.set(employee.id);
    this.editForm.set({
      firstName: employee.firstName,
      lastName: employee.lastName,
      designation: employee.designation ?? undefined,
      departmentId: employee.departmentId ?? undefined,
      joinDate: parseLocalDate(employee.joinDate),
      employmentType: employee.employmentType,
      monthlyBasicSalary: employee.monthlyBasicSalary,
    });
    this.saveError.set(null);
    this.showEditModal.set(true);
  }

  submitSave(): void {
    this.saving.set(true);
    this.saveError.set(null);
    const form = this.editForm();
    // @IsOptional() on the backend's `email` (@IsEmail) only skips undefined/null, not '' — a
    // cleared Email field must not be sent as an empty string or it 400s.
    const dto: CreateEmployeeDto = { ...form, joinDate: toLocalDateString(form.joinDate), email: form.email || undefined };
    const request = this.editingId()
      ? this.employeesApi.update(this.editingId()!, dto)
      : this.employeesApi.create(dto);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showEditModal.set(false);
        this.load(this.firstRecord());
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Could not save employee. Check the details and try again.');
      },
    });
  }

  toggleActive(employee: { id: string; firstName: string; lastName: string; isActive: boolean }): void {
    if (this.togglingId() !== null) return;
    const doToggle = () => {
      this.togglingId.set(employee.id);
      const request = employee.isActive
        ? this.employeesApi.deactivate(employee.id)
        : this.employeesApi.reactivate(employee.id);
      request.subscribe({
        next: () => {
          this.togglingId.set(null);
          this.load(this.firstRecord());
          this.messageService.add({
            severity: 'success',
            summary: employee.isActive ? 'Employee deactivated' : 'Employee reactivated',
            detail: `${employee.firstName} ${employee.lastName} is ${employee.isActive ? 'no longer active' : 'active again'}.`,
          });
        },
        error: () => {
          this.togglingId.set(null);
          this.messageService.add({
            severity: 'error',
            summary: employee.isActive ? 'Deactivate failed' : 'Reactivate failed',
            detail: 'Please try again.',
          });
        },
      });
    };

    if (!employee.isActive) {
      doToggle();
      return;
    }
    this.confirmationService.confirm({
      header: 'Deactivate Employee',
      message: `Deactivate ${employee.firstName} ${employee.lastName}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Deactivate', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: doToggle,
    });
  }
}
