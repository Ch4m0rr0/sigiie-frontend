import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { SidebarComponent } from './sidebar/sidebar.component';
import { IconComponent } from './icon/icon.component';
import { NotificacionesComponent } from './notificaciones/notificaciones.component';
import { ToastComponent } from './toast/toast.component';
import { NotificacionesAutomaticasService } from '../core/services/notificaciones-automaticas.service';
import { PermisosService } from '../core/services/permisos.service';

@Component({
  standalone: true,
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, SidebarComponent, IconComponent, NotificacionesComponent, ToastComponent],
  template: `
    <div class="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      <app-sidebar class="flex-shrink-0"></app-sidebar>

      <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        <header class="bg-white border-b border-slate-200 h-16 flex-shrink-0 z-20 shadow-sm relative">
          <div class="h-full px-6 flex items-center justify-between gap-4">
            
            <div class="flex items-center gap-3">
              <div class="hidden md:flex items-center text-sm font-medium text-slate-500">
                <span 
                  (click)="navigateToDashboard()"
                  class="hover:text-slate-800 cursor-pointer transition-colors">Sistema</span>
                @if (breadcrumbs().length > 0) {
                  @for (breadcrumb of breadcrumbs(); track breadcrumb.path; let last = $last) {
                    <app-icon icon="chevron_right" size="xs" class="mx-2 text-slate-300"></app-icon>
                    @if (last) {
                      <span class="text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{{ breadcrumb.label }}</span>
                    } @else {
                      <span 
                        (click)="navigateToPath(breadcrumb.path)"
                        class="hover:text-slate-800 cursor-pointer transition-colors">{{ breadcrumb.label }}</span>
                    }
                  }
                } @else {
                  <app-icon icon="chevron_right" size="xs" class="mx-2 text-slate-300"></app-icon>
                  <span class="text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">Panel General</span>
                }
              </div>
            </div>

            <div class="flex items-center gap-3 md:gap-6">
              <div class="flex items-center gap-2">
                
                <button class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative" title="Ayuda">
                    <app-icon icon="help" size="sm"></app-icon>
                </button>

                <app-notificaciones></app-notificaciones>

              </div>
            </div>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50/50 scroll-smooth custom-scrollbar">
          <div class="h-full w-full">
            <router-outlet></router-outlet>
          </div>
        </main>

      </div>
      
      <!-- Componente de Toast para notificaciones emergentes -->
      <app-toast></app-toast>
    </div>
  `,
})
export class LayoutComponent implements OnInit, OnDestroy {
  private notificacionesAutomaticas = inject(NotificacionesAutomaticasService);
  private permisosService = inject(PermisosService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  breadcrumbs = signal<Array<{ label: string; path: string }>>([]);

  // Mapeo de rutas a nombres amigables
  private routeLabels: { [key: string]: string } = {
    'dashboard': 'Panel General',
    'proyectos': 'Proyectos',
    'proyectos/nuevo': 'Nuevo Proyecto',
    'proyectos/:id': 'Detalle de Proyecto',
    'proyectos/:id/editar': 'Editar Proyecto',
    'proyectos-actividad/nuevo': 'Nuevo Proyecto de Actividad',
    'proyectos-administrativo/nuevo': 'Nuevo Proyecto Administrativo',
    'proyectos-docente/nuevo': 'Nuevo Proyecto Docente',
    'proyectos-estudiante/nuevo': 'Nuevo Proyecto Estudiante',
    'documentos-divulgados/nuevo': 'Nuevo Documento Divulgado',
    'documentos-divulgados/:id/editar': 'Editar Documento Divulgado',
    'usuarios': 'Usuarios',
    'usuarios/nuevo': 'Nuevo Usuario',
    'usuarios/editar/:id': 'Editar Usuario',
    'catalogos': 'Catálogos',
    'personas': 'Personas',
    'personas/:tipo/nuevo': 'Nueva Persona',
    'personas/:tipo/:id/editar': 'Editar Persona',
    'actividades': 'Actividades',
    'actividades/:id': 'Detalle de Actividad',
    'actividades-mensuales/nueva': 'Nueva Actividad Mensual',
    'actividades-mensuales/:id/editar': 'Editar Actividad Mensual',
    'actividades-anuales/nueva': 'Nueva Actividad Anual',
    'actividades-anuales/:id/editar': 'Editar Actividad Anual',
    'actividades-planificadas/nueva': 'Nueva Actividad Planificada',
    'actividades-planificadas/:id/editar': 'Editar Actividad Planificada',
    'actividades-no-planificadas/nueva': 'Nueva Actividad No Planificada',
    'actividades-no-planificadas/:id/editar': 'Editar Actividad No Planificada',
    'subactividades': 'Subactividades',
    'subactividades/nueva': 'Nueva Subactividad',
    'subactividades/:id': 'Detalle de Subactividad',
    'subactividades/:id/editar': 'Editar Subactividad',
    'participaciones': 'Participaciones',
    'participaciones/nueva': 'Nueva Participación',
    'participaciones/:id': 'Detalle de Participación',
    'participaciones/:id/editar': 'Editar Participación',
    'participaciones/equipos/:edicionId': 'Equipos',
    'participaciones/equipos/:edicionId/:grupoNumero': 'Detalle de Equipo',
    'evidencias': 'Evidencias',
    'evidencias/galeria': 'Galería de Evidencias',
    'evidencias/nueva': 'Nueva Evidencia',
    'evidencias/:id': 'Detalle de Evidencia',
    'evidencias/:id/editar': 'Editar Evidencia',
    'reportes': 'Reportes',
    'reportes/generar': 'Generar Reporte'
  };

  ngOnInit(): void {
    // Iniciar el servicio de notificaciones automáticas
    this.notificacionesAutomaticas.iniciar();
    // El PermisosService se inicializa automáticamente en su constructor
    // pero forzamos la carga inicial de permisos
    this.permisosService.loadPermisosUsuarioActual();

    // Suscribirse a los cambios de ruta
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        })
      )
      .subscribe(route => {
        this.updateBreadcrumbs(route);
      });

    // Actualizar breadcrumbs iniciales
    this.updateBreadcrumbs(this.activatedRoute);
  }

  ngOnDestroy(): void {
    // Detener el servicio cuando se destruye el componente
    this.notificacionesAutomaticas.detener();
  }

  private updateBreadcrumbs(route: ActivatedRoute): void {
    const breadcrumbs: Array<{ label: string; path: string }> = [];
    const url = this.router.url;
    
    // Si estamos en la raíz o login, mostrar dashboard
    if (url === '/' || url === '/login' || url === '') {
      breadcrumbs.push({
        label: 'Panel General',
        path: '/dashboard'
      });
      this.breadcrumbs.set(breadcrumbs);
      return;
    }

    // Dividir la URL en segmentos
    const segments = url.split('/').filter(segment => segment !== '');
    
    // Construir breadcrumbs incrementalmente
    let currentPath = '';
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += '/' + segment;
      
      // Determinar el label para este segmento
      let label = this.getRouteLabelForPath(currentPath, segment, i, segments);
      
      breadcrumbs.push({
        label: label,
        path: currentPath
      });
    }

    // Si no hay breadcrumbs, usar el dashboard por defecto
    if (breadcrumbs.length === 0) {
      breadcrumbs.push({
        label: 'Panel General',
        path: '/dashboard'
      });
    }

    this.breadcrumbs.set(breadcrumbs);
  }

  private getRouteLabelForPath(fullPath: string, segment: string, index: number, allSegments: string[]): string {
    // Remover el slash inicial para comparar
    const pathKey = fullPath.substring(1);
    
    // Primero intentar con la ruta completa exacta
    if (this.routeLabels[pathKey]) {
      return this.routeLabels[pathKey];
    }

    // Intentar con patrones que incluyan parámetros (reemplazar números con :id)
    const pathWithParams = pathKey.replace(/\/\d+/g, '/:id');
    if (this.routeLabels[pathWithParams]) {
      return this.routeLabels[pathWithParams];
    }

    // Para rutas con múltiples parámetros, intentar diferentes combinaciones
    const pathWithMultipleParams = pathKey
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-z]+$/g, '/:tipo')
      .replace(/\/[a-z]+\/\d+/g, '/:tipo/:id');
    if (this.routeLabels[pathWithMultipleParams]) {
      return this.routeLabels[pathWithMultipleParams];
    }

    // Intentar solo con el segmento base (primer nivel)
    if (index === 0) {
      const baseSegment = segment;
      if (this.routeLabels[baseSegment]) {
        return this.routeLabels[baseSegment];
      }
    }

    // Para rutas anidadas, intentar con el patrón base
    if (index > 0) {
      const basePath = allSegments.slice(0, index + 1).join('/');
      const basePathWithParams = basePath.replace(/\/\d+/g, '/:id');
      if (this.routeLabels[basePathWithParams]) {
        return this.routeLabels[basePathWithParams];
      }
    }

    // Si no encontramos un label, formatear el segmento
    return this.formatSegment(segment);
  }

  private formatSegment(segment: string): string {
    // Remover parámetros de ruta
    let formatted = segment.replace(/\/:id/g, '').replace(/\/:tipo/g, '').replace(/\/:edicionId/g, '').replace(/\/:grupoNumero/g, '');
    
    // Convertir guiones a espacios y capitalizar
    formatted = formatted
      .split('/')
      .map(part => {
        return part
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      })
      .join(' / ');

    return formatted || 'Panel General';
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToPath(path: string): void {
    this.router.navigate([path]);
  }
}