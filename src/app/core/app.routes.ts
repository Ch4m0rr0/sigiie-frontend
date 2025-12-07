import { Routes } from '@angular/router';
import { LoginComponent } from '../features/auth/login.component';
import { LayoutComponent } from '../shared/layout.component';
import { authGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';

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
        // Dashboard siempre accesible para usuarios autenticados (sin guard de permisos)
      },
      {
        path: 'proyectos',
        loadComponent: () =>
          import('../features/proyectos').then(m => m.ListProyectosComponent),
        canActivate: [permissionGuard('proyectos.ver')]
      },
      {
        path: 'proyectos/nuevo',
        loadComponent: () =>
          import('../features/proyectos').then(m => m.ProyectoFormComponent),
        canActivate: [permissionGuard('proyectos.crear')]
      },
      {
        path: 'proyectos/:id',
        loadComponent: () =>
          import('../features/proyectos').then(m => m.ProyectoDetailComponent)
      },
      {
        path: 'proyectos/:id/editar',
        loadComponent: () =>
          import('../features/proyectos').then(m => m.ProyectoFormComponent),
        canActivate: [permissionGuard('proyectos.editar')]
      },
      {
        path: 'proyectos-actividad/nuevo',
        loadComponent: () =>
          import('../features/proyectos-actividad').then(m => m.ProyectoActividadFormComponent)
      },
      {
        path: 'proyectos-administrativo/nuevo',
        loadComponent: () =>
          import('../features/proyectos-administrativo').then(m => m.ProyectoAdministrativoFormComponent)
      },
      {
        path: 'proyectos-docente/nuevo',
        loadComponent: () =>
          import('../features/proyectos-docente').then(m => m.ProyectoDocenteFormComponent)
      },
      {
        path: 'proyectos-estudiante/nuevo',
        loadComponent: () =>
          import('../features/proyectos-estudiante').then(m => m.ProyectoEstudianteFormComponent)
      },
      {
        path: 'documentos-divulgados/nuevo',
        loadComponent: () =>
          import('../features/documentos-divulgados').then(m => m.DocumentoDivulgadoFormComponent)
      },
      {
        path: 'documentos-divulgados/:id/editar',
        loadComponent: () =>
          import('../features/documentos-divulgados').then(m => m.DocumentoDivulgadoFormComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('../features/usuarios').then(m => m.ListUsuariosComponent),
        canActivate: [permissionGuard('usuarios.ver')]
      },
      {
        path: 'usuarios/nuevo',
        loadComponent: () =>
          import('../features/usuarios').then(m => m.UsuarioFormComponent),
        canActivate: [permissionGuard('usuarios.crear')]
      },
      {
        path: 'usuarios/editar/:id',
        loadComponent: () =>
          import('../features/usuarios').then(m => m.UsuarioFormComponent),
        canActivate: [permissionGuard('usuarios.editar')]
      },
      {
        path: 'catalogos',
        loadComponent: () =>
          import('../features/catalogos').then(m => m.ListCatalogosComponent),
        canActivate: [permissionGuard('catalogos.ver')]
      },
      {
        path: 'personas',
        loadComponent: () =>
          import('../features/personas').then(m => m.ListPersonasComponent),
        canActivate: [permissionGuard('personas.ver')]
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
          import('../features/actividades').then(m => m.ListActividadesComponent),
        canActivate: [permissionGuard('actividades.ver')]
      },
      {
        path: 'actividades/:id',
        loadComponent: () =>
          import('../features/actividades').then(m => m.ActividadDetailComponent)
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
        path: 'actividades-planificadas/nueva',
        loadComponent: () =>
          import('../features/actividades-planificadas').then(m => m.ActividadPlanificadaFormComponent)
      },
      {
        path: 'actividades-planificadas/:id/editar',
        loadComponent: () =>
          import('../features/actividades-planificadas').then(m => m.ActividadPlanificadaFormComponent)
      },
      {
        path: 'actividades-no-planificadas/nueva',
        loadComponent: () =>
          import('../features/actividades-no-planificadas').then(m => m.ActividadNoPlanificadaFormComponent)
      },
      {
        path: 'actividades-no-planificadas/:id/editar',
        loadComponent: () =>
          import('../features/actividades-no-planificadas').then(m => m.ActividadNoPlanificadaFormComponent)
      },
      {
        path: 'subactividades',
        loadComponent: () =>
          import('../features/subactividades').then(m => m.SubactividadesListComponent),
        canActivate: [permissionGuard('subactividades.ver')]
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
          import('../features/participaciones').then(m => m.ParticipacionesListComponent),
        canActivate: [permissionGuard('participaciones.ver')]
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
          import('../features/evidencias').then(m => m.EvidenciasListComponent),
        canActivate: [permissionGuard('evidencias.ver')]
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
          import('../features/reportes').then(m => m.ReportesListComponent),
        canActivate: [permissionGuard('reportes.ver')]
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
