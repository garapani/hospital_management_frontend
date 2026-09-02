import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  DirectoryApiService,
  DirectoryEntityType,
  DirectoryResolveRequest,
  DirectoryResolveResult,
} from './directory-api.service.js';

const REQUEST_FIELD: Record<DirectoryEntityType, keyof DirectoryResolveRequest> = {
  patient: 'patientIds',
  doctor: 'doctorIds',
  ward: 'wardIds',
  bed: 'bedIds',
  item: 'itemIds',
};

const RESULT_FIELD: Record<DirectoryEntityType, keyof DirectoryResolveResult> = {
  patient: 'patients',
  doctor: 'doctors',
  ward: 'wards',
  bed: 'beds',
  item: 'items',
};

interface PendingBatch {
  ids: Map<DirectoryEntityType, Set<string>>;
  waiters: Map<string, Array<(name: string | null) => void>>;
}

/**
 * Every `resolve()` call within the same JS tick (e.g. every row of a table rendering on init)
 * is coalesced into a single POST /directory/resolve — a microtask boundary is late enough to
 * catch a whole `@for` loop's worth of calls, which all fire synchronously during change
 * detection, but early enough that the page never visibly waits on it. Resolved names are cached
 * for the lifetime of the app (a `providedIn: 'root'` singleton) since they rarely change within
 * a session and re-resolving the same id across screens would defeat the point of batching.
 */
@Injectable({ providedIn: 'root' })
export class DirectoryResolverService {
  private readonly api = inject(DirectoryApiService);
  private readonly cache = new Map<string, string | null>();
  private batch: PendingBatch | null = null;

  resolve(type: DirectoryEntityType, id: string): Observable<string | null> {
    const key = `${type}:${id}`;
    if (this.cache.has(key)) {
      return of(this.cache.get(key) ?? null);
    }

    return new Observable<string | null>((subscriber) => {
      if (!this.batch) {
        this.batch = { ids: new Map(), waiters: new Map() };
        queueMicrotask(() => this.flush());
      }
      const batch = this.batch;
      if (!batch.ids.has(type)) {
        batch.ids.set(type, new Set());
      }
      batch.ids.get(type)?.add(id);
      if (!batch.waiters.has(key)) {
        batch.waiters.set(key, []);
      }
      batch.waiters.get(key)?.push((name) => {
        subscriber.next(name);
        subscriber.complete();
      });
    });
  }

  private flush(): void {
    const batch = this.batch;
    this.batch = null;
    if (!batch) return;

    const request: DirectoryResolveRequest = {};
    for (const [type, ids] of batch.ids) {
      if (ids.size > 0) {
        request[REQUEST_FIELD[type]] = Array.from(ids);
      }
    }

    this.api.resolve(request).subscribe({
      next: (result) => this.settle(batch, result),
      error: () => this.settle(batch, null),
    });
  }

  private settle(batch: PendingBatch, result: DirectoryResolveResult | null): void {
    for (const [key, callbacks] of batch.waiters) {
      const separatorIndex = key.indexOf(':');
      const type = key.slice(0, separatorIndex) as DirectoryEntityType;
      const id = key.slice(separatorIndex + 1);
      const name = this.formatName(type, result?.[RESULT_FIELD[type]]?.[id]);
      this.cache.set(key, name);
      callbacks.forEach((callback) => callback(name));
    }
  }

  /**
   * A resolved name is shown on its own everywhere — no raw UUID suffix (that was a debugging
   * affordance that shipped; found live 2026-09-02 across Nursing, OT, and every other
   * `<hms-entity-name>` consumer). Patient is the one type with a second human-readable
   * identifier worth surfacing (`patientNo`, e.g. "Asha Verma (PAT-2026-00001)") — matching what
   * every patient-search picker in this app already shows; every other type shows the bare name.
   */
  private formatName(type: DirectoryEntityType, entry: { displayName: string; patientNo?: string } | undefined): string | null {
    if (!entry) return null;
    if (type === 'patient' && entry.patientNo) {
      return `${entry.displayName} (${entry.patientNo})`;
    }
    return entry.displayName;
  }
}
