import { Component, Input, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { DirectoryEntityType } from './directory-api.service.js';
import { DirectoryResolverService } from './directory-resolver.service.js';

/**
 * Drop-in replacement for `{{ x.patientId }}` (or doctorId/wardId/bedId) anywhere a raw uuid was
 * being shown — resolves and shows the name alongside the id (review-comments.md: "ward and bed
 * are raw UUIDs" / the systemic doctor-id/patient-id-as-uuid finding). Renders inline, so it can
 * sit inside an existing <a routerLink> the same way the raw `{{ }}` interpolation did.
 */
@Component({
  selector: 'hms-entity-name',
  standalone: true,
  template: `@if (resolvedName(); as name) {
    {{ name }} <span class="text-slate-400 font-mono text-[10px]">({{ id }})</span>
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
