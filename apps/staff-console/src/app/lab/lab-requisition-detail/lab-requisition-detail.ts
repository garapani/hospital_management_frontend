import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, from } from 'rxjs';
import { concatMap, toArray } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@org/auth';

import { LabApiService, LabRequisition, LabResult, LabTestComponent } from '../lab-api.service.js';
import { labRequisitionStatusSeverity, componentReferenceRange, computeIsAbnormal, hasNumericRange } from '../lab.model.js';
import { EntityName } from '../../directory/entity-name.js';
import { openPdfBlobInNewTab } from '../../shared/pdf-blob.util.js';

export interface DisplayedResult {
  component: LabTestComponent;
  result: LabResult | undefined;
}

@Component({
  selector: 'hms-lab-requisition-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ButtonModule, TagModule, InputTextModule, DialogModule, ToastModule, ConfirmDialogModule, EntityName],
  providers: [MessageService, ConfirmationService],
  templateUrl: './lab-requisition-detail.html',
})
export class LabRequisitionDetail implements OnInit {
  private readonly labApi = inject(LabApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  readonly auth = inject(AuthService);

  readonly requisition = signal<LabRequisition | null>(null);
  readonly loading = signal(true);
  readonly collecting = signal(false);
  readonly verifying = signal(false);
  readonly printingLabel = signal(false);
  readonly printingReport = signal(false);

  readonly enteredResults = signal<DisplayedResult[]>([]);
  readonly resultsViewLoading = signal(false);

  readonly showResultsDialog = signal(false);
  readonly components = signal<LabTestComponent[]>([]);
  readonly componentsLoading = signal(false);
  readonly resultValues = signal<Record<string, string>>({});
  readonly enteringResults = signal(false);
  readonly resultsError = signal('');

  readonly statusSeverity = labRequisitionStatusSeverity;
  readonly referenceRange = componentReferenceRange;
  readonly isNumericComponent = hasNumericRange;

  /** Live feedback at entry time — mirrors the backend's range check so a fat-fingered value warns
   *  before saving instead of only after a round trip (the saved `isAbnormal` badge already exists
   *  on the read-only results view; this powers the equivalent inline warning during entry). */
  isValueAbnormal(component: LabTestComponent): boolean {
    const value = this.resultValues()[component.id];
    return value !== undefined && computeIsAbnormal(component, value);
  }

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
        if (data.status === 'ResultsEntered' || data.status === 'Verified') {
          this.loadResultsView(data.id, data.testId);
        } else {
          this.enteredResults.set([]);
        }
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the requisition.' });
      },
    });
  }

  private loadResultsView(requisitionId: string, testId: string) {
    this.resultsViewLoading.set(true);
    forkJoin({
      results: this.labApi.getResults(requisitionId),
      components: this.labApi.listComponentsByTest(testId),
    }).subscribe({
      next: ({ results, components }) => {
        this.enteredResults.set(
          components.map((component) => ({
            component,
            result: results.find((r) => r.componentId === component.id),
          })),
        );
        this.resultsViewLoading.set(false);
      },
      error: () => {
        this.resultsViewLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load entered results.' });
      },
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
      error: () => {
        this.collecting.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to record sample collection.' });
      },
    });
  }

  printSpecimenLabel() {
    const id = this.requisition()?.id;
    if (!id) return;

    this.printingLabel.set(true);
    this.labApi.getSpecimenLabelPdf(id).subscribe({
      next: (blob) => {
        this.printingLabel.set(false);
        openPdfBlobInNewTab(blob);
      },
      error: () => {
        this.printingLabel.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate the specimen label.' });
      },
    });
  }

  printReport() {
    const id = this.requisition()?.id;
    if (!id) return;

    this.printingReport.set(true);
    this.labApi.getReportPdf(id).subscribe({
      next: (blob) => {
        this.printingReport.set(false);
        openPdfBlobInNewTab(blob);
      },
      error: () => {
        this.printingReport.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate the report.' });
      },
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
    // Sequential (concatMap), not parallel: enterResult takes a pessimistic_write lock on the
    // requisition row, so N concurrent requests just serialize on that lock anyway — going
    // sequential also means a partial failure is attributable to a specific component instead of
    // one blanket error after some have already saved.
    from(components).pipe(
      concatMap((c) => {
        const value = values[c.id].trim();
        return this.labApi.enterResult(id, { componentId: c.id, value, isAbnormal: computeIsAbnormal(c, value) });
      }),
      toArray(),
    ).subscribe({
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
        this.resultsError.set('Failed to save the results. Already-saved values are safe — retrying will not duplicate them.');
      },
    });
  }

  verify() {
    const id = this.requisition()?.id;
    if (!id) return;

    this.confirmationService.confirm({
      header: 'Verify Results',
      message: 'Verifying locks these results permanently. Have you reviewed the entered values above?',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Verify', severity: 'success' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.verifying.set(true);
        this.labApi.verify(id).subscribe({
          next: (updated) => {
            this.requisition.set(updated);
            this.verifying.set(false);
          },
          error: () => {
            this.verifying.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to verify results.' });
          },
        });
      },
    });
  }
}
