import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';

export type EmploymentType = 'FullTime' | 'PartTime' | 'Contract';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId: string | null;
  designation: string | null;
  phone: string | null;
  email: string | null;
  joinDate: string;
  employmentType: EmploymentType;
  monthlyBasicSalary: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  departmentId?: string;
  designation?: string;
  phone?: string;
  email?: string;
  joinDate: string;
  employmentType?: EmploymentType;
  monthlyBasicSalary?: number;
}

export interface UpdateEmployeeDto {
  firstName?: string;
  lastName?: string;
  departmentId?: string;
  designation?: string;
  phone?: string;
  email?: string;
  joinDate?: string;
  employmentType?: EmploymentType;
  monthlyBasicSalary?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class EmployeesApiService {
  private readonly api = inject(ApiClientService);

  list(params: { page: number; limit: number; q?: string }): Observable<Paginated<Employee>> {
    const query: Record<string, string | number> = { page: params.page, limit: params.limit };
    if (params.q !== undefined) query['q'] = params.q;
    return this.api.get<Paginated<Employee>>('/employees', { params: query });
  }

  create(dto: CreateEmployeeDto): Observable<Employee> {
    return this.api.post<Employee>('/employees', dto);
  }

  update(id: string, dto: UpdateEmployeeDto): Observable<Employee> {
    return this.api.patch<Employee>(`/employees/${id}`, dto);
  }

  deactivate(id: string): Observable<Employee> {
    return this.api.patch<Employee>(`/employees/${id}/deactivate`, {});
  }

  reactivate(id: string): Observable<Employee> {
    return this.api.patch<Employee>(`/employees/${id}/reactivate`, {});
  }
}
