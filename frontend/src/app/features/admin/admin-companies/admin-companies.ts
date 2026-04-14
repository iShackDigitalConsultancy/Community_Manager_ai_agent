import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Integration {
  id: string;
  company_id: string;
  provider: string;
  brand_id: string;
  client_id: string;
  client_secret: string;
  community_id: number | null;
  db_identifier: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  sync_status: string;
  sync_error: string | null;
}

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-companies.html',
  styleUrl: './admin-companies.scss'
})
export class AdminCompanies implements OnInit {
  private readonly COMP_API = '/api/v1/admin/companies';
  private readonly HUB_API = '/api/v1/admin/api-hub';

  companies: any[] = [];
  integrations: Integration[] = [];
  
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

  integrationForm: Partial<Integration & { clientSecretNew: string, enabled: boolean }> = { enabled: false, is_active: true };

  // API Hub State
  drawerLoading = false;
  drawerError: string | null = null;
  testResult: { success: boolean; message: string } | null = null;

  expandedId: string | null = null;
  syncSummary: Record<string, any> = {};
  syncSummaryLoading: Record<string, boolean> = {};
  syncingId: string | null = null;
  testingId: string | null = null;

  activeTab: 'properties' | 'tenants' | 'owners' = 'tenants';
  proxyData: any[] = [];
  proxyLoading = false;
  proxyTotal = 0;
  proxyPage = 1;
  proxySearch = '';

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` });
  }

  loadData() {
    this.isLoading = true;
    this.cd.detectChanges();
    
    // Load both integrations and companies concurrently
    this.http.get<Integration[]>(this.HUB_API, { headers: this.headers }).subscribe({
      next: (ints) => {
        this.integrations = ints;
        this.loadCompanies();
      },
      error: () => this.loadCompanies()
    });
  }

  loadCompanies() {
    const searchParam = this.searchQuery ? `?search=${encodeURIComponent(this.searchQuery)}` : '';
    this.http.get<any[]>(`${this.COMP_API}${searchParam}`).subscribe({
      next: (data) => {
        this.companies = data.map(c => ({
          ...c,
          integration: this.integrations.find(i => i.company_id === c.id) || null
        }));
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
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => this.loadData(), 400);
  }

  openAddModal() {
    this.newCompany = { name: '', status: 'active', address: '', email: '', contact_number: '', main_contact_person: '' };
    this.integrationForm = { enabled: false, is_active: true };
    this.isEditing = false;
    this.editingCompanyId = null;
    this.drawerError = null;
    this.testResult = null;
    this.showAddModal = true;
  }

  openEditModal(company: any) {
    this.newCompany = { ...company };
    if (company.integration) {
        this.integrationForm = { ...company.integration, enabled: true, clientSecretNew: '' };
    } else {
        this.integrationForm = { enabled: false, is_active: true };
    }
    this.isEditing = true;
    this.editingCompanyId = company.id;
    this.drawerError = null;
    this.testResult = null;
    this.showAddModal = true;
  }

  closeModal() {
    this.showAddModal = false;
  }

  saveCompany() {
    if (!this.newCompany.name) return;
    this.drawerLoading = true;
    this.drawerError = null;
    
    const req = (this.isEditing && this.editingCompanyId)
      ? this.http.put(`${this.COMP_API}/${this.editingCompanyId}`, this.newCompany)
      : this.http.post(this.COMP_API, this.newCompany);

    req.subscribe({
      next: (compRes: any) => {
        const compId = this.isEditing ? this.editingCompanyId : compRes.id;
        
        // Handle API Integration linking
        if (this.integrationForm.enabled) {
            const apiPayload = {
              companyId: compId,
              brandId: this.integrationForm.brand_id,
              clientId: this.integrationForm.client_id,
              communityId: this.integrationForm.community_id || null,
              dbIdentifier: this.integrationForm.db_identifier || null,
              isActive: this.integrationForm.is_active,
              clientSecret: this.integrationForm.clientSecretNew || undefined
            };

            const existingInt = this.integrations.find(i => i.company_id === compId);

            const intReq = existingInt 
                ? this.http.patch(`${this.HUB_API}/${existingInt.id}`, apiPayload, { headers: this.headers })
                : this.http.post(this.HUB_API, apiPayload, { headers: this.headers });

            intReq.subscribe({
                next: () => {
                    this.drawerLoading = false;
                    this.closeModal();
                    this.loadData();
                },
                error: (err) => {
                    this.drawerLoading = false;
                    this.drawerError = 'Company saved, but integration failed: ' + (err.error?.error || err.message || 'Unknown error');
                    this.cd.detectChanges();
                }
            });
        } else {
            // Check if we need to delete an existing integration
            const existingInt = this.integrations.find(i => i.company_id === compId);
            if (existingInt && this.isEditing) {
                this.http.delete(`${this.HUB_API}/${existingInt.id}`, { headers: this.headers }).subscribe({
                    next: () => {
                        this.drawerLoading = false;
                        this.closeModal();
                        this.loadData();
                    },
                    error: () => {
                        this.drawerLoading = false;
                        this.closeModal();
                        this.loadData();
                    }
                });
            } else {
                this.drawerLoading = false;
                this.closeModal();
                this.loadData();
            }
        }
      },
      error: (err) => {
        this.drawerLoading = false;
        this.drawerError = err.error?.error || err.message || 'Failed to save company';
        this.cd.detectChanges();
      }
    });
  }

  deleteCompany(id: string) {
    if (!confirm('Are you sure you want to delete this company?')) return;
    this.http.delete(`${this.COMP_API}/${id}`).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to delete company', err)
    });
  }

  testConnectionModal() {
      if (!this.integrationForm.id) return;
      this.drawerLoading = true;
      this.testResult = null;
      this.http.post<any>(`${this.HUB_API}/${this.integrationForm.id}/test`, {}, { headers: this.headers }).subscribe({
        next: data => {
          this.drawerLoading = false;
          this.testResult = { success: true, message: `Connected as ${data.user?.name || 'user'} ✅` };
        },
        error: err => {
          this.drawerLoading = false;
          this.testResult = { success: false, message: err.error?.error || 'Connection failed ❌' };
        }
      });
  }

  // --- API HUB Expanded Logic ---
  toggleExpand(id: string) {
    if (this.expandedId === id) { this.expandedId = null; return; }
    this.expandedId = id;
    
    const company = this.companies.find(c => c.id === id);
    if (company && company.integration) {
        this.loadSyncSummary(company.integration.id);
        this.loadProxyData(company.integration.id, 'tenants');
    }
  }

  loadSyncSummary(integrationId: string) {
    this.syncSummaryLoading[integrationId] = true;
    this.http.get<any>(`${this.HUB_API}/${integrationId}/summary`, { headers: this.headers }).subscribe({
      next: data => { this.syncSummary[integrationId] = data; this.syncSummaryLoading[integrationId] = false; },
      error: () => { this.syncSummaryLoading[integrationId] = false; }
    });
  }

  triggerSync(integrationId: string, event: Event) {
    event.stopPropagation();
    this.syncingId = integrationId;
    this.http.post<any>(`${this.HUB_API}/${integrationId}/sync`, {}, { headers: this.headers }).subscribe({
      next: () => { this.syncingId = null; this.loadSyncSummary(integrationId); this.loadData(); },
      error: err => { this.syncingId = null; alert(err.error?.error || 'Sync failed'); }
    });
  }

  testConnectionCard(integrationId: string, event: Event) {
    event.stopPropagation();
    this.testingId = integrationId;
    this.http.post<any>(`${this.HUB_API}/${integrationId}/test`, {}, { headers: this.headers }).subscribe({
      next: () => { this.testingId = null; this.loadData(); },
      error: () => { this.testingId = null; this.loadData(); }
    });
  }

  selectTab(tab: 'properties' | 'tenants' | 'owners') {
    this.activeTab = tab;
    if (this.expandedId) {
        const company = this.companies.find(c => c.id === this.expandedId);
        if (company?.integration) this.loadProxyData(company.integration.id, tab);
    }
  }

  loadProxyData(integrationId: string, tab: string) {
    this.proxyLoading = true;
    this.proxyData = [];
    const url = `${this.HUB_API}/${integrationId}/${tab}?page=${this.proxyPage}&pageSize=10&search=${encodeURIComponent(this.proxySearch)}`;
    this.http.get<any>(url, { headers: this.headers }).subscribe({
      next: data => {
        this.proxyData = data.data || [];
        this.proxyTotal = data.total || 0;
        this.proxyLoading = false;
      },
      error: () => { this.proxyLoading = false; }
    });
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      never: 'Never synced', connected: 'Connected', success: 'Synced',
      running: 'Syncing…', error: 'Error'
    };
    return map[s] || s;
  }

  statusClass(s: string): string {
    const map: Record<string, string> = {
      never: 'badge-default', connected: 'badge-primary', success: 'badge-success',
      running: 'badge-warning', error: 'badge-danger'
    };
    return map[s] || 'badge-default';
  }

  formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
  }

  get tableKeys(): string[] {
    if (!this.proxyData.length) return [];
    return Object.keys(this.proxyData[0]).slice(0, 7);
  }
}
