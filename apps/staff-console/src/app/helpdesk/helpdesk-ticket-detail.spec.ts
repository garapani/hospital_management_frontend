import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@org/auth';
import { HelpdeskTicketDetail } from './helpdesk-ticket-detail.js';
import { HelpdeskApiService } from './helpdesk-api.service.js';
import { UsersApiService } from '../users/users-api.service.js';

describe('HelpdeskTicketDetail', () => {
  const TICKET = {
    id: 't1',
    ticketNumber: 'HD-0001',
    title: 'Printer broken',
    description: 'Ward 3 printer offline',
    category: null,
    priority: 'High',
    status: 'Open',
    requesterAccountId: 'acc-req',
    requesterName: 'Jane Doe',
    assigneeAccountId: null,
    assigneeName: null,
    resolvedBy: null,
    resolvedAt: null,
    closedAt: null,
  };

  function setup(opts: { canManage?: boolean; id?: string } = {}) {
    const api = {
      getById: jest.fn().mockReturnValue(of(TICKET)),
      assign: jest.fn().mockReturnValue(of({ ...TICKET, assigneeAccountId: 'agent-1', assigneeName: 'Amy Agent' })),
      start: jest.fn().mockReturnValue(of({ ...TICKET, status: 'InProgress' })),
      resolve: jest.fn().mockReturnValue(of({ ...TICKET, status: 'Resolved' })),
      close: jest.fn().mockReturnValue(of({ ...TICKET, status: 'Closed' })),
    } as unknown as HelpdeskApiService;
    const usersApi = {
      listDirectory: jest.fn().mockReturnValue(of([{ id: 'agent-1', displayName: 'Amy Agent', username: 'amy' }])),
    } as unknown as UsersApiService;
    const auth = { hasPermission: () => opts.canManage ?? true } as unknown as AuthService;
    const activatedRoute = {
      paramMap: of(convertToParamMap({ id: opts.id ?? 't1' })),
    } as unknown as ActivatedRoute;

    TestBed.configureTestingModule({
      imports: [HelpdeskTicketDetail],
      providers: [
        provideRouter([]),
        { provide: HelpdeskApiService, useValue: api },
        { provide: UsersApiService, useValue: usersApi },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    });

    const fixture = TestBed.createComponent(HelpdeskTicketDetail);
    return { fixture, api, usersApi };
  }

  it('loads the ticket for the routed id', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.getById).toHaveBeenCalledWith('t1');
    expect(fixture.componentInstance.ticket()).toEqual(TICKET);
    expect(fixture.componentInstance.loading()).toBe(false);
  });

  it('exposes canManage from the helpdesk.manage permission', () => {
    const { fixture } = setup({ canManage: false });
    expect(fixture.componentInstance.canManage).toBe(false);
  });

  it('toasts an error and clears loading when the ticket fails to load', async () => {
    const { fixture, api } = setup();
    (api.getById as jest.Mock).mockReturnValue(throwError(() => new Error('boom')));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.componentInstance.ticket()).toBeNull();
  });

  it('merges assignable accounts across the three helpdesk.manage roles, deduplicated by id', async () => {
    const { fixture, usersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (usersApi.listDirectory as jest.Mock).mockImplementation((role: string) =>
      of(
        role === 'Helpdesk Agent'
          ? [{ id: 'agent-1', displayName: 'Amy Agent', username: 'amy' }]
          : [{ id: 'agent-1', displayName: 'Amy Agent', username: 'amy' }], // same admin also in agent list
      ),
    );

    fixture.componentInstance.openAssignModal();
    await fixture.whenStable();

    expect(usersApi.listDirectory).toHaveBeenCalledWith('Helpdesk Agent');
    expect(usersApi.listDirectory).toHaveBeenCalledWith('Hospital Admin');
    expect(usersApi.listDirectory).toHaveBeenCalledWith('Super Admin');
    expect(fixture.componentInstance.assigneeOptions()).toEqual([{ id: 'agent-1', displayName: 'Amy Agent', username: 'amy' }]);
    expect(fixture.componentInstance.assigneeOptionsLoading()).toBe(false);
  });

  it('tolerates one role lookup failing when building the assignee picker', async () => {
    const { fixture, usersApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    (usersApi.listDirectory as jest.Mock).mockImplementation((role: string) =>
      role === 'Super Admin' ? throwError(() => new Error('boom')) : of([{ id: 'agent-1', displayName: 'Amy Agent', username: 'amy' }]),
    );

    fixture.componentInstance.openAssignModal();
    await fixture.whenStable();

    expect(fixture.componentInstance.assigneeOptions()).toEqual([{ id: 'agent-1', displayName: 'Amy Agent', username: 'amy' }]);
  });

  it('assigns the ticket and closes the modal', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectedAssigneeId.set('agent-1');
    fixture.componentInstance.showAssignModal.set(true);
    fixture.componentInstance.submitAssign();
    await fixture.whenStable();

    expect(api.assign).toHaveBeenCalledWith('t1', 'agent-1');
    expect(fixture.componentInstance.showAssignModal()).toBe(false);
    expect(fixture.componentInstance.ticket()?.assigneeName).toBe('Amy Agent');
  });

  it('does not submit an assignment without a selected assignee', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.selectedAssigneeId.set('');
    fixture.componentInstance.submitAssign();

    expect(api.assign).not.toHaveBeenCalled();
  });

  it('starts, resolves, and closes the ticket, updating local state each time', async () => {
    const { fixture, api } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.start();
    await fixture.whenStable();
    expect(api.start).toHaveBeenCalledWith('t1');
    expect(fixture.componentInstance.ticket()?.status).toBe('InProgress');

    fixture.componentInstance.resolveTicket();
    await fixture.whenStable();
    expect(api.resolve).toHaveBeenCalledWith('t1');
    expect(fixture.componentInstance.ticket()?.status).toBe('Resolved');

    fixture.componentInstance.close();
    await fixture.whenStable();
    expect(api.close).toHaveBeenCalledWith('t1');
    expect(fixture.componentInstance.ticket()?.status).toBe('Closed');
  });
});
