import { Routes } from '@angular/router';
import { LoginComponent } from '../features/auth/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'proyectos',
    loadComponent: () =>
      import('../features/proyectos/proyectos.component').then(m => m.ListProyectosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('../features/usuarios').then(m => m.ListUsuariosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'catalogos',
    loadComponent: () =>
      import('../features/catalogos').then(m => m.ListCatalogosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'personas',
    loadComponent: () =>
      import('../features/personas').then(m => m.ListPersonasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'actividades',
    loadComponent: () =>
      import('../features/actividades').then(m => m.ListActividadesComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
