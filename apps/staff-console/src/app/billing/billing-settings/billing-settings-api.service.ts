import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';
import { Observable } from 'rxjs';
import { BillingSettings } from './billing-settings.model.js';

@Injectable({ providedIn: 'root' })
export class BillingSettingsApiService {
  private readonly api = inject(ApiClientService);

  getSettings(): Observable<BillingSettings | null> {
    return this.api.get<BillingSettings | null>('/billing/settings');
  }

  updateSettings(dto: Partial<BillingSettings>): Observable<BillingSettings> {
    return this.api.patch<BillingSettings>('/billing/settings', dto);
  }
}
