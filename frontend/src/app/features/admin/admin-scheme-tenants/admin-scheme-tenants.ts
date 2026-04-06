import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface SchemeUnit {
  id: string;
  scheme_id: string;
  unit_number: string;
  unit_type: string;
  tenant_name?: string;
  tenant_email?: string;
  tenant_phone?: string;
  is_active: boolean;
}

@Component({
  selector: 'app-admin-scheme-tenants',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-scheme-tenants.html',
  styleUrls: ['./admin-scheme-tenants.scss']
})
export class AdminSchemeTenants implements OnInit {
  schemeId: string = '';
  units: SchemeUnit[] = [];
  isLoading = false;
  isUploading = false;
  isSyncing = false;
  
  showAddModal = false;
  newUnit: Partial<SchemeUnit> = {};

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.schemeId = params.get('id') || '';
      if (this.schemeId) {
        this.loadUnits();
      }
    });
  }

  loadUnits() {
    this.isLoading = true;
    this.http.get<SchemeUnit[]>(`/api/v1/admin/schemes/${this.schemeId}/units`).subscribe({
      next: (res) => {
        this.units = res;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load units', err);
        this.isLoading = false;
      }
    });
  }

  triggerMdaSync() {
    this.isSyncing = true;
    // We hit the global MDA sync endpoint for now
    this.http.post<any>(`/api/v1/admin/mda/sync`, {}).subscribe({
      next: (res) => {
        alert(res.message);
        this.isSyncing = false;
        this.loadUnits();
      },
      error: (err) => {
        alert('Failed to sync. ' + (err.error?.error || ''));
        this.isSyncing = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        alert('Please upload a valid CSV file.');
        return;
      }

      this.isUploading = true;
      const formData = new FormData();
      formData.append('file', file);

      this.http.post<any>(`/api/v1/admin/schemes/${this.schemeId}/units/import`, formData).subscribe({
        next: (res) => {
          this.isUploading = false;
          // Reset file input
          event.target.value = null;
          this.loadUnits();
        },
        error: (err) => {
          console.error('Upload failed:', err.error?.error || err.message);
          this.isUploading = false;
          event.target.value = null;
        }
      });
    }
  }

  downloadCsvTemplate() {
    const csvContent = "Unit Number,Tenant Name,Tenant Email,Contact Number\n101,John Doe,john@example.com,0820000000\n102,Jane Smith,jane@example.com,0831112222";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'tenant_upload_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  openAddModal() {
    this.newUnit = { unit_type: 'residential' };
    this.showAddModal = true;
  }

  closeModal() {
    this.showAddModal = false;
  }

  saveUnit() {
    if (!this.newUnit.unit_number) return;
    this.http.post(`/api/v1/admin/schemes/${this.schemeId}/units`, this.newUnit).subscribe({
      next: () => {
        this.closeModal();
        this.loadUnits();
      },
      error: (err) => {
        alert('Failed to save: ' + err.error?.error);
      }
    });
  }

  deleteUnit(unitId: string) {
    if (confirm('Are you sure you want to delete this unit?')) {
      this.http.delete(`/api/v1/admin/schemes/${this.schemeId}/units/${unitId}`).subscribe({
        next: () => this.loadUnits(),
        error: (err) => alert('Failed to delete: ' + err.error?.error)
      });
    }
  }
}
