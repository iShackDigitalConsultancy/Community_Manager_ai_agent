import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-companies.html',
  styleUrl: './admin-companies.scss'
})
export class AdminCompanies implements OnInit {
  companies: any[] = [];
  isLoading = false;
  showAddModal = false;
  isEditing = false;
  editingCompanyId: string | null = null;
  
  searchQuery = '';
  searchTimeout: any;
  
  newCompany = { 
    name: '', 
    status: 'active',
    address: '',
    email: '',
    contact_number: '',
    main_contact_person: ''
  };

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.isLoading = true;
    this.cd.detectChanges();
    const searchParam = this.searchQuery ? `?search=${encodeURIComponent(this.searchQuery)}` : '';
    this.http.get<any[]>(`/api/v1/admin/companies${searchParam}`).subscribe({
      next: (data) => {
        this.companies = data;
        this.isLoading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load companies', err);
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
      this.loadCompanies();
    }, 400);
  }

  openAddModal() {
    this.newCompany = { 
      name: '', 
      status: 'active',
      address: '',
      email: '',
      contact_number: '',
      main_contact_person: ''
    };
    this.isEditing = false;
    this.editingCompanyId = null;
    this.showAddModal = true;
  }

  openEditModal(company: any) {
    this.newCompany = { ...company };
    this.isEditing = true;
    this.editingCompanyId = company.id;
    this.showAddModal = true;
  }

  closeModal() {
    this.showAddModal = false;
  }

  saveCompany() {
    if (!this.newCompany.name) return;
    
    if (this.isEditing && this.editingCompanyId) {
      this.http.put(`/api/v1/admin/companies/${this.editingCompanyId}`, this.newCompany).subscribe({
        next: (res) => {
          this.closeModal();
          this.loadCompanies();
        },
        error: (err) => {
          console.error('Failed to update company', err);
        }
      });
    } else {
      this.http.post('/api/v1/admin/companies', this.newCompany).subscribe({
        next: (res) => {
          this.closeModal();
          this.loadCompanies();
        },
        error: (err) => {
          console.error('Failed to create company', err);
        }
      });
    }
  }

  deleteCompany(id: string) {
    if (!confirm('Are you sure you want to delete this company?')) return;
    this.http.delete(`/api/v1/admin/companies/${id}`).subscribe({
      next: () => this.loadCompanies(),
      error: (err) => console.error('Failed to delete company', err)
    });
  }
}
