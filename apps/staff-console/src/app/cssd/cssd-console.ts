import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { CssdApiService } from './cssd-api.service.js';
import {
  CreateInstrumentDto,
  CssdInstrument,
  CssdSterilizationCycle,
  STERILIZATION_METHODS,
  StartCycleDto,
} from './cssd.model.js';

const EMPTY_INSTRUMENT_FORM: CreateInstrumentDto = { code: '', name: '' };
const EMPTY_CYCLE_FORM: StartCycleDto = { instrumentId: '', method: 'Steam' };

@Component({
  imports: [DatePipe, FormsModule, TableModule, ButtonModule, TagModule, DialogModule, InputTextModule, InputNumberModule, SelectModule, TabsModule],
  selector: 'hms-cssd-console',
  templateUrl: './cssd-console.html',
})
export class CssdConsole {
  private readonly api = inject(CssdApiService);
  private readonly messageService = inject(MessageService);

  readonly sterilizationMethods = STERILIZATION_METHODS;

  readonly instruments = signal<CssdInstrument[]>([]);
  readonly instrumentsLoading = signal(false);
  readonly showInstrumentModal = signal(false);
  readonly instrumentForm = signal<CreateInstrumentDto>(EMPTY_INSTRUMENT_FORM);
  readonly instrumentSaving = signal(false);
  readonly instrumentError = signal<string | null>(null);

  readonly cycles = signal<CssdSterilizationCycle[]>([]);
  readonly cyclesLoading = signal(false);
  readonly showCycleModal = signal(false);
  readonly cycleForm = signal<StartCycleDto>(EMPTY_CYCLE_FORM);
  readonly cycleSaving = signal(false);
  readonly cycleError = signal<string | null>(null);
  readonly cycleActionId = signal<string | null>(null);

  readonly showFailModal = signal(false);
  readonly failCycleId = signal<string | null>(null);
  readonly failureReason = signal('');
  readonly failSaving = signal(false);

  readonly showCompleteModal = signal(false);
  readonly completeCycleId = signal<string | null>(null);
  readonly sterileHours = signal<number | null>(48);
  readonly completeSaving = signal(false);

  get instrumentOptions(): { label: string; value: string }[] {
    return this.instruments()
      .filter((i) => i.isActive)
      .map((i) => ({ label: `${i.code} — ${i.name}`, value: i.id }));
  }

  instrumentNameFor(instrumentId: string): string {
    const instrument = this.instruments().find((i) => i.id === instrumentId);
    return instrument ? `${instrument.code} — ${instrument.name}` : instrumentId;
  }

  constructor() {
    this.loadInstruments();
    this.loadCycles();
  }

  // --- Instruments ---

  loadInstruments(): void {
    this.instrumentsLoading.set(true);
    this.api.listInstruments().subscribe({
      next: (data) => {
        this.instruments.set(data);
        this.instrumentsLoading.set(false);
      },
      error: () => {
        this.instrumentsLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load the instrument catalog.' });
      },
    });
  }

  openInstrumentModal(): void {
    this.instrumentForm.set(EMPTY_INSTRUMENT_FORM);
    this.instrumentError.set(null);
    this.showInstrumentModal.set(true);
  }

  submitInstrument(): void {
    this.instrumentSaving.set(true);
    this.instrumentError.set(null);
    this.api.createInstrument(this.instrumentForm()).subscribe({
      next: () => {
        this.instrumentSaving.set(false);
        this.showInstrumentModal.set(false);
        this.loadInstruments();
        this.messageService.add({ severity: 'success', summary: 'Instrument added', detail: this.instrumentForm().name });
      },
      error: (err: ApiError) => {
        this.instrumentSaving.set(false);
        this.instrumentError.set(err.message || 'Failed to save the instrument.');
      },
    });
  }

  toggleInstrumentActive(instrument: CssdInstrument): void {
    const action = instrument.isActive ? this.api.deactivateInstrument(instrument.id) : this.api.reactivateInstrument(instrument.id);
    action.subscribe({
      next: () => {
        this.loadInstruments();
        this.messageService.add({
          severity: 'success',
          summary: instrument.isActive ? 'Instrument deactivated' : 'Instrument reactivated',
          detail: instrument.name,
        });
      },
      error: (err: ApiError) => {
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  // --- Sterilization cycles ---

  loadCycles(): void {
    this.cyclesLoading.set(true);
    this.api.listCycles().subscribe({
      next: (result) => {
        this.cycles.set(result.data);
        this.cyclesLoading.set(false);
      },
      error: () => {
        this.cyclesLoading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load sterilization cycles.' });
      },
    });
  }

  openCycleModal(): void {
    this.cycleForm.set(EMPTY_CYCLE_FORM);
    this.cycleError.set(null);
    this.showCycleModal.set(true);
  }

  submitCycle(): void {
    this.cycleSaving.set(true);
    this.cycleError.set(null);
    this.api.startCycle(this.cycleForm()).subscribe({
      next: () => {
        this.cycleSaving.set(false);
        this.showCycleModal.set(false);
        this.loadCycles();
        this.messageService.add({ severity: 'success', summary: 'Sterilization cycle started' });
      },
      error: (err: ApiError) => {
        this.cycleSaving.set(false);
        this.cycleError.set(err.message || 'Failed to start the cycle.');
      },
    });
  }

  openCompleteModal(cycle: CssdSterilizationCycle): void {
    this.completeCycleId.set(cycle.id);
    this.sterileHours.set(48);
    this.showCompleteModal.set(true);
  }

  submitComplete(): void {
    const id = this.completeCycleId();
    if (!id) return;
    this.completeSaving.set(true);
    this.api.completeCycle(id, { sterileHours: this.sterileHours() ?? 0 }).subscribe({
      next: () => {
        this.completeSaving.set(false);
        this.showCompleteModal.set(false);
        this.loadCycles();
        this.messageService.add({ severity: 'success', summary: 'Cycle completed' });
      },
      error: (err: ApiError) => {
        this.completeSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }

  openFailModal(cycle: CssdSterilizationCycle): void {
    this.failCycleId.set(cycle.id);
    this.failureReason.set('');
    this.showFailModal.set(true);
  }

  submitFail(): void {
    const id = this.failCycleId();
    if (!id) return;
    this.failSaving.set(true);
    this.api.failCycle(id, { failureReason: this.failureReason() }).subscribe({
      next: () => {
        this.failSaving.set(false);
        this.showFailModal.set(false);
        this.loadCycles();
        this.messageService.add({ severity: 'success', summary: 'Cycle marked failed' });
      },
      error: (err: ApiError) => {
        this.failSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Action failed', detail: err.message || 'Please try again.' });
      },
    });
  }
}
