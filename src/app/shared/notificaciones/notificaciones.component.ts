import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificacionesService, Notificacion } from '../../core/services/notificaciones.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-notificaciones',
  imports: [CommonModule, IconComponent],
  template: `
    <div class="relative">
      <button
        (click)="toggleDropdown()"
        class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
        title="Notificaciones">
        <app-icon icon="notifications" size="sm"></app-icon>
        
        <!-- Badge con número de notificaciones no leídas (solo cuando el dropdown está cerrado y no se ha abierto antes, o si se clickeó alguna) -->
        @if (mostrarContador() > 0 && !isOpen()) {
          <span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
            {{ mostrarContador() > 99 ? '99+' : mostrarContador() }}
          </span>
        }
        
        <!-- Puntito rojo: aparece si se ha abierto el dropdown pero no se ha clickeado ninguna notificación -->
        @if (dropdownAbiertoAlgunaVez() && !notificacionClickeada() && noLeidasCount() > 0 && !isOpen() && mostrarContador() === 0) {
          <span class="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
        }
      </button>

      @if (isOpen()) {
        <div class="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 z-50 max-h-[600px] flex flex-col">
          <!-- Header -->
          <div class="px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-slate-900">Notificaciones</h3>
              @if (noLeidasCount() > 0) {
                <button
                  (click)="marcarTodasComoLeidas()"
                  class="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                  Marcar todas como leídas
                </button>
              }
            </div>
            <!-- Toggle para mostrar notificaciones en pantalla -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-200">
              <label class="text-xs text-slate-700 font-medium cursor-pointer flex items-center gap-2" (click)="toggleMostrarToasts()">
                <span>Mostrar notificaciones en Pantalla</span>
              </label>
              <button
                type="button"
                (click)="toggleMostrarToasts()"
                [class]="mostrarToasts() ? 'bg-emerald-600' : 'bg-slate-300'"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
                <span
                  [class.translate-x-5]="mostrarToasts()"
                  [class.translate-x-1]="!mostrarToasts()"
                  class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform"></span>
              </button>
            </div>
          </div>

          <!-- Lista de notificaciones -->
          <div class="overflow-y-auto flex-1">
            @if (loading()) {
              <div class="p-8 text-center">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p class="mt-2 text-sm text-slate-500">Cargando notificaciones...</p>
              </div>
            } @else if (notificaciones().length === 0) {
              <div class="p-8 text-center">
                <app-icon icon="notifications_off" size="lg" class="text-slate-300 mx-auto mb-2"></app-icon>
                <p class="text-sm text-slate-500">No hay notificaciones</p>
              </div>
            } @else {
              <div class="divide-y divide-slate-100">
                @for (notificacion of notificaciones(); track notificacion.id) {
                  <div
                    (click)="handleNotificacionClick(notificacion)"
                    [class.bg-blue-50]="!notificacion.leida"
                    [class.bg-white]="notificacion.leida"
                    class="px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer relative group">
                    
                    @if (!notificacion.leida) {
                      <div class="absolute left-2 top-4 w-2 h-2 bg-blue-600 rounded-full"></div>
                    }

                    <div class="flex items-start gap-3 pl-4">
                      <!-- Icono según tipo -->
                      <div [class]="getIconClass(notificacion.tipo)" class="flex-shrink-0 mt-0.5">
                        <app-icon [icon]="getIconName(notificacion.tipo)" size="sm"></app-icon>
                      </div>

                      <!-- Contenido -->
                      <div class="flex-1 min-w-0">
                        <p [class]="notificacion.leida ? 'text-slate-600' : 'text-slate-900'" class="text-sm font-medium mb-1">
                          {{ notificacion.titulo }}
                        </p>
                        <p class="text-xs text-slate-500 mb-2 line-clamp-2">
                          {{ notificacion.mensaje }}
                        </p>
                        <p class="text-xs text-slate-400">
                          {{ getTiempoRelativo(notificacion.fecha) }}
                        </p>
                      </div>

                      <!-- Botón eliminar -->
                      <button
                        (click)="eliminarNotificacion(notificacion.id); $event.stopPropagation()"
                        class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-600 flex-shrink-0">
                        <app-icon icon="close" size="xs"></app-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Footer -->
          @if (notificaciones().length > 0) {
            <div class="px-4 py-2 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                (click)="verTodas()"
                class="w-full text-xs text-center text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Ver todas las notificaciones
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private notificacionesService = inject(NotificacionesService);
  private router = inject(Router);

  isOpen = signal(false);
  notificaciones = signal<Notificacion[]>([]);
  noLeidasCount = signal(0);
  loading = signal(false);
  mostrarToasts = signal(this.notificacionesService.getMostrarToasts());
  
  // Rastrear si se ha abierto el dropdown y si se ha interactuado con alguna notificación
  dropdownAbiertoAlgunaVez = signal(false);
  notificacionClickeada = signal(false);
  
  // Contador visual: muestra el número solo cuando el dropdown está cerrado y hay notificaciones no leídas
  mostrarContador = signal(0);

  private subscription: any;
  private mostrarToastsSubscription: any;

  ngOnInit(): void {
    this.loading.set(true);
    this.notificacionesService.loadNotificaciones();
    
    // Suscribirse a cambios en las notificaciones
    this.subscription = this.notificacionesService.notificaciones$.subscribe(notificaciones => {
      this.notificaciones.set(notificaciones);
      this.loading.set(false);
    });

    // Suscribirse al contador de no leídas
    this.notificacionesService.noLeidasCount$.subscribe(count => {
      this.noLeidasCount.set(count);
      // Actualizar el contador visual solo si el dropdown está cerrado y no se ha abierto antes
      // o si se ha abierto pero se ha clickeado alguna notificación
      if (!this.isOpen()) {
        if (!this.dropdownAbiertoAlgunaVez() || this.notificacionClickeada()) {
          this.mostrarContador.set(count);
        } else {
          // Si se ha abierto pero no se ha clickeado, no mostrar el contador
          this.mostrarContador.set(0);
        }
      }
    });

    // Cargar el valor inicial desde el servicio y suscribirse a cambios
    this.mostrarToasts.set(this.notificacionesService.getMostrarToasts());
    this.mostrarToastsSubscription = this.notificacionesService.mostrarToasts$.subscribe(mostrar => {
      this.mostrarToasts.set(mostrar);
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.mostrarToastsSubscription) {
      this.mostrarToastsSubscription.unsubscribe();
    }
  }

  toggleMostrarToasts(): void {
    const nuevoEstado = !this.mostrarToasts();
    this.notificacionesService.setMostrarToasts(nuevoEstado);
  }

  toggleDropdown(): void {
    const nuevoEstado = !this.isOpen();
    this.isOpen.set(nuevoEstado);
    
    if (nuevoEstado) {
      // Cuando se abre el dropdown
      this.dropdownAbiertoAlgunaVez.set(true);
      // No resetear notificacionClickeada aquí, solo cuando se cierra sin clickear
      // Ocultar el contador cuando se abre (no mostrar el número)
      this.mostrarContador.set(0);
      this.notificacionesService.loadNotificaciones();
    } else {
      // Cuando se cierra el dropdown
      // Si no se clickeó ninguna notificación, mantener el contador en 0 (no mostrar)
      // El puntito rojo se mostrará en su lugar
      if (!this.notificacionClickeada()) {
        this.mostrarContador.set(0);
      } else {
        // Si se clickeó alguna, mostrar el contador actualizado
        this.mostrarContador.set(this.noLeidasCount());
        // Resetear el flag para la próxima vez que se abra
        this.notificacionClickeada.set(false);
      }
    }
  }

  handleNotificacionClick(notificacion: Notificacion): void {
    // Marcar que se ha clickeado una notificación
    this.notificacionClickeada.set(true);
    
    if (!notificacion.leida) {
      this.marcarComoLeida(notificacion.id);
    }
    
    if (notificacion.url) {
      // Si la URL tiene query params, usar navigate con queryParams
      const urlParts = notificacion.url.split('?');
      const path = urlParts[0];
      const queryString = urlParts[1];
      
      if (queryString) {
        // Parsear query params
        const queryParams: any = {};
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            queryParams[key] = decodeURIComponent(value);
          }
        });
        this.router.navigate([path], { queryParams });
      } else {
        this.router.navigateByUrl(notificacion.url);
      }
      this.isOpen.set(false);
    }
  }

  marcarComoLeida(id: number): void {
    this.notificacionesService.marcarComoLeida(id).subscribe();
  }

  marcarTodasComoLeidas(): void {
    this.notificacionClickeada.set(true);
    this.notificacionesService.marcarTodasComoLeidas().subscribe();
  }

  eliminarNotificacion(id: number): void {
    this.notificacionesService.eliminar(id).subscribe();
  }

  verTodas(): void {
    // Aquí puedes navegar a una página de notificaciones si existe
    // this.router.navigate(['/notificaciones']);
    this.isOpen.set(false);
  }

  getIconName(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'check_circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  }

  getIconClass(tipo: string): string {
    switch (tipo) {
      case 'success':
        return 'text-emerald-600';
      case 'warning':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  }

  getTiempoRelativo(fecha: Date): string {
    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Hace un momento';
    } else if (diffMins < 60) {
      return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else {
      return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('app-notificaciones')) {
      this.isOpen.set(false);
    }
  }
}

