// src/app/features/notification-list/notification-list.component.ts
import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../shared/models/notification';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [TableModule, CardModule],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss']
})
export class NotificationListComponent implements OnInit {
  notifications: Notification[] = [];

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.notificationService.getAllNotifications().subscribe(data => this.notifications = data);
  }
}