import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
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
                <span class="hover:text-slate-800 cursor-pointer transition-colors">Sistema</span>
                <app-icon icon="chevron_right" size="xs" class="mx-2 text-slate-300"></app-icon>
                <span class="text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">Panel General</span>
              </div>
            </div>

            <div class="flex items-center gap-3 md:gap-6">
              
              <div class="relative hidden md:block group">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <app-icon icon="search" size="sm" class="text-slate-400 group-focus-within:text-blue-500 transition-colors"></app-icon>
                </div>
                <input
                  type="text"
                  placeholder="Buscar en el sistema..."
                  class="block w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                />
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span class="text-[10px] text-slate-400 font-sans border border-slate-200 rounded px-1.5 bg-white">⌘K</span>
                </div>
              </div>

              <div class="h-6 w-px bg-slate-200 hidden md:block"></div>

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

  ngOnInit(): void {
    // Iniciar el servicio de notificaciones automáticas
    this.notificacionesAutomaticas.iniciar();
    // El PermisosService se inicializa automáticamente en su constructor
    // pero forzamos la carga inicial de permisos
    this.permisosService.loadPermisosUsuarioActual();
  }

  ngOnDestroy(): void {
    // Detener el servicio cuando se destruye el componente
    this.notificacionesAutomaticas.detener();
  }
}