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

  // Pagination state
  currentPage = 1;
  pageSize = 15;
  totalItems = 0;
  totalPages = 0;

  searchQuery = '';
  searchTimeout: any;

  showAddModal = false;
  isSuperAdmin = false;
  isEditing = false;
  editingSchemeId: string | null = null;

  showUploadModal = false;
  uploadFile: File | null = null;
  uploadCompanyId = '';
  isUploading = false;
  uploadResult: { successCount: number, errorCount: number } | null = null;

  newScheme = { name: '', code: '', type: 'sectional_title', companyId: '', address: '', facilitiesManager: '', managerEmail: '', unitsCount: null as number | null };

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
    const searchParam = this.searchQuery ? `&search=${encodeURIComponent(this.searchQuery)}` : '';
    this.http.get<any>(`/api/v1/admin/schemes?page=${this.currentPage}&limit=${this.pageSize}${searchParam}`).subscribe({
      next: (res) => {
        // Backend returns `{ data, totalItems, totalPages, currentPage }` based on schema updates
        this.schemes = res.data || [];
        this.totalItems = res.totalItems || 0;
        this.totalPages = res.totalPages || 0;
        this.currentPage = res.currentPage || 1;
        
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

  onSearchChange() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadSchemes();
    }, 400);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadSchemes();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadSchemes();
    }
  }

  openAddModal() {
    this.newScheme = { name: '', code: '', type: 'sectional_title', companyId: '', address: '', facilitiesManager: '', managerEmail: '', unitsCount: null };
    this.isEditing = false;
    this.editingSchemeId = null;
    this.showAddModal = true;
  }

  openEditModal(scheme: any) {
    this.newScheme = { 
      name: scheme.scheme_name, 
      code: scheme.scheme_code, 
      type: scheme.scheme_type, 
      companyId: scheme.company_id || '',
      address: scheme.address || '',
      facilitiesManager: scheme.facilities_manager || '',
      managerEmail: scheme.manager_email || '',
      unitsCount: scheme.mapped_units_count || null
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
      address: this.newScheme.address,
      facilitiesManager: this.newScheme.facilitiesManager,
      managerEmail: this.newScheme.managerEmail,
      unitsCount: this.newScheme.unitsCount,
      scheme_name: this.newScheme.name, // Used in PUT updates
      facilities_manager: this.newScheme.facilitiesManager,
      manager_email: this.newScheme.managerEmail,
      mapped_units_count: this.newScheme.unitsCount
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

  openUploadModal() {
    this.uploadFile = null;
    this.uploadCompanyId = '';
    this.uploadResult = null;
    this.showUploadModal = true;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.uploadResult = null;
    this.uploadFile = null;
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.uploadFile = event.target.files[0];
    }
  }

  uploadCsv() {
    if (!this.uploadFile) return;

    const formData = new FormData();
    formData.append('file', this.uploadFile);
    if (this.isSuperAdmin) {
      formData.append('companyId', this.uploadCompanyId);
    }

    this.isUploading = true;
    this.uploadResult = null;

    this.http.post<any>('/api/v1/admin/schemes/import', formData).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploadResult = { successCount: res.successCount, errorCount: res.errorCount };
        this.loadSchemes();
      },
      error: (err) => {
        this.isUploading = false;
        console.error('Failed to upload CSV', err);
        alert(err.error?.error || 'Upload failed');
      }
    });
  }
}
