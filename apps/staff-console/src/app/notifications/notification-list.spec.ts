import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NotificationList } from './notification-list.js';
import { NotificationsApiService, Notification } from './notifications-api.service.js';

describe('NotificationList', () => {
  function setup(notifications: Notification[] = []) {
    const notificationsApi = {
      getAll: jest.fn().mockReturnValue(
        of({ data: notifications, meta: { total: notifications.length } }),
      ),
      markAsRead: jest.fn().mockReturnValue(of(undefined)),
      markAllAsRead: jest.fn().mockReturnValue(of(undefined)),
    } as unknown as NotificationsApiService;

    TestBed.configureTestingModule({
      imports: [NotificationList],
      providers: [{ provide: NotificationsApiService, useValue: notificationsApi }],
    });

    const fixture = TestBed.createComponent(NotificationList);
    return { fixture, notificationsApi };
  }

  it('loads notifications on init', async () => {
    const { fixture, notificationsApi } = setup();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(notificationsApi.getAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('marks a single notification read and updates state locally', async () => {
    const unread: Notification = {
      id: 'n1',
      title: 'New admission',
      message: 'Patient admitted to Ward A',
      type: 'info',
      isRead: false,
      createdAt: '2025-01-01T10:00:00.000Z',
    };
    const { fixture, notificationsApi } = setup([unread]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.markRead(unread);
    await fixture.whenStable();

    expect(notificationsApi.markAsRead).toHaveBeenCalledWith('n1');
    expect(fixture.componentInstance.notifications()[0].isRead).toBe(true);
  });

  it('marks all notifications read', async () => {
    const { fixture, notificationsApi } = setup([
      { id: 'n1', title: 'a', message: 'm', type: 'info', isRead: false, createdAt: '' },
      { id: 'n2', title: 'b', message: 'm', type: 'warning', isRead: false, createdAt: '' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.markAllRead();
    await fixture.whenStable();

    expect(notificationsApi.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.notifications().every((n) => n.isRead)).toBe(true);
  });
});
