import { Routes } from '@angular/router';
import { LoginComponent } from '../features/auth/login.component';
import { LayoutComponent } from '../shared/layout.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
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
          import('../features/proyectos').then(m => m.ListProyectosComponent)
      },
      {
        path: 'proyectos/nuevo',
        loadComponent: () =>
          import('../features/proyectos').then(m => m.ProyectoFormComponent)
      },
      {
        path: 'proyectos/:id',
        loadComponent: () =>
          import('../features/proyectos').then(m => m.ProyectoDetailComponent)
      },
      {
        path: 'proyectos/:id/editar',
        loadComponent: () =>
          import('../features/proyectos').then(m => m.ProyectoFormComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('../features/usuarios').then(m => m.ListUsuariosComponent)
      },
      {
        path: 'usuarios/nuevo',
        loadComponent: () =>
          import('../features/usuarios').then(m => m.UsuarioFormComponent)
      },
      {
        path: 'usuarios/editar/:id',
        loadComponent: () =>
          import('../features/usuarios').then(m => m.UsuarioFormComponent)
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
        path: 'personas/:tipo/nuevo',
        loadComponent: () =>
          import('../features/personas').then(m => m.PersonaFormComponent)
      },
      {
        path: 'personas/:tipo/:id/editar',
        loadComponent: () =>
          import('../features/personas').then(m => m.PersonaFormComponent)
      },
      {
        path: 'actividades',
        loadComponent: () =>
          import('../features/actividades').then(m => m.ListActividadesComponent)
      },
      {
        path: 'actividades/nueva',
        loadComponent: () =>
          import('../features/actividades').then(m => m.ActividadFormComponent)
      },
      {
        path: 'actividades/:id',
        loadComponent: () =>
          import('../features/actividades').then(m => m.ActividadDetailComponent)
      },
      {
        path: 'actividades/:id/editar',
        loadComponent: () =>
          import('../features/actividades').then(m => m.ActividadFormComponent)
      },
      {
        path: 'actividades-mensuales/nueva',
        loadComponent: () =>
          import('../features/actividades-mensuales').then(m => m.ActividadMensualFormComponent)
      },
      {
        path: 'actividades-mensuales/:id/editar',
        loadComponent: () =>
          import('../features/actividades-mensuales').then(m => m.ActividadMensualFormComponent)
      },
      {
        path: 'actividades-anuales/nueva',
        loadComponent: () =>
          import('../features/actividades-anuales').then(m => m.ActividadAnualFormComponent)
      },
      {
        path: 'actividades-anuales/:id/editar',
        loadComponent: () =>
          import('../features/actividades-anuales').then(m => m.ActividadAnualFormComponent)
      },
      {
        path: 'subactividades',
        loadComponent: () =>
          import('../features/subactividades').then(m => m.SubactividadesListComponent)
      },
      {
        path: 'subactividades/nueva',
        loadComponent: () =>
          import('../features/subactividades').then(m => m.SubactividadFormComponent)
      },
      {
        path: 'subactividades/:id',
        loadComponent: () =>
          import('../features/subactividades').then(m => m.SubactividadDetailComponent)
      },
      {
        path: 'subactividades/:id/editar',
        loadComponent: () =>
          import('../features/subactividades').then(m => m.SubactividadFormComponent)
      },
      {
        path: 'participaciones',
        loadComponent: () =>
          import('../features/participaciones').then(m => m.ParticipacionesListComponent)
      },
      {
        path: 'participaciones/nueva',
        loadComponent: () =>
          import('../features/participaciones').then(m => m.ParticipacionFormComponent)
      },
      {
        path: 'participaciones/:id',
        loadComponent: () =>
          import('../features/participaciones').then(m => m.ParticipacionDetailComponent)
      },
      {
        path: 'participaciones/:id/editar',
        loadComponent: () =>
          import('../features/participaciones').then(m => m.ParticipacionFormComponent)
      },
      {
        path: 'participaciones/equipos/:edicionId',
        loadComponent: () =>
          import('../features/participaciones').then(m => m.EquiposComponent)
      },
      {
        path: 'participaciones/equipos/:edicionId/:grupoNumero',
        loadComponent: () =>
          import('../features/participaciones').then(m => m.EquipoDetailComponent)
      },
      {
        path: 'evidencias',
        loadComponent: () =>
          import('../features/evidencias').then(m => m.EvidenciasListComponent)
      },
      {
        path: 'evidencias/galeria',
        loadComponent: () =>
          import('../features/evidencias').then(m => m.EvidenciasGalleryComponent)
      },
      {
        path: 'evidencias/nueva',
        loadComponent: () =>
          import('../features/evidencias').then(m => m.EvidenciaFormComponent)
      },
      {
        path: 'evidencias/:id',
        loadComponent: () =>
          import('../features/evidencias').then(m => m.EvidenciaDetailComponent)
      },
      {
        path: 'evidencias/:id/editar',
        loadComponent: () =>
          import('../features/evidencias').then(m => m.EvidenciaFormComponent)
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('../features/reportes').then(m => m.ReportesListComponent)
      },
      {
        path: 'reportes/generar',
        loadComponent: () =>
          import('../features/reportes').then(m => m.ReporteGenerarComponent)
      },
    ]
  },
  { path: '**', redirectTo: '' }
];
