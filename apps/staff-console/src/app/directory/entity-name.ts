import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { DirectoryEntityType } from './directory-api.service.js';
import { DirectoryResolverService } from './directory-resolver.service.js';

/**
 * Drop-in replacement for `{{ x.patientId }}` (or doctorId/wardId/bedId) anywhere a raw uuid was
 * being shown — resolves and shows the name in its place (review-comments.md: "ward and bed
 * are raw UUIDs" / the systemic doctor-id/patient-id-as-uuid finding). Renders inline, so it can
 * sit inside an existing <a routerLink> the same way the raw `{{ }}` interpolation did.
 *
 * Shows only the resolved name once resolution succeeds — no raw-UUID suffix (that was a
 * debugging affordance that shipped to production; found live 2026-09-02 across Nursing, OT, and
 * every other consumer). `DirectoryResolverService.formatName()` already appends a patient's
 * human-readable `patientNo` where that's the useful secondary identifier; every other type shows
 * the bare name. The UUID fallback below only fires when resolution genuinely fails (deleted
 * record, resolver error) — better to show something than nothing there.
 */
@Component({
  selector: 'hms-entity-name',
  standalone: true,
  template: `@if (resolvedName(); as name) {
    {{ name }}
    } @else {
    <span class="font-mono text-xs">{{ id }}</span>
    }`,
})
export class EntityName implements OnChanges {
  @Input({ required: true }) type!: DirectoryEntityType;
  @Input({ required: true }) id!: string;

  private readonly resolver = inject(DirectoryResolverService);
  readonly resolvedName = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['id'] && !changes['type']) return;
    this.resolvedName.set(null);
    if (!this.id || !this.type) return;
    this.resolver.resolve(this.type, this.id).subscribe((name) => this.resolvedName.set(name));
  }
}
