import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// jsdom has no ResizeObserver — PrimeNG's p-tabs (TabList) binds one in ngAfterViewInit,
// which throws in any spec that renders a component containing it (e.g. patient-detail's tabs).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
