import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  CreateAdministrationDto,
  CreateTaskDto,
  MedicationAdministration,
  NursingTask,
  PaginatedResult,
} from './nursing.model.js';

@Injectable({ providedIn: 'root' })
export class NursingApiService {
  private readonly apiClient = inject(ApiClientService);

  listTasks(admissionId?: string): Observable<PaginatedResult<NursingTask>> {
    const query: Record<string, string> = {};
    if (admissionId) query['admissionId'] = admissionId;
    return this.apiClient.get<PaginatedResult<NursingTask>>('/nursing/tasks', { params: query });
  }

  createTask(dto: CreateTaskDto): Observable<NursingTask> {
    return this.apiClient.post<NursingTask>('/nursing/tasks', dto);
  }

  startTask(id: string): Observable<NursingTask> {
    return this.apiClient.post<NursingTask>(`/nursing/tasks/${id}/start`, {});
  }

  completeTask(id: string): Observable<NursingTask> {
    return this.apiClient.post<NursingTask>(`/nursing/tasks/${id}/complete`, {});
  }

  cancelTask(id: string): Observable<NursingTask> {
    return this.apiClient.post<NursingTask>(`/nursing/tasks/${id}/cancel`, {});
  }

  listAdministrations(admissionId?: string): Observable<PaginatedResult<MedicationAdministration>> {
    const query: Record<string, string> = {};
    if (admissionId) query['admissionId'] = admissionId;
    return this.apiClient.get<PaginatedResult<MedicationAdministration>>('/nursing/administrations', { params: query });
  }

  createAdministration(dto: CreateAdministrationDto): Observable<MedicationAdministration> {
    return this.apiClient.post<MedicationAdministration>('/nursing/administrations', dto);
  }

  administer(id: string): Observable<MedicationAdministration> {
    return this.apiClient.post<MedicationAdministration>(`/nursing/administrations/${id}/administer`, {});
  }

  skipAdministration(id: string, notes?: string): Observable<MedicationAdministration> {
    return this.apiClient.post<MedicationAdministration>(`/nursing/administrations/${id}/skip`, { notes });
  }
}
