import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ApiError } from '@org/api-client';
import { PatientsApiService, Patient, CreatePatientDto } from './patients-api.service.js';
import { calculateAge, isValidEmail, isValidPhoneNumber } from './patient.model.js';

@Component({
  selector: 'hms-patient-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    SelectModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './patient-list.html',
})
export class PatientList implements OnInit {
  private api = inject(PatientsApiService);
  private router = inject(Router);
  private messageService = inject(MessageService);

  readonly patients = signal<Patient[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);

  readonly pageSize = signal(10);
  readonly age = calculateAge;
  readonly isValidPhoneNumber = isValidPhoneNumber;
  readonly isValidEmail = isValidEmail;
  readonly firstRecord = signal(0);
  readonly searchQuery = signal('');

  // Registration Modal
  readonly showRegistrationModal = signal(false);
  readonly isSaving = signal(false);
  readonly showDuplicateWarning = signal(false);
  readonly duplicateMatches = signal<Patient[]>([]);

  readonly patientForm = signal<CreatePatientDto>({
    firstName: '',
    lastName: '',
    gender: 'Unknown',
    phoneNumber: '',
    dateOfBirth: '',
    bloodGroup: 'Unknown',
    allowDuplicate: false,
  });

  readonly genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
    { label: 'Unknown', value: 'Unknown' },
  ];

  readonly bloodGroupOptions = [
    { label: 'A+', value: 'A+' },
    { label: 'A-', value: 'A-' },
    { label: 'B+', value: 'B+' },
    { label: 'B-', value: 'B-' },
    { label: 'O+', value: 'O+' },
    { label: 'O-', value: 'O-' },
    { label: 'AB+', value: 'AB+' },
    { label: 'AB-', value: 'AB-' },
    { label: 'Unknown', value: 'Unknown' },
  ];

  ngOnInit() {
    this.loadPatients(0);
  }

  loadPatients(first: number) {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.api
      .search({
        page,
        limit: this.pageSize(),
        q: this.searchQuery() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.patients.set(res.data);
          this.totalRecords.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load patients',
          });
        },
      });
  }

  onLazyLoad(event: TableLazyLoadEvent) {
    this.firstRecord.set(event.first || 0);
    this.loadPatients(event.first || 0);
  }

  search() {
    this.firstRecord.set(0);
    this.loadPatients(0);
  }

  viewPatient(patient: Patient) {
    this.router.navigate(['/clinical/patients', patient.id]);
  }

  openRegistration() {
    this.patientForm.set({
      firstName: '',
      lastName: '',
      gender: 'Unknown',
      phoneNumber: '',
      dateOfBirth: '',
      bloodGroup: 'Unknown',
      allowDuplicate: false,
    });
    this.showDuplicateWarning.set(false);
    this.duplicateMatches.set([]);
    this.showRegistrationModal.set(true);
  }

  async checkAndSubmit() {
    const form = this.patientForm();
    if (!form.firstName || !form.lastName) return;

    this.isSaving.set(true);

    if (!form.allowDuplicate) {
      try {
        const matches = await this.api
          .checkDuplicates({
            firstName: form.firstName,
            lastName: form.lastName,
            phoneNumber: form.phoneNumber,
            dateOfBirth: form.dateOfBirth,
          })
          .toPromise();

        if (matches && matches.length > 0) {
          this.duplicateMatches.set(matches);
          this.showDuplicateWarning.set(true);
          this.isSaving.set(false);
          return;
        }
      } catch (error) {
        // Show warning when duplicate check fails instead of silently proceeding
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Could not verify duplicates. Proceeding with registration.',
        });
      }
    }

    this.submitRegistration();
  }

  private submitRegistration() {
    this.api.create(this.patientForm()).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Patient registered successfully',
        });
        this.showRegistrationModal.set(false);
        this.isSaving.set(false);
        this.search();
      },
      error: (err: ApiError) => {
        this.isSaving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.message || 'Failed to register patient',
        });
      },
    });
  }

  proceedWithDuplicate() {
    this.patientForm.set({ ...this.patientForm(), allowDuplicate: true });
    this.submitRegistration();
  }
}
