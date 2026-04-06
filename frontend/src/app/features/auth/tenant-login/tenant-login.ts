import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tenant-login',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './tenant-login.html',
  styleUrl: './tenant-login.scss'
})
export class TenantLogin {
  step: 1 | 2 = 1;
  contactInfo = '';
  otp = '';
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(private router: Router, private http: HttpClient) {}

  onRequestOtp(e: Event) {
    if (e) e.preventDefault();
    if (!this.contactInfo) return;
    this.loading = true;
    this.errorMessage = '';

    this.http.post<any>('/api/v1/admin/auth/tenant-request-otp', { contactInfo: this.contactInfo })
      .subscribe({
        next: (res) => {
          this.step = 2;
          this.loading = false;
          this.successMessage = res.message || 'OTP sent successfully. Check the terminal for the code.';
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Failed to request OTP. Please check your details.';
          this.loading = false;
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
          localStorage.setItem('accessToken', res.accessToken);
          localStorage.setItem('refreshToken', res.refreshToken);
          localStorage.setItem('user', JSON.stringify(res.user));
          this.router.navigate(['/chat']);
        },
        error: (err) => {
          this.errorMessage = err.error?.error || 'Invalid OTP';
          this.loading = false;
        }
      });
  }
}
