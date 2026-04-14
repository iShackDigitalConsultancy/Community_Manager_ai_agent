import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header implements OnInit {
  unreadAlerts: number = 0;
  userName: string = 'Administrator';
  userInitials: string = 'A';
  userRole: string = 'Admin';

  ngOnInit() {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        this.userName = user.name || user.email || 'Administrator';
        this.userRole = user.role === 'manager' ? 'Company Manager' : 'System Admin';
        
        if (this.userName) {
            const parts = this.userName.split(' ');
            if (parts.length >= 2) {
                this.userInitials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else {
                this.userInitials = this.userName.substring(0, 2).toUpperCase();
            }
        }
      }
    } catch (e) {
      console.error('Failed to parse user from local storage in header', e);
    }
  }
}
