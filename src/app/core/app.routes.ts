import { Routes } from '@angular/router';
import { LoginComponent } from '../features/auth/login.component';
import { LayoutComponent } from '../shared/layout.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'proyectos',
        loadComponent: () =>
          import('../features/proyectos/proyectos.component').then(m => m.ListProyectosComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('../features/usuarios').then(m => m.ListUsuariosComponent)
      },
      {
        path: 'catalogos',
        loadComponent: () =>
          import('../features/catalogos').then(m => m.ListCatalogosComponent)
      },
      {
        path: 'personas',
        loadComponent: () =>
          import('../features/personas').then(m => m.ListPersonasComponent)
      },
      {
        path: 'actividades',
        loadComponent: () =>
          import('../features/actividades').then(m => m.ListActividadesComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
