import { Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { AuthService } from '@org/auth';
import { PatientsApiService, Patient } from '../../patients/patients-api.service.js';

/**
 * Top-bar spotlight search (Ctrl+K / Cmd+K), reachable from any authenticated screen — mounted
 * once in `ShellChrome`. Receptionists/triage nurses handling queues and phone calls previously
 * had to navigate to the patients list and filter; this removes that detour. Searches
 * `GET /patients?q=`, which already matches name/phone/UHID in one query (patients.service.ts's
 * `findAll`) — no separate lookup needed.
 */
@Component({
  imports: [FormsModule, DialogModule, InputTextModule],
  selector: 'hms-global-search',
  templateUrl: './global-search.html',
})
export class GlobalSearchComponent {
  private readonly patientsApi = inject(PatientsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly open = signal(false);
  readonly query = signal('');
  readonly results = signal<Patient[]>([]);
  readonly loading = signal(false);
  readonly activeIndex = signal(0);

  readonly canSearch = computed(
    () => this.auth.hasPermission('patients.read') && !this.auth.isPlatformAdmin(),
  );

  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          const trimmed = q.trim();
          if (!trimmed) {
            return of(null);
          }
          this.loading.set(true);
          return this.patientsApi.search({ page: 1, limit: 8, q: trimmed });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          this.results.set(result?.data ?? []);
          this.activeIndex.set(0);
        },
        error: () => {
          this.loading.set(false);
          this.results.set([]);
        },
      });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      if (!this.canSearch()) {
        return;
      }
      event.preventDefault();
      this.toggle();
      return;
    }
    if (!this.open()) {
      return;
    }
    if (event.key === 'Escape') {
      this.close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.min(i + 1, this.results().length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const patient = this.results()[this.activeIndex()];
      if (patient) {
        this.select(patient);
      }
    }
  }

  toggle(): void {
    this.open() ? this.close() : this.openPalette();
  }

  private openPalette(): void {
    this.query.set('');
    this.results.set([]);
    this.activeIndex.set(0);
    this.open.set(true);
    // Dialog content isn't in the DOM until the next tick.
    setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
  }

  close(): void {
    this.open.set(false);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.query$.next(value);
  }

  select(patient: Patient): void {
    this.close();
    this.router.navigate(['/clinical/patients', patient.id]);
  }
}
