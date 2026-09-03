import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { AuthService } from '@org/auth';

import { AdmissionsApiService, ActiveAdmission } from './admissions-api.service.js';
import { MasterDataApiService } from '../master-data/master-data-api.service.js';
import { Ward, Bed } from '../master-data/master-data.model.js';
import { bedStatusSeverity } from './admission.model.js';

export interface BedWithOccupant extends Bed {
  admission: ActiveAdmission | null;
}

@Component({
  selector: 'hms-ward-board',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SelectModule, TagModule],
  templateUrl: './ward-board.html',
})
export class WardBoard {
  private readonly admissionsApi = inject(AdmissionsApiService);
  private readonly masterDataApi = inject(MasterDataApiService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly wards = signal<Ward[]>([]);
  readonly selectedWardId = signal<string | null>(null);
  readonly beds = signal<BedWithOccupant[]>([]);

  readonly selectedWard = computed(() => this.wards().find((w) => w.id === this.selectedWardId()) ?? null);
  readonly bedStatusSeverity = bedStatusSeverity;

  readonly availableCount = computed(() => this.beds().filter((b) => b.status === 'Available').length);
  readonly occupiedCount = computed(() => this.beds().filter((b) => b.status === 'Occupied').length);
  readonly maintenanceCount = computed(() => this.beds().filter((b) => b.status === 'Maintenance').length);

  constructor() {
    this.masterDataApi.listWards().subscribe({
      next: (wards) => {
        const activeWards = wards.filter((w) => w.isActive);
        this.wards.set(activeWards);
        // Default to the viewer's own assigned ward (Nurse ward-scoping, PRD §6.2) when she has
        // one; otherwise the first ward, so the board never opens empty.
        const myWardId = this.auth.currentUser()?.wardId;
        const initial = (myWardId && activeWards.some((w) => w.id === myWardId)) ? myWardId : activeWards[0]?.id ?? null;
        this.selectedWardId.set(initial);
        if (initial) {
          this.loadBeds(initial);
        } else {
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  selectWard(wardId: string | null): void {
    this.selectedWardId.set(wardId);
    if (wardId) {
      this.loadBeds(wardId);
    } else {
      this.beds.set([]);
    }
  }

  private loadBeds(wardId: string): void {
    this.loading.set(true);
    this.masterDataApi.listBedsByWard(wardId).subscribe({
      next: (beds) => {
        const activeBeds = beds.filter((b) => b.isActive);
        this.admissionsApi.listActive(wardId).subscribe({
          next: (admissions) => {
            const byBedId = new Map(admissions.map((a) => [a.bedId, a]));
            this.beds.set(
              activeBeds
                .map((bed) => ({ ...bed, admission: byBedId.get(bed.id) ?? null }))
                .sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true })),
            );
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }
}
