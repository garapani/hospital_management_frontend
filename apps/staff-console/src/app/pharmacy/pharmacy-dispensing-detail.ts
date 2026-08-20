import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AuthService } from '@org/auth';

import { PharmacyDispensingApiService } from './pharmacy-dispensing-api.service.js';
import { dispensingStatusSeverity, PharmacyDispensing } from './pharmacy-dispensing.model.js';

@Component({
  selector: 'hms-pharmacy-dispensing-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule],
  templateUrl: './pharmacy-dispensing-detail.html',
})
export class PharmacyDispensingDetail implements OnInit {
  private readonly pharmacyApi = inject(PharmacyDispensingApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly dispensing = signal<PharmacyDispensing | null>(null);
  readonly loading = signal(true);
  readonly dispensingInProgress = signal(false);

  readonly statusSeverity = dispensingStatusSeverity;

  ngOnInit() {
    // Subscribes to paramMap (not route.snapshot) so a route-reuse navigation between two
    // /clinical/pharmacy/:id URLs refetches instead of leaving stale data on screen.
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.pharmacyApi.getById(id).subscribe({
      next: (data) => {
        this.dispensing.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack() {
    this.router.navigate(['/clinical/pharmacy']);
  }

  dispenseDrug() {
    const current = this.dispensing();
    const id = current?.id;
    if (!id || current?.status !== 'Pending') return;

    this.dispensingInProgress.set(true);
    this.pharmacyApi.dispense(id).subscribe({
      next: (updated) => {
        this.dispensing.set(updated);
        this.dispensingInProgress.set(false);
      },
      error: () => this.dispensingInProgress.set(false),
    });
  }
}
