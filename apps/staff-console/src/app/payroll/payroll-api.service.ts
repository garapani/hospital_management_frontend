import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

export type PayslipStatus = 'Draft' | 'Paid';

export interface Payslip {
  id: string;
  employeeId: string;
  periodMonth: number;
  periodYear: number;
  basicAmount: number;
  allowanceAmount: number;
  grossAmount: number;
  deductionAmount: number;
  netAmount: number;
  status: PayslipStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface RunPayrollDto {
  month: number;
  year: number;
  allowancePercent?: number;
  deductionPercent?: number;
  notes?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class PayrollApiService {
  private readonly api = inject(ApiClientService);

  run(dto: RunPayrollDto): Observable<{ count: number }> {
    return this.api.post<{ count: number }>('/payroll/run', dto);
  }

  listPayslips(params: {
    page: number;
    limit: number;
    month?: number;
    year?: number;
    status?: PayslipStatus;
  }): Observable<Paginated<Payslip>> {
    return this.api.get<Paginated<Payslip>>('/payroll/payslips', { params });
  }

  markPaid(id: string): Observable<Payslip> {
    return this.api.post<Payslip>(`/payroll/payslips/${id}/paid`, {});
  }
}
