import { Routes } from '@angular/router';
import { MainLayout } from './core/layout/main-layout/main-layout';
import { Dashboard } from './features/dashboard/dashboard';
import { LandingPage } from './features/public/landing-page/landing-page';
import { TenantLogin } from './features/auth/tenant-login/tenant-login';
import { AdminLogin } from './features/auth/admin-login/admin-login';
import { AdminLayout } from './core/layout/admin-layout/admin-layout';
import { AdminDashboard } from './features/admin/admin-dashboard/admin-dashboard';
import { AdminKnowledgeBase } from './features/admin/admin-knowledge-base/admin-knowledge-base';
import { AdminCompanies } from './features/admin/admin-companies/admin-companies';
import { AdminSchemes } from './features/admin/admin-schemes/admin-schemes';
import { AdminSchemeTenants } from './features/admin/admin-scheme-tenants/admin-scheme-tenants';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'login', component: TenantLogin },
  {
    path: 'chat',
    component: MainLayout,
    children: [
      { path: '', component: Dashboard }
    ]
  },
  { path: 'admin/login', component: AdminLogin },
  {
    path: 'admin',
    component: AdminLayout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboard },
      { path: 'knowledge-base', component: AdminKnowledgeBase },
      { path: 'companies', component: AdminCompanies },
      { path: 'communities', component: AdminSchemes },
      { path: 'communities/:id/tenants', component: AdminSchemeTenants }
    ]
  },
  { path: '**', redirectTo: '' }
];
