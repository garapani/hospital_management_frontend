import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import {
  CreateAdministrationDto,
  CreateHandoffNoteDto,
  CreateTaskDto,
  MedicationAdministration,
  NursingTask,
  PaginatedResult,
  ShiftHandoffNote,
} from './nursing.model.js';

@Injectable({ providedIn: 'root' })
export class NursingApiService {
  private readonly apiClient = inject(ApiClientService);

  listTasks(admissionId?: string, page?: number, limit?: number): Observable<PaginatedResult<NursingTask>> {
    const query: Record<string, string | number> = {};
    if (admissionId) query['admissionId'] = admissionId;
    if (page !== undefined) query['page'] = page;
    if (limit !== undefined) query['limit'] = limit;
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

  listAdministrations(admissionId?: string, page?: number, limit?: number): Observable<PaginatedResult<MedicationAdministration>> {
    const query: Record<string, string | number> = {};
    if (admissionId) query['admissionId'] = admissionId;
    if (page !== undefined) query['page'] = page;
    if (limit !== undefined) query['limit'] = limit;
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

  listHandoffNotes(admissionId?: string, page?: number, limit?: number): Observable<PaginatedResult<ShiftHandoffNote>> {
    const query: Record<string, string | number> = {};
    if (admissionId) query['admissionId'] = admissionId;
    if (page !== undefined) query['page'] = page;
    if (limit !== undefined) query['limit'] = limit;
    return this.apiClient.get<PaginatedResult<ShiftHandoffNote>>('/nursing/handoff-notes', { params: query });
  }

  createHandoffNote(dto: CreateHandoffNoteDto): Observable<ShiftHandoffNote> {
    return this.apiClient.post<ShiftHandoffNote>('/nursing/handoff-notes', dto);
  }

  acknowledgeHandoffNote(id: string): Observable<ShiftHandoffNote> {
    return this.apiClient.post<ShiftHandoffNote>(`/nursing/handoff-notes/${id}/acknowledge`, {});
  }
}
