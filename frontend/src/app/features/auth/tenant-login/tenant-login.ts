import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-tenant-login',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './tenant-login.html',
  styleUrl: './tenant-login.scss'
})
export class TenantLogin {
  step: 1 | 2 | 3 = 1;
  contactInfo = '';
  otp = '';
  errorMessage = '';
  successMessage = '';
  loading = false;
  
  availableUnits: any[] = [];
  intermediateToken = '';

  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  onRequestOtp(e: Event) {
    if (e) e.preventDefault();
    if (!this.contactInfo) return;
    this.loading = true;
    this.errorMessage = '';

    this.http.post<any>('/api/v1/admin/auth/tenant-request-otp', { contactInfo: this.contactInfo })
      .subscribe({
        next: (res) => {
          console.log('[DEBUG] HttpClient next() fired!', res);
          this.step = 2;
          this.loading = false;
          this.successMessage = res.message || 'OTP sent successfully.';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('[DEBUG] HttpClient error() fired!', err);
          this.errorMessage = err.error?.error || 'Failed to request OTP. Please check your details.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onVerifyOtp(e: Event) {
    if (e) e.preventDefault();
    if (!this.otp) return;
    this.loading = true;
    this.errorMessage = '';

    this.http.post<any>('/api/v1/admin/auth/tenant-verify-otp', { contactInfo: this.contactInfo, otp: this.otp })
      .subscribe({
        next: (res) => {
          if (res.multipleUnits) {
            this.step = 3;
            this.availableUnits = res.units;
            this.intermediateToken = res.intermediateToken;
            this.successMessage = '';
            this.loading = false;
            this.cdr.detectChanges();
          } else {
            localStorage.setItem('accessToken', res.accessToken);
            localStorage.setItem('refreshToken', res.refreshToken);
            localStorage.setItem('user', JSON.stringify(res.user));
            this.router.navigate(['/chat']);
          }
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Invalid OTP';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onSelectUnit(unitId: string) {
    this.loading = true;
    this.errorMessage = '';

    this.http.post<any>('/api/v1/admin/auth/tenant-select-unit', { intermediateToken: this.intermediateToken, unitId })
      .subscribe({
        next: (res) => {
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.router.navigate(['/chat']);
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Failed to select unit. Please restart login.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }
}
