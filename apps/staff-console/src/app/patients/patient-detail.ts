import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';

import { PatientsApiService, Patient } from './patients-api.service.js';

@Component({
  selector: 'hms-patient-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, TagModule, ToastModule, TabsModule],
  providers: [MessageService],
  templateUrl: './patient-detail.html',
})
export class PatientDetail implements OnInit {
  private api = inject(PatientsApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private messageService = inject(MessageService);

  readonly patient = signal<Patient | null>(null);
  readonly loading = signal(true);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.loadPatient(id);
      }
    });
  }

  loadPatient(id: string) {
    this.loading.set(true);
    this.api.getById(id).subscribe({
      next: (data) => {
        this.patient.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load patient profile',
        });
        this.loading.set(false);
      },
    });
  }

  goBack() {
    this.router.navigate(['/clinical/patients']);
  }
}
