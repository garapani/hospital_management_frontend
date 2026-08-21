import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { BillingSettingsApiService } from './billing-settings-api.service.js';
import { BillingSettings } from './billing-settings.model.js';

@Component({
  imports: [FormsModule, ButtonModule, InputTextModule],
  selector: 'hms-billing-settings',
  templateUrl: './billing-settings.html',
})
export class BillingSettingsComponent {
  private readonly api = inject(BillingSettingsApiService);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly settingsForm = signal<BillingSettings>({
    gstin: '',
    stateCode: '',
    hospitalLegalName: '',
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getSettings().subscribe({
      next: (data) => {
        if (data) {
          this.settingsForm.set(data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Could not load billing settings.',
        });
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.api.updateSettings(this.settingsForm()).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Settings saved',
          detail: 'Billing settings updated successfully.',
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Save failed',
          detail: 'Failed to update billing settings.',
        });
      },
    });
  }
}
