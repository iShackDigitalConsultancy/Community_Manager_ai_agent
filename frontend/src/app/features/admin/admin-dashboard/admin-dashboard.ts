import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard implements OnInit {
  isSyncing = false;
  syncResult: any = null;
  stats: any = { totalCommunities: 0, totalTenants: 0, activeKnowledgeBases: 0, aiAnalytics: null, companiesList: [] };
  isLoadingStats = true;
  expandedCompanyId: string | null = null;

  constructor(private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get<any>('/api/v1/admin/dashboard/stats').subscribe({
      next: (data) => {
        console.log('Received Stats:', data);
        this.stats = data;
        this.isLoadingStats = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load stats', err);
        this.isLoadingStats = false;
        this.cd.detectChanges();
      }
    });
  }

  triggerSync() {
    this.isSyncing = true;
    this.syncResult = null;
    
    this.http.post<any>('/api/v1/admin/dashboard/sync', {}).subscribe({
      next: (res) => {
        this.isSyncing = false;
        this.syncResult = res;
        this.cd.detectChanges();
        this.ngOnInit(); // Refresh stats and logs
      },
      error: (err) => {
        console.error('Sync failed', err);
        this.isSyncing = false;
        this.syncResult = { 
          success: false, 
          message: 'Global sync failed to execute properly.',
          syncedBuildings: 0,
          syncedTenants: 0
        };
        this.cd.detectChanges();
      }
    });
  }

  toggleCompany(companyId: string) {
    if (this.expandedCompanyId === companyId) {
      this.expandedCompanyId = null; // collapse if same
    } else {
      this.expandedCompanyId = companyId; // expand new
    }
    this.cd.detectChanges();
  }
}
