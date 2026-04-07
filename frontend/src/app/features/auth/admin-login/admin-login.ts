import { Component, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss'
})
export class AdminLogin {
  credentials = { email: '', password: '' };
  isLoading = false;
  errorMessage = '';
  passwordVisible = false;

  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  togglePassword() {
    this.passwordVisible = !this.passwordVisible;
  }

  onLogin(e: Event) {
    e.preventDefault();
    if (!this.credentials.email || !this.credentials.password) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    this.http.post<any>('/api/v1/admin/auth/login', this.credentials).subscribe({
      next: (res) => {
        this.isLoading = false;
        localStorage.setItem('admin_token', res.accessToken);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Invalid credentials or inactive account';
        console.error('Login failed', err);
        this.cdr.detectChanges();
      }
    });
  }
}
