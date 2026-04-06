import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-schemes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-schemes.html',
  styleUrl: './admin-schemes.scss'
})
export class AdminSchemes implements OnInit {
  schemes: any[] = [];
  companies: any[] = []; // for super admin dropdown
  isLoading = false;
  showAddModal = false;
  isSuperAdmin = false;
  isEditing = false;
  editingSchemeId: string | null = null;

  newScheme = { name: '', code: '', type: 'sectional_title', companyId: '' };

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.checkUserRole();
    this.loadSchemes();
  }

  checkUserRole() {
    // Basic check for super admin. In reality, would use AuthService
    try {
      const token = localStorage.getItem('admin_token') || '';
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.isSuperAdmin = payload.role === 'super_admin';
        if (this.isSuperAdmin) {
          this.loadCompanies();
        }
      }
    } catch (e) {}
  }

  loadCompanies() {
    this.http.get<any[]>('/api/v1/admin/companies').subscribe({
      next: (data) => {
         this.companies = data;
         this.cd.detectChanges();
      },
      error: (err) => console.error('Failed to load companies', err)
    });
  }

  loadSchemes() {
    this.isLoading = true;
    this.cd.detectChanges();
    this.http.get<any[]>('/api/v1/admin/schemes').subscribe({
      next: (data) => {
        this.schemes = data;
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load schemes', err);
        this.isLoading = false;
        this.cd.detectChanges();
      }
    });
  }

  openAddModal() {
    this.newScheme = { name: '', code: '', type: 'sectional_title', companyId: '' };
    this.isEditing = false;
    this.editingSchemeId = null;
    this.showAddModal = true;
  }

  openEditModal(scheme: any) {
    this.newScheme = { 
      name: scheme.scheme_name, 
      code: scheme.scheme_code, 
      type: scheme.scheme_type, 
      companyId: scheme.company_id || '' 
    };
    this.isEditing = true;
    this.editingSchemeId = scheme.id;
    this.showAddModal = true;
  }

  closeModal() {
    this.showAddModal = false;
  }

  saveScheme() {
    if (!this.newScheme.name || !this.newScheme.code) return;
    
    // Formatting payload for backend
    const payload = {
      name: this.newScheme.name,
      code: this.newScheme.code,
      type: this.newScheme.type,
      companyId: this.newScheme.companyId,
      scheme_name: this.newScheme.name // Used in PUT updates
    };

    if (this.isEditing && this.editingSchemeId) {
      this.http.put(`/api/v1/admin/schemes/${this.editingSchemeId}`, payload).subscribe({
        next: (res) => {
          this.closeModal();
          this.loadSchemes();
        },
        error: (err) => console.error('Failed to update scheme', err)
      });
    } else {
      this.http.post('/api/v1/admin/schemes', payload).subscribe({
        next: (res) => {
          this.closeModal();
          this.loadSchemes();
        },
        error: (err) => console.error('Failed to create scheme', err)
      });
    }
  }

  deleteScheme(id: string) {
    if (!confirm('Are you sure you want to delete this community?')) return;
    this.http.delete(`/api/v1/admin/schemes/${id}`).subscribe({
      next: () => this.loadSchemes(),
      error: (err) => console.error('Failed to delete scheme', err)
    });
  }
}
