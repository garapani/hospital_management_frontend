import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// jsdom has no ResizeObserver — PrimeNG's p-tabs (TabList) binds one in ngAfterViewInit,
// which throws in any spec that renders a component containing it (e.g. patient-detail's tabs).
class ResizeObserverStub {
  observe(): void {
    // no-op: jsdom has no layout, so there's nothing to observe
  }
  unobserve(): void {
    // no-op
  }
  disconnect(): void {
    // no-op
  }
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
