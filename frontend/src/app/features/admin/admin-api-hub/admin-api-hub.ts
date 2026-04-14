import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Integration {
  id: string;
  company_id: string;
  company_name: string;
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
  selector: 'app-admin-api-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-api-hub.html',
  styleUrl: './admin-api-hub.scss'
})
export class AdminApiHub implements OnInit {
  private readonly API = 'http://localhost:3000/api/v1/admin/api-hub';

  integrations: Integration[] = [];
  companies: any[] = [];
  loading = true;
  error: string | null = null;

  // Drawer state
  showDrawer = false;
  isEditing = false;
  drawerLoading = false;
  drawerError: string | null = null;
  testResult: { success: boolean; message: string } | null = null;

  form: Partial<Integration & { clientSecretNew: string }> = {};

  // Per-card expanded state
  expandedId: string | null = null;
  syncSummary: Record<string, any> = {};
  syncSummaryLoading: Record<string, boolean> = {};
  syncingId: string | null = null;
  testingId: string | null = null;

  // Data view
  activeTab: 'properties' | 'tenants' | 'owners' = 'tenants';
  proxyData: any[] = [];
  proxyLoading = false;
  proxyTotal = 0;
  proxyPage = 1;
  proxySearch = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadIntegrations();
    this.loadCompanies();
  }

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('adminToken') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadIntegrations() {
    this.loading = true;
    this.http.get<Integration[]>(this.API, { headers: this.headers }).subscribe({
      next: data => { this.integrations = data; this.loading = false; },
      error: err => { this.error = err.error?.error || 'Failed to load integrations'; this.loading = false; }
    });
  }

  loadCompanies() {
    this.http.get<any[]>('http://localhost:3000/api/v1/admin/companies', { headers: this.headers }).subscribe({
      next: data => { this.companies = data; },
      error: err => console.error('Failed to load companies', err)
    });
  }

  // ── Drawer ──────────────────────────────────────────────────────────────────

  openCreate() {
    this.isEditing = false;
    this.form = { is_active: true };
    this.drawerError = null;
    this.testResult = null;
    this.showDrawer = true;
  }

  openEdit(integration: Integration) {
    this.isEditing = true;
    this.form = { ...integration, clientSecretNew: '' };
    this.drawerError = null;
    this.testResult = null;
    this.showDrawer = true;
  }

  closeDrawer() { this.showDrawer = false; }

  saveIntegration() {
    this.drawerLoading = true;
    this.drawerError = null;

    const payload: any = {
      companyId: this.form.company_id,
      brandId: this.form.brand_id,
      clientId: this.form.client_id,
      communityId: this.form.community_id || null,
      dbIdentifier: this.form.db_identifier || null,
      isActive: this.form.is_active,
    };

    if (!this.isEditing) {
      payload.clientSecret = (this.form as any).clientSecretNew;
    } else if ((this.form as any).clientSecretNew) {
      payload.clientSecret = (this.form as any).clientSecretNew;
    }

    const req = this.isEditing
      ? this.http.patch(`${this.API}/${this.form.id}`, payload, { headers: this.headers })
      : this.http.post(this.API, payload, { headers: this.headers });

    req.subscribe({
      next: () => { this.drawerLoading = false; this.closeDrawer(); this.loadIntegrations(); },
      error: err => { this.drawerLoading = false; this.drawerError = err.error?.error || 'Save failed'; }
    });
  }

  testConnection() {
    if (!this.form.id) return;
    this.drawerLoading = true;
    this.testResult = null;
    this.http.post<any>(`${this.API}/${this.form.id}/test`, {}, { headers: this.headers }).subscribe({
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

  deleteIntegration(id: string) {
    if (!confirm('Delete this integration? This cannot be undone.')) return;
    this.http.delete(`${this.API}/${id}`, { headers: this.headers }).subscribe({
      next: () => this.loadIntegrations(),
      error: err => alert(err.error?.error || 'Delete failed')
    });
  }

  // ── Expansion Panel ─────────────────────────────────────────────────────────

  toggleExpand(id: string) {
    if (this.expandedId === id) { this.expandedId = null; return; }
    this.expandedId = id;
    this.loadSyncSummary(id);
    this.loadProxyData(id, 'tenants');
  }

  loadSyncSummary(id: string) {
    this.syncSummaryLoading[id] = true;
    this.http.get<any>(`${this.API}/${id}/summary`, { headers: this.headers }).subscribe({
      next: data => { this.syncSummary[id] = data; this.syncSummaryLoading[id] = false; },
      error: () => { this.syncSummaryLoading[id] = false; }
    });
  }

  triggerSync(id: string) {
    this.syncingId = id;
    this.http.post<any>(`${this.API}/${id}/sync`, {}, { headers: this.headers }).subscribe({
      next: () => { this.syncingId = null; this.loadSyncSummary(id); this.loadIntegrations(); },
      error: err => { this.syncingId = null; alert(err.error?.error || 'Sync failed'); }
    });
  }

  testConnectionCard(id: string) {
    this.testingId = id;
    this.http.post<any>(`${this.API}/${id}/test`, {}, { headers: this.headers }).subscribe({
      next: () => { this.testingId = null; this.loadIntegrations(); },
      error: () => { this.testingId = null; this.loadIntegrations(); }
    });
  }

  // ── Data Tabs ───────────────────────────────────────────────────────────────

  selectTab(tab: 'properties' | 'tenants' | 'owners') {
    this.activeTab = tab;
    if (this.expandedId) this.loadProxyData(this.expandedId, tab);
  }

  loadProxyData(integrationId: string, tab: string) {
    this.proxyLoading = true;
    this.proxyData = [];
    const url = `${this.API}/${integrationId}/${tab}?page=${this.proxyPage}&pageSize=10&search=${encodeURIComponent(this.proxySearch)}`;
    this.http.get<any>(url, { headers: this.headers }).subscribe({
      next: data => {
        this.proxyData = data.data || [];
        this.proxyTotal = data.total || 0;
        this.proxyLoading = false;
      },
      error: () => { this.proxyLoading = false; }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

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
