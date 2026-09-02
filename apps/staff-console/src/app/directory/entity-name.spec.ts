import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EntityName } from './entity-name.js';
import { DirectoryResolverService } from './directory-resolver.service.js';

describe('EntityName', () => {
  function setup(resolvedName: string | null) {
    const resolver = {
      resolve: jest.fn().mockReturnValue(of(resolvedName)),
    } as unknown as DirectoryResolverService;

    TestBed.configureTestingModule({
      imports: [EntityName],
      providers: [{ provide: DirectoryResolverService, useValue: resolver }],
    });

    const fixture = TestBed.createComponent(EntityName);
    return { fixture, resolver };
  }

  it('renders the raw id in mono while unresolved', () => {
    const { fixture } = setup(null);
    fixture.componentRef.setInput('type', 'patient');
    fixture.componentRef.setInput('id', 'patient-1');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('patient-1');
    expect(fixture.componentInstance.resolvedName()).toBeNull();
  });

  it('renders only the resolved name once resolved, not the raw id', () => {
    const { fixture, resolver } = setup('Jane Doe');
    fixture.componentRef.setInput('type', 'patient');
    fixture.componentRef.setInput('id', 'patient-1');
    fixture.detectChanges();

    expect(resolver.resolve).toHaveBeenCalledWith('patient', 'patient-1');
    expect(fixture.componentInstance.resolvedName()).toBe('Jane Doe');
    expect(fixture.nativeElement.textContent.trim()).toBe('Jane Doe');
    expect(fixture.nativeElement.textContent).not.toContain('patient-1');
  });

  it('re-resolves when the id input changes', () => {
    const { fixture, resolver } = setup('Jane Doe');
    fixture.componentRef.setInput('type', 'patient');
    fixture.componentRef.setInput('id', 'patient-1');
    fixture.detectChanges();

    fixture.componentRef.setInput('id', 'patient-2');
    fixture.detectChanges();

    expect(resolver.resolve).toHaveBeenCalledWith('patient', 'patient-2');
  });
});
