import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { OtList } from './ot-list.js';
import { OtApiService } from './ot-api.service.js';

describe('OtList', () => {
  function setup() {
    const api = {
      list: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      findOne: jest.fn().mockReturnValue(of({})),
      schedule: jest.fn().mockReturnValue(of({ id: 's1', surgeryNumber: 'OT-0001' })),
      start: jest.fn().mockReturnValue(of({})),
      complete: jest.fn().mockReturnValue(of({})),
      cancel: jest.fn().mockReturnValue(of({})),
    } as unknown as OtApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [OtList],
      providers: [
        { provide: OtApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(OtList);
    return { fixture, api, messageService };
  }

  it('loads surgeries on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.list).toHaveBeenCalledWith({ patientId: undefined, status: undefined, page: 1, limit: 20 });
  });

  it('schedules a surgery and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openScheduleModal();
    fixture.componentInstance.scheduleForm.set({ patientId: 'p1', procedureName: 'Appendectomy' });
    fixture.componentInstance.submitSchedule();
    await fixture.whenStable();

    expect(api.schedule).toHaveBeenCalledWith({ patientId: 'p1', procedureName: 'Appendectomy' });
    expect(fixture.componentInstance.showScheduleModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Surgery scheduled' }));
  });

  it('starts and completes a surgery', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.start({ id: 's1' } as never);
    await fixture.whenStable();
    expect(api.start).toHaveBeenCalledWith('s1');

    fixture.componentInstance.complete({ id: 's1' } as never);
    await fixture.whenStable();
    expect(api.complete).toHaveBeenCalledWith('s1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Surgery completed' }));
  });

  it('shows an error toast when scheduling fails', async () => {
    const { fixture, api } = setup();
    (api.schedule as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid patient', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.scheduleForm.set({ patientId: 'bad', procedureName: 'X' });
    fixture.componentInstance.submitSchedule();
    await fixture.whenStable();

    expect(fixture.componentInstance.scheduleError()).toBe('Invalid patient');
  });
});
