import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { NursingConsole } from './nursing-console.js';
import { NursingApiService } from './nursing-api.service.js';

describe('NursingConsole', () => {
  function setup() {
    const api = {
      listTasks: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      createTask: jest.fn().mockReturnValue(of({})),
      startTask: jest.fn().mockReturnValue(of({})),
      completeTask: jest.fn().mockReturnValue(of({})),
      cancelTask: jest.fn().mockReturnValue(of({})),
      listAdministrations: jest.fn().mockReturnValue(of({ data: [], total: 0 })),
      createAdministration: jest.fn().mockReturnValue(of({})),
      administer: jest.fn().mockReturnValue(of({})),
      skipAdministration: jest.fn().mockReturnValue(of({})),
    } as unknown as NursingApiService;
    const messageService = { add: jest.fn() } as unknown as MessageService;

    TestBed.configureTestingModule({
      imports: [NursingConsole],
      providers: [
        { provide: NursingApiService, useValue: api },
        { provide: MessageService, useValue: messageService },
      ],
    });

    const fixture = TestBed.createComponent(NursingConsole);
    return { fixture, api, messageService };
  }

  it('loads tasks and administrations on init', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.listTasks).toHaveBeenCalled();
    expect(api.listAdministrations).toHaveBeenCalled();
  });

  it('filters by admission ID', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.admissionIdFilter.set('adm-1');
    fixture.componentInstance.applyFilter();
    await fixture.whenStable();

    expect(api.listTasks).toHaveBeenCalledWith('adm-1');
    expect(api.listAdministrations).toHaveBeenCalledWith('adm-1');
  });

  it('creates a task and toasts success', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.openTaskModal();
    fixture.componentInstance.taskForm.set({ admissionId: 'adm-1', taskType: 'Vitals Check', description: 'Q4H vitals' });
    fixture.componentInstance.submitTask();
    await fixture.whenStable();

    expect(api.createTask).toHaveBeenCalledWith({ admissionId: 'adm-1', taskType: 'Vitals Check', description: 'Q4H vitals' });
    expect(fixture.componentInstance.showTaskModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Task created' }));
  });

  it('completes a task', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.completeTask({ id: 't1' } as never);
    await fixture.whenStable();

    expect(api.completeTask).toHaveBeenCalledWith('t1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Task completed' }));
  });

  it('administers a scheduled dose', async () => {
    const { fixture, api, messageService } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.administer({ id: 'a1', drugName: 'Paracetamol' } as never);
    await fixture.whenStable();

    expect(api.administer).toHaveBeenCalledWith('a1');
    expect(messageService.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: 'Dose administered' }));
  });

  it('shows an error toast when creating a task fails', async () => {
    const { fixture, api } = setup();
    (api.createTask as jest.Mock).mockReturnValue({
      subscribe: (handlers: { error: (err: ApiError) => void }) =>
        handlers.error({ status: 400, message: 'Invalid admission', body: null }),
    });
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.taskForm.set({ admissionId: 'bad', taskType: 'X', description: 'Y' });
    fixture.componentInstance.submitTask();
    await fixture.whenStable();

    expect(fixture.componentInstance.taskError()).toBe('Invalid admission');
  });
});
