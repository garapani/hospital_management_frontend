import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { AuthService } from '@org/auth';

import { LabApiService, LabRequisition, LabTestComponent } from '../lab-api.service.js';
import { labRequisitionStatusSeverity, componentReferenceRange } from '../lab.model.js';

@Component({
  selector: 'hms-lab-requisition-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, InputTextModule, DialogModule],
  templateUrl: './lab-requisition-detail.html',
})
export class LabRequisitionDetail implements OnInit {
  private readonly labApi = inject(LabApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly requisition = signal<LabRequisition | null>(null);
  readonly loading = signal(true);
  readonly collecting = signal(false);
  readonly verifying = signal(false);

  readonly showResultsDialog = signal(false);
  readonly components = signal<LabTestComponent[]>([]);
  readonly componentsLoading = signal(false);
  readonly resultValues = signal<Record<string, string>>({});
  readonly enteringResults = signal(false);
  readonly resultsError = signal('');

  readonly statusSeverity = labRequisitionStatusSeverity;
  readonly referenceRange = componentReferenceRange;

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.load(id);
      }
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.labApi.getRequisition(id).subscribe({
      next: (data) => {
        this.requisition.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goBack() {
    this.router.navigate(['/clinical/lab']);
  }

  collectSample() {
    const id = this.requisition()?.id;
    if (!id) return;

    this.collecting.set(true);
    this.labApi.collectSample(id).subscribe({
      next: (updated) => {
        this.requisition.set(updated);
        this.collecting.set(false);
      },
      error: () => this.collecting.set(false),
    });
  }

  openResultsDialog() {
    const req = this.requisition();
    if (!req) return;

    this.components.set([]);
    this.resultValues.set({});
    this.resultsError.set('');
    this.showResultsDialog.set(true);
    this.componentsLoading.set(true);
    this.labApi.listComponentsByTest(req.testId).subscribe({
      next: (components) => {
        this.components.set(components);
        this.componentsLoading.set(false);
      },
      error: () => {
        this.componentsLoading.set(false);
        this.resultsError.set('Could not load the test components. Please try again.');
      },
    });
  }

  setResultValue(componentId: string, value: string) {
    this.resultValues.set({ ...this.resultValues(), [componentId]: value });
  }

  submitResults() {
    const id = this.requisition()?.id;
    const components = this.components();
    if (!id || components.length === 0) return;

    const values = this.resultValues();
    if (components.some((c) => !(values[c.id] ?? '').trim())) {
      this.resultsError.set('Enter a value for every component before saving.');
      return;
    }

    this.enteringResults.set(true);
    this.resultsError.set('');
    forkJoin(components.map((c) => this.labApi.enterResult(id, { componentId: c.id, value: values[c.id].trim() }))).subscribe({
      next: () => {
        this.enteringResults.set(false);
        this.showResultsDialog.set(false);
        const currentId = this.requisition()?.id;
        if (currentId) {
          this.load(currentId);
        }
      },
      error: () => {
        this.enteringResults.set(false);
        this.resultsError.set('Failed to save the results. Please try again.');
      },
    });
  }

  verify() {
    const id = this.requisition()?.id;
    if (!id) return;

    this.verifying.set(true);
    this.labApi.verify(id).subscribe({
      next: (updated) => {
        this.requisition.set(updated);
        this.verifying.set(false);
      },
      error: () => this.verifying.set(false),
    });
  }
}
