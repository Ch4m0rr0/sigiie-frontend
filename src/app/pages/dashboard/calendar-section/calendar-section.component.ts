import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, inject, signal, computed, NgZone, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ActividadesService } from '../../../core/services/actividades.service';
import { SubactividadService } from '../../../core/services/subactividad.service';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { environment } from '../../../../environments/environment';
import type { Actividad } from '../../../core/models/actividad';
import type { Subactividad } from '../../../core/models/subactividad';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { CalendarModule, CalendarUtils, CalendarDateFormatter, CalendarA11y, CalendarEventTitleFormatter, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { es } from 'date-fns/locale';
import { format, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { forkJoin } from 'rxjs';

// Formateador personalizado para usar locale español
class CustomCalendarDateFormatter extends CalendarDateFormatter {
  override monthViewColumnHeader({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'EEE', { locale: es });
  }

  override monthViewTitle({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'MMMM yyyy', { locale: es });
  }

  override weekViewColumnHeader({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'EEE', { locale: es });
  }

  override dayViewHour({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'HH:mm', { locale: es });
  }

  override dayViewTitle({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'EEEE, d \'de\' MMMM \'de\' yyyy', { locale: es });
  }

  override weekViewTitle({ date, locale }: { date: Date; locale: string }): string {
    return format(date, 'Semana del d \'de\' MMMM', { locale: es });
  }
}

// Formateador personalizado para títulos de eventos
class CustomCalendarEventTitleFormatter extends CalendarEventTitleFormatter {
  override month(event: CalendarEvent): string {
    return event.title;
  }
}

@Component({
  standalone: true,
  selector: 'app-calendar-section',
  imports: [CommonModule, IconComponent, CalendarModule],
  providers: [
    CalendarUtils,
    {
      provide: CalendarDateFormatter,
      useClass: CustomCalendarDateFormatter,
    },
    CalendarA11y,
    {
      provide: CalendarEventTitleFormatter,
      useClass: CustomCalendarEventTitleFormatter,
    },
    {
      provide: DateAdapter,
      useFactory: adapterFactory,
    },
  ],
  templateUrl: './calendar-section.component.html'
})
export class CalendarSectionComponent implements OnInit, AfterViewInit, OnDestroy {
  private actividadesService = inject(ActividadesService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private elementRef = inject(ElementRef);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  // Calendario
  viewDate: Date = new Date();
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  locale: string = 'es';
  eventosCalendario = signal<CalendarEvent[]>([]);
  eventosCalendarioFiltrados = computed(() => {
    const eventos = this.eventosCalendario();
    const filtroEstado = this.filtroCalendarioEstado();
    const filtroTipo = this.filtroCalendarioTipo();
    const mostrarSolo = this.filtroCalendarioMostrarSolo();
    
    return eventos.filter(evento => {
      const meta = evento.meta as any;
      const actividad = meta?.actividad;
      const subactividad = meta?.subactividad;
      
      // Filtro por tipo (actividades/subactividades)
      if (mostrarSolo === 'actividades' && !actividad) return false;
      if (mostrarSolo === 'subactividades' && !subactividad) return false;
      
      // Filtro por estado
      if (filtroEstado !== null) {
        const estadoId = actividad?.idEstadoActividad || subactividad?.idEstadoActividad;
        if (estadoId !== filtroEstado) return false;
      }
      
      // Filtro por tipo de actividad
      if (filtroTipo !== null && actividad) {
        const tipoId = actividad.idTipoActividad;
        if (Array.isArray(tipoId)) {
          if (!tipoId.includes(filtroTipo)) return false;
        } else {
          if (tipoId !== filtroTipo) return false;
        }
      }
      
      return true;
    });
  });
  estadosActividad = signal<any[]>([]);
  tiposActividad = signal<any[]>([]);
  
  // Filtros del calendario
  filtroCalendarioEstado = signal<number | null>(null);
  filtroCalendarioTipo = signal<number | null>(null);
  filtroCalendarioMostrarSolo = signal<'todos' | 'actividades' | 'subactividades'>('todos');
  mostrarFiltrosCalendario = signal(false);

  // Hover para tooltip
  eventoHovered: CalendarEvent | null = null;
  hoverPosition = signal<{ x: number; y: number } | null>(null);
  hoverTimeout: any = null;

  ngOnInit() {
    this.loadEstadosActividad();
    this.loadTiposActividad();
    this.loadEventosCalendario();
    
    // Efecto para regenerar badges cuando cambian los eventos filtrados
    effect(() => {
      // Acceder a los eventos filtrados para que el efecto se active cuando cambien
      const eventos = this.eventosCalendarioFiltrados();
      // Regenerar badges después de que Angular actualice el DOM
      if (eventos.length > 0) {
        setTimeout(() => {
          this.agregarBadgesCodigo();
          this.agregarPuntosColorEstado();
          this.agregarSombreadoRangos();
        }, 300);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
  }

  // Cargar estados de actividad
  loadEstadosActividad(): void {
    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => {
        this.estadosActividad.set(data || []);
      },
      error: (err) => {
        console.warn('⚠️ Error cargando estados de actividad:', err);
        this.estadosActividad.set([]);
      }
    });
  }
  
  // Cargar tipos de actividad
  loadTiposActividad(): void {
    this.catalogosService.getTiposActividad().subscribe({
      next: (data) => {
        this.tiposActividad.set(data || []);
      },
      error: (err) => {
        console.warn('⚠️ Error cargando tipos de actividad:', err);
        this.tiposActividad.set([]);
      }
    });
  }
  
  // Limpiar filtros del calendario
  limpiarFiltrosCalendario(): void {
    this.filtroCalendarioEstado.set(null);
    this.filtroCalendarioTipo.set(null);
    this.filtroCalendarioMostrarSolo.set('todos');
    // Regenerar badges después de limpiar filtros
    setTimeout(() => {
      this.agregarBadgesCodigo();
      this.agregarPuntosColorEstado();
      this.agregarSombreadoRangos();
    }, 300);
  }

  // Toggle para mostrar/ocultar filtros
  toggleFiltrosCalendario(): void {
    this.mostrarFiltrosCalendario.update(v => !v);
  }

  // Métodos helper para el template
  onFiltroEstadoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.filtroCalendarioEstado.set(value ? Number(value) : null);
    // Regenerar badges después de que el filtro cambie
    setTimeout(() => {
      this.agregarBadgesCodigo();
      this.agregarPuntosColorEstado();
      this.agregarSombreadoRangos();
    }, 300);
  }

  onFiltroTipoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    this.filtroCalendarioTipo.set(value ? Number(value) : null);
    // Regenerar badges después de que el filtro cambie
    setTimeout(() => {
      this.agregarBadgesCodigo();
      this.agregarPuntosColorEstado();
      this.agregarSombreadoRangos();
    }, 300);
  }

  onFiltroMostrarSoloChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value as 'todos' | 'actividades' | 'subactividades';
    this.filtroCalendarioMostrarSolo.set(value);
    // Regenerar badges después de que el filtro cambie y el DOM se actualice
    setTimeout(() => {
      this.agregarBadgesCodigo();
      this.agregarPuntosColorEstado();
      this.agregarSombreadoRangos();
    }, 300);
  }

  // Cargar eventos del calendario
  loadEventosCalendario(): void {
    forkJoin({
      actividades: this.actividadesService.getAll(),
      subactividades: this.subactividadService.getAll()
    }).subscribe({
      next: ({ actividades, subactividades }) => {
        console.log(`📅 Cargando todas las actividades para el calendario: ${actividades.length} actividades encontradas`);
        console.log(`📅 Cargando todas las subactividades para el calendario: ${subactividades.length} subactividades encontradas`);
        this.actualizarEventosCalendario(actividades, subactividades);
      },
      error: (error) => {
        console.warn('⚠️ Error cargando actividades/subactividades para el calendario:', error);
        this.eventosCalendario.set([]);
      }
    });
  }

  /**
   * Parsea una fecha string del backend como fecha local (no UTC)
   * Evita el problema de que "2024-12-11" se interprete como UTC y aparezca un día antes
   */
  private parseLocalDate(dateString: string): Date {
    // Si la fecha viene en formato "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss"
    if (dateString.includes('T')) {
      // Si tiene hora, parsear normalmente
      return new Date(dateString);
    } else {
      // Si solo tiene fecha (YYYY-MM-DD), parsear como fecha local
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month es 0-indexed en Date
    }
  }

  // Actualizar eventos del calendario
  actualizarEventosCalendario(actividades: Actividad[], subactividades: Subactividad[] = []): void {
    const eventosActividades: CalendarEvent[] = actividades
      .filter(actividad => actividad.fechaInicio || actividad.fechaEvento || actividad.fechaCreacion)
      .map(actividad => {
        let fechaInicio: Date;
        let fechaFin: Date | undefined;
        
        if (actividad.fechaInicio && actividad.fechaFin) {
          fechaInicio = startOfDay(this.parseLocalDate(actividad.fechaInicio));
          fechaFin = endOfDay(this.parseLocalDate(actividad.fechaFin));
          if (fechaFin < fechaInicio) {
            fechaFin = undefined;
          }
        } else if (actividad.fechaInicio) {
          fechaInicio = startOfDay(this.parseLocalDate(actividad.fechaInicio));
        } else if (actividad.fechaEvento) {
          fechaInicio = startOfDay(this.parseLocalDate(actividad.fechaEvento));
        } else {
          fechaInicio = startOfDay(new Date(actividad.fechaCreacion));
        }
        
        // Obtener el color del estado de la actividad
        let colorEstado = '#3B82F6';
        let nombreEstado = actividad.nombreEstadoActividad || 'Sin estado';
        
        if (actividad.idEstadoActividad) {
          const estado = this.estadosActividad().find(
            e => (e.idEstadoActividad || e.id) === actividad.idEstadoActividad
          );
          if (estado) {
            colorEstado = (estado as any).color || '#3B82F6';
            nombreEstado = estado.nombre || nombreEstado;
          }
        }
        
        const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };
        
        const rgb = hexToRgb(colorEstado);
        const colorPrimary = colorEstado;
        const colorSecondary = rgb 
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
          : '#d1fae5';
        
        const color = {
          primary: colorPrimary,
          secondary: colorSecondary
        };
        
        // Obtener el código de la actividad - verificar múltiples posibles ubicaciones
        const codigo = actividad.codigoActividad || 
                      (actividad as any).CodigoActividad || 
                      (actividad as any).codigo || 
                      (actividad as any).Codigo || 
                      '';
        
        // Log para depuración (solo en desarrollo)
        if (!environment.production && actividad.id) {
          console.log(`🔍 [CALENDARIO] Actividad ID ${actividad.id}:`, {
            codigoActividad: actividad.codigoActividad,
            CodigoActividad: (actividad as any).CodigoActividad,
            codigo: (actividad as any).codigo,
            Codigo: (actividad as any).Codigo,
            codigoFinal: codigo,
            nombre: actividad.nombre || actividad.nombreActividad
          });
        }
        
        const nombre = actividad.nombre || actividad.nombreActividad || 'Sin nombre';
        let title = codigo ? `${codigo} - ${nombre}` : nombre;
        
        if (fechaFin) {
          const diasDuracion = differenceInDays(fechaFin, fechaInicio) + 1;
          if (diasDuracion > 1) {
            title = `${title} (${diasDuracion} días)`;
          }
        }
        
        const evento: CalendarEvent = {
          id: `actividad-${actividad.id}`,
          start: fechaInicio,
          title: title,
          color: color,
          meta: {
            actividad: actividad,
            estado: nombreEstado,
            codigoActividad: codigo || actividad.codigoActividad || undefined,
            tipo: 'actividad'
          }
        };
        
        if (fechaFin) {
          evento.end = fechaFin;
          evento.allDay = true;
        }
        
        return evento;
      });

    const eventosSubactividades: CalendarEvent[] = subactividades
      .filter(subactividad => subactividad.fechaInicio || subactividad.fechaCreacion)
      .map(subactividad => {
        let fechaInicio: Date;
        let fechaFin: Date | undefined;
        
        if (subactividad.fechaInicio && subactividad.fechaFin) {
          fechaInicio = startOfDay(this.parseLocalDate(subactividad.fechaInicio));
          fechaFin = endOfDay(this.parseLocalDate(subactividad.fechaFin));
          if (fechaFin < fechaInicio) {
            fechaFin = undefined;
          }
        } else if (subactividad.fechaInicio) {
          fechaInicio = startOfDay(this.parseLocalDate(subactividad.fechaInicio));
        } else {
          fechaInicio = startOfDay(new Date(subactividad.fechaCreacion));
        }
        
        let colorEstado = '#8B5CF6';
        let nombreEstado = 'Sin estado';
        
        if (subactividad.idEstadoActividad) {
          const estado = this.estadosActividad().find(
            e => (e.idEstadoActividad || e.id) === subactividad.idEstadoActividad
          );
          if (estado) {
            colorEstado = (estado as any).color || '#8B5CF6';
            nombreEstado = estado.nombre || nombreEstado;
          }
        }
        
        const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };
        
        const rgb = hexToRgb(colorEstado);
        const colorPrimary = colorEstado;
        const colorSecondary = rgb 
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
          : '#ede9fe';
        
        const color = {
          primary: colorPrimary,
          secondary: colorSecondary
        };
        
        const codigo = subactividad.codigoSubactividad || '';
        const nombre = subactividad.nombre || subactividad.nombreSubactividad || 'Sin nombre';
        let title = codigo ? `${codigo} - ${nombre}` : nombre;
        
        if (fechaFin) {
          const diasDuracion = differenceInDays(fechaFin, fechaInicio) + 1;
          if (diasDuracion > 1) {
            title = `${title} (${diasDuracion} días)`;
          }
        }
        
        const evento: CalendarEvent = {
          id: `subactividad-${subactividad.idSubactividad}`,
          start: fechaInicio,
          title: title,
          color: color,
          meta: {
            subactividad: subactividad,
            estado: nombreEstado,
            codigoSubactividad: subactividad.codigoSubactividad || codigo, // Asegurar que siempre tenga el código
            tipo: 'subactividad'
          }
        };
        
        if (fechaFin) {
          evento.end = fechaFin;
          evento.allDay = true;
        }
        
        return evento;
      });
    
    const todosLosEventos = [...eventosActividades, ...eventosSubactividades];
    this.eventosCalendario.set(todosLosEventos);
    
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  // Métodos para navegar el calendario
  cambiarMes(direccion: 'anterior' | 'siguiente'): void {
    const nuevaFecha = new Date(this.viewDate);
    if (direccion === 'anterior') {
      nuevaFecha.setMonth(nuevaFecha.getMonth() - 1);
    } else {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
    }
    this.viewDate = nuevaFecha;
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  irAHoy(): void {
    this.viewDate = new Date();
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  eventoClicked({ event }: { event: CalendarEvent }): void {
    const meta = event.meta as any;
    
    // Navegar a detalles de actividad
    if (meta?.actividad && meta.actividad.id) {
      this.router.navigate(['/actividades', meta.actividad.id]);
      return;
    }
    
    // Navegar a detalles de subactividad
    if (meta?.subactividad && meta.subactividad.idSubactividad) {
      this.router.navigate(['/subactividades', meta.subactividad.idSubactividad]);
      return;
    }
    
    // Fallback: intentar obtener el ID del evento
    if (event.id) {
      const eventId = String(event.id);
      if (eventId.startsWith('actividad-')) {
        const id = parseInt(eventId.replace('actividad-', ''), 10);
        if (!isNaN(id)) {
          this.router.navigate(['/actividades', id]);
          return;
        }
      } else if (eventId.startsWith('subactividad-')) {
        const id = parseInt(eventId.replace('subactividad-', ''), 10);
        if (!isNaN(id)) {
          this.router.navigate(['/subactividades', id]);
          return;
        }
      }
    }
  }

  getEstadoColor(estado: any): string {
    return estado?.color || estado?.Color || '#3B82F6';
  }

  onEventMouseLeave(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    this.eventoHovered = null;
    this.hoverPosition.set(null);
  }

  getTooltipLeft(): number {
    if (!this.hoverPosition()) return 0;
    const tooltipWidth = 320;
    const margin = 20;
    const x = this.hoverPosition()!.x;
    if (x + tooltipWidth + margin > window.innerWidth) {
      return x - tooltipWidth - margin;
    }
    return x + margin;
  }

  getTooltipTop(): number {
    if (!this.hoverPosition()) return 0;
    const tooltipHeight = 200;
    const margin = 20;
    const y = this.hoverPosition()!.y;
    if (y + tooltipHeight + margin > window.innerHeight) {
      return y - tooltipHeight - margin;
    }
    return y + margin;
  }

  // Métodos para manipulación del DOM (simplificados - se pueden extraer más)
  private obtenerCeldasCalendario(): NodeListOf<HTMLElement> | null {
    const calendarContainer = this.elementRef.nativeElement.querySelector('.calendar-container');
    if (calendarContainer) {
      const dayCells = calendarContainer.querySelectorAll('.cal-day-cell') as NodeListOf<HTMLElement>;
      if (dayCells && dayCells.length > 0) return dayCells;
    }
    const monthView = this.elementRef.nativeElement.querySelector('mwl-calendar-month-view');
    if (monthView) {
      const dayCells = monthView.querySelectorAll('.cal-day-cell') as NodeListOf<HTMLElement>;
      if (dayCells && dayCells.length > 0) return dayCells;
    }
    return null;
  }

  agregarBadgesCodigo(): void {
    this.ngZone.runOutsideAngular(() => {
      // Primero limpiar todos los badges existentes
      this.limpiarBadgesExistentes();
      
      const dayCells = this.obtenerCeldasCalendario();
      if (!dayCells || dayCells.length === 0) {
        setTimeout(() => {
          const retryCells = this.obtenerCeldasCalendario();
          if (retryCells && retryCells.length > 0) {
            this.agregarBadgesCodigoEnCeldas(retryCells);
          }
        }, 200);
        return;
      }
      this.agregarBadgesCodigoEnCeldas(dayCells);
    });
  }

  private limpiarBadgesExistentes(): void {
    const badges = this.elementRef.nativeElement.querySelectorAll('.activity-code-badge-inline');
    badges.forEach((badge: Element) => {
      try {
        badge.remove();
      } catch (e) {
        // Ignorar errores al remover
      }
    });
    // También limpiar data-event-id de los elementos para permitir reasignación
    const eventos = this.elementRef.nativeElement.querySelectorAll('.cal-event');
    eventos.forEach((evento: HTMLElement) => {
      evento.removeAttribute('data-event-id');
    });
  }

  private agregarBadgesCodigoEnCeldas(dayCells: NodeListOf<HTMLElement>): void {
    const eventos = this.eventosCalendarioFiltrados();
    if (eventos.length === 0) return;
    
    const eventosPorFecha = new Map<string, CalendarEvent[]>();
    eventos.forEach(evento => {
      const eventStart = startOfDay(evento.start);
      const eventEnd = evento.end ? startOfDay(evento.end) : eventStart;
      let currentDate = new Date(eventStart);
      while (currentDate <= eventEnd) {
        const fechaKey = currentDate.toISOString().split('T')[0];
        if (!eventosPorFecha.has(fechaKey)) {
          eventosPorFecha.set(fechaKey, []);
        }
        eventosPorFecha.get(fechaKey)!.push(evento);
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }
    });
    
    eventos.forEach((evento) => {
      const meta = evento.meta as any;
      
      // Usar exactamente el mismo algoritmo que para actividades
      // Para actividades: meta.codigoActividad o meta.actividad.codigoActividad
      // Para subactividades: meta.codigoSubactividad o meta.subactividad.codigoSubactividad
      let codigo: string | undefined;
      
      if (meta?.tipo === 'actividad') {
        // Algoritmo para actividades
        codigo = meta?.codigoActividad || meta?.actividad?.codigoActividad;
      } else if (meta?.tipo === 'subactividad') {
        // Mismo algoritmo pero para subactividades
        codigo = meta?.codigoSubactividad || meta?.subactividad?.codigoSubactividad;
      } else {
        // Fallback: intentar ambos
        codigo = meta?.codigoActividad || 
                 meta?.codigoSubactividad ||
                 meta?.actividad?.codigoActividad ||
                 meta?.subactividad?.codigoSubactividad;
      }
      
      // Si no hay código, intentar extraerlo del título (igual que actividades)
      if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
        // Intentar extraer el código del título (formato: "CODIGO - Nombre")
        const tituloMatch = evento.title.match(/^([A-Z0-9]+(?:-[A-Z0-9]+)*-\d{4}(?:-[A-Z]+)?)\s*-\s*/);
        if (tituloMatch && tituloMatch[1]) {
          codigo = tituloMatch[1];
        } else {
          // Si no hay código, saltar este evento (igual que actividades)
          return;
        }
      }
      
      // Asegurarse de que el código es una cadena válida
      if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
        return;
      }
      
      codigo = codigo.trim();
      
      const eventStart = startOfDay(evento.start);
      const eventEnd = evento.end ? startOfDay(evento.end) : eventStart;
      
      let evColor: string | undefined;
      if (typeof evento.color === 'string') {
        evColor = evento.color;
      } else if (evento.color && typeof evento.color === 'object' && 'primary' in evento.color) {
        evColor = evento.color.primary;
      }
      
      if (!evColor) return;
      
      const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const rgb = hexToRgb(evColor);
      if (!rgb) return;
      
      const expectedRgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      
      dayCells.forEach((cell: HTMLElement) => {
        const cellDate = this.obtenerFechaDeCelda(cell);
        if (!cellDate) return;
        
        const cellDateStart = startOfDay(cellDate);
        if (cellDateStart >= eventStart && cellDateStart <= eventEnd) {
          const fechaKey = cellDateStart.toISOString().split('T')[0];
          const eventosEnEstaFecha = eventosPorFecha.get(fechaKey) || [];
          const indiceEnFecha = eventosEnEstaFecha.findIndex(ev => ev.id === evento.id);
          
          const eventosEnCelda = Array.from(cell.querySelectorAll('.cal-event')) as HTMLElement[];
          const eventosSinBadge = eventosEnCelda.filter(el => {
            const dataEventId = el.getAttribute('data-event-id');
            const existingBadge = el.querySelector('.activity-code-badge-inline');
            if (existingBadge && dataEventId === String(evento.id)) {
              return false;
            }
            return true;
          });
          
          // Intentar identificar el evento por color
          const eventosConMismoColor = eventosSinBadge.filter(el => {
            const computedStyle = window.getComputedStyle(el);
            const backgroundColor = computedStyle.backgroundColor;
            return backgroundColor && (backgroundColor === expectedRgb || backgroundColor.includes(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`));
          });
          
          // También intentar identificar por título (especialmente útil para subactividades)
          const eventosConMismoTitulo = eventosSinBadge.filter(el => {
            const titleElement = el.querySelector('.cal-event-title');
            const tituloElemento = titleElement ? titleElement.textContent?.trim() : el.textContent?.trim() || '';
            
            // Extraer el código del título del elemento
            const codigoEnElemento = tituloElemento.match(/^([A-Z0-9]+(?:-[A-Z0-9]+)*-\d{4}(?:-[A-Z]+)?)/);
            const codigoEnEvento = evento.title.match(/^([A-Z0-9]+(?:-[A-Z0-9]+)*-\d{4}(?:-[A-Z]+)?)/);
            
            // Si ambos tienen código, comparar por código
            if (codigoEnElemento && codigoEnEvento) {
              return codigoEnElemento[1] === codigoEnEvento[1];
            }
            
            // Si no, comparar por nombre (removiendo códigos)
            const tituloLimpio = tituloElemento.replace(/^[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{4}(?:-[A-Z]+)?\s*-\s*/g, '').trim();
            const tituloEventoLimpio = evento.title.replace(/^[A-Z0-9]+(?:-[A-Z0-9]+)*-\d{4}(?:-[A-Z]+)?\s*-\s*/g, '').trim();
            return tituloLimpio === tituloEventoLimpio || tituloElemento.includes(tituloEventoLimpio) || tituloEventoLimpio.includes(tituloLimpio);
          });
          
          let eventoEncontrado: HTMLElement | null = null;
          
          // Prioridad 1: Eventos con mismo color y título
          const eventosCoincidentes = eventosConMismoColor.filter(el => {
            return eventosConMismoTitulo.includes(el);
          });
          
          if (eventosCoincidentes.length === 1) {
            eventoEncontrado = eventosCoincidentes[0];
          } else if (eventosCoincidentes.length > 1) {
            const eventosSinAsignar = eventosCoincidentes.filter(el => !el.getAttribute('data-event-id'));
            if (indiceEnFecha >= 0 && indiceEnFecha < eventosSinAsignar.length) {
              eventoEncontrado = eventosSinAsignar[indiceEnFecha];
            } else if (eventosSinAsignar.length === 1) {
              eventoEncontrado = eventosSinAsignar[0];
            }
          }
          
          // Prioridad 2: Si no se encontró, usar solo color
          if (!eventoEncontrado) {
            if (eventosConMismoColor.length === 1) {
              eventoEncontrado = eventosConMismoColor[0];
            } else if (eventosConMismoColor.length > 1) {
              const eventosSinAsignar = eventosConMismoColor.filter(el => !el.getAttribute('data-event-id'));
              if (indiceEnFecha >= 0 && indiceEnFecha < eventosSinAsignar.length) {
                eventoEncontrado = eventosSinAsignar[indiceEnFecha];
              } else if (eventosSinAsignar.length === 1) {
                eventoEncontrado = eventosSinAsignar[0];
              }
            }
          }
          
          // Prioridad 3: Si aún no se encontró, usar solo título
          if (!eventoEncontrado && eventosConMismoTitulo.length > 0) {
            if (eventosConMismoTitulo.length === 1) {
              eventoEncontrado = eventosConMismoTitulo[0];
            } else {
              const eventosSinAsignar = eventosConMismoTitulo.filter(el => !el.getAttribute('data-event-id'));
              if (indiceEnFecha >= 0 && indiceEnFecha < eventosSinAsignar.length) {
                eventoEncontrado = eventosSinAsignar[indiceEnFecha];
              } else if (eventosSinAsignar.length === 1) {
                eventoEncontrado = eventosSinAsignar[0];
              }
            }
          }
          
          // Prioridad 4: Si aún no se encontró, usar índice
          if (!eventoEncontrado && eventosSinBadge.length > 0 && indiceEnFecha >= 0) {
            const eventosSinAsignar = eventosSinBadge.filter(el => !el.getAttribute('data-event-id'));
            if (indiceEnFecha < eventosSinAsignar.length) {
              eventoEncontrado = eventosSinAsignar[indiceEnFecha];
            }
          }
          
          if (eventoEncontrado) {
            const dataEventId = eventoEncontrado.getAttribute('data-event-id');
            if (!dataEventId || dataEventId === String(evento.id)) {
              this.agregarBadgeAElemento(eventoEncontrado, codigo, evento.id);
            }
          }
        }
      });
    });
  }

  private agregarBadgeAElemento(eventEl: HTMLElement, codigo: string, eventoId?: string | number): void {
    if (!eventEl.parentNode) return;
    
    // Verificar si ya existe un badge con este código
    const existingBadge = eventEl.querySelector('.activity-code-badge-inline');
    if (existingBadge) {
      const codigoExistente = existingBadge.textContent?.trim();
      // Si el badge existente tiene el mismo código, no hacer nada
      if (codigoExistente === codigo) {
        if (eventoId) {
          eventEl.setAttribute('data-event-id', String(eventoId));
        }
        return;
      }
      // Si tiene un código diferente, removerlo
      try {
        existingBadge.remove();
      } catch (e) {
        console.warn('No se pudo remover el badge existente:', e);
      }
    }
    
    // Verificar si el código ya está en el título como texto (no como badge)
    const titleElement = eventEl.querySelector('.cal-event-title') as HTMLElement;
    const textoCompleto = titleElement ? titleElement.textContent || '' : eventEl.textContent || '';
    
    // Si el código ya está visible en el título como parte del texto, aún así agregar el badge
    // para mantener consistencia visual con las actividades
    
    const badge = document.createElement('span');
    badge.className = 'activity-code-badge-inline';
    badge.style.cssText = 'margin-left: 0.5rem; padding: 0.125rem 0.375rem; font-size: 0.625rem; font-family: monospace; font-weight: 600; background-color: rgba(255, 255, 255, 0.9); color: #334155; border-radius: 0.25rem; border: 1px solid rgba(203, 213, 225, 0.8); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); white-space: nowrap; display: inline-block; vertical-align: middle;';
    badge.textContent = codigo;
    badge.title = `Código: ${codigo}`;
    
    try {
      if (titleElement && titleElement.parentNode) {
        // Agregar el badge al final del título
        titleElement.appendChild(badge);
      } else if (eventEl.parentNode) {
        // Si no hay elemento de título, agregar al evento directamente
        eventEl.appendChild(badge);
      }
    } catch (e) {
      console.warn('No se pudo agregar el badge:', e);
      return;
    }
    
    if (eventoId) {
      eventEl.setAttribute('data-event-id', String(eventoId));
    }
  }

  obtenerFechaDeCelda(cell: HTMLElement): Date | null {
    try {
      const dayNumberEl = cell.querySelector('.cal-day-number');
      if (!dayNumberEl) return null;
      const dayNumber = parseInt(dayNumberEl.textContent?.trim() || '0', 10);
      if (dayNumber === 0) return null;
      const viewDate = this.viewDate;
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      return new Date(year, month, dayNumber);
    } catch (e) {
      return null;
    }
  }

  attachEventListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      const eventos = document.querySelectorAll('.cal-month-view .cal-event');
      eventos.forEach((eventoEl) => {
        const eventElement = eventoEl as HTMLElement;
        if (eventElement.hasAttribute('data-listeners-attached')) {
          return;
        }
        eventElement.setAttribute('data-listeners-attached', 'true');
        
        eventElement.addEventListener('mouseenter', (e: Event) => {
          const mouseEvent = e as MouseEvent;
          const target = e.target as HTMLElement;
          
          if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
          }
          
          let eventElementFound: HTMLElement | null = target;
          while (eventElementFound && !eventElementFound.classList.contains('cal-event')) {
            eventElementFound = eventElementFound.parentElement;
          }
          if (!eventElementFound) {
            eventElementFound = target;
          }
          
          let evento: CalendarEvent | undefined;
          
          if (target.classList.contains('activity-code-badge-inline')) {
            const codigoBadge = target.textContent?.trim() || '';
            if (codigoBadge) {
              evento = this.eventosCalendario().find(ev => {
                const meta = ev.meta as any;
                const codigo = meta?.codigoActividad || meta?.codigoSubactividad || meta?.actividad?.codigoActividad || meta?.subactividad?.codigoSubactividad;
                return codigo === codigoBadge;
              });
            }
          }
          
          if (!evento) {
            const badge = eventElementFound.querySelector('.activity-code-badge-inline');
            if (badge) {
              const codigoBadge = badge.textContent?.trim() || '';
              if (codigoBadge) {
                evento = this.eventosCalendario().find(ev => {
                  const meta = ev.meta as any;
                  const codigo = meta?.codigoActividad || meta?.codigoSubactividad || meta?.actividad?.codigoActividad || meta?.subactividad?.codigoSubactividad;
                  return codigo === codigoBadge;
                });
              }
            }
          }
          
          if (!evento) {
            const eventId = eventElementFound.getAttribute('data-event-id');
            if (eventId) {
              evento = this.eventosCalendario().find(ev => String(ev.id) === eventId);
            }
          }
          
          if (!evento) {
            const titleElement = eventElementFound.querySelector('.cal-event-title');
            let titulo = titleElement ? titleElement.textContent?.trim() : eventElementFound.textContent?.trim() || '';
            titulo = titulo.replace(/[A-Z0-9]+-\d{4}/g, '').trim();
            if (titulo) {
              evento = this.eventosCalendario().find(ev => {
                if (ev.title === titulo) return true;
                const actividad = (ev.meta as any)?.actividad;
                const subactividad = (ev.meta as any)?.subactividad;
                if (actividad?.nombre === titulo || actividad?.nombreActividad === titulo) return true;
                if (subactividad?.nombre === titulo || subactividad?.nombreSubactividad === titulo) return true;
                return false;
              });
            }
          }
          
          if (evento) {
            this.ngZone.run(() => {
              this.eventoHovered = evento!;
              this.hoverPosition.set({
                x: mouseEvent.clientX,
                y: mouseEvent.clientY
              });
            });
          }
        });
        
        eventElement.addEventListener('mouseleave', (e: Event) => {
          const mouseEvent = e as MouseEvent;
          const relatedTarget = mouseEvent.relatedTarget as HTMLElement;
          
          if (relatedTarget) {
            let checkElement: HTMLElement | null = relatedTarget;
            while (checkElement && !checkElement.classList.contains('cal-event') && !checkElement.classList.contains('cal-day-cell')) {
              checkElement = checkElement.parentElement;
            }
            if (checkElement && checkElement.classList.contains('cal-event')) {
              return;
            }
          }
          
          if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
          }
          
          this.ngZone.run(() => {
            this.eventoHovered = null;
            this.hoverPosition.set(null);
          });
        });
        
        eventElement.addEventListener('mousemove', (e: Event) => {
          if (this.eventoHovered) {
            const mouseEvent = e as MouseEvent;
            this.ngZone.run(() => {
              this.hoverPosition.set({
                x: mouseEvent.clientX,
                y: mouseEvent.clientY
              });
            });
          }
        });
      });

      const dayCells = this.elementRef.nativeElement.querySelectorAll('.cal-day-cell');
      dayCells.forEach((cell: HTMLElement) => {
        if (cell.hasAttribute('data-listeners-attached')) {
          return;
        }
        cell.setAttribute('data-listeners-attached', 'true');
        
        cell.addEventListener('mouseenter', (e: MouseEvent) => {
          const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
          let eventElementFound: HTMLElement | null = null;
          let isOverBadge = false;
          
          if (elementUnderCursor) {
            if (elementUnderCursor.classList.contains('activity-code-badge-inline')) {
              isOverBadge = true;
              eventElementFound = elementUnderCursor as HTMLElement;
              while (eventElementFound && !eventElementFound.classList.contains('cal-event')) {
                eventElementFound = eventElementFound.parentElement;
              }
            } else {
              eventElementFound = elementUnderCursor as HTMLElement;
              while (eventElementFound && !eventElementFound.classList.contains('cal-event')) {
                eventElementFound = eventElementFound.parentElement;
              }
            }
          }
          
          if (isOverBadge || (eventElementFound && eventElementFound.classList.contains('cal-event'))) {
            return;
          }
          
          const cellDate = this.obtenerFechaDeCelda(cell);
          if (!cellDate) return;
          
          const cellDateStart = startOfDay(cellDate);
          const eventos = this.eventosCalendario();
          
          const eventosEnEsteDia = eventos.filter(ev => {
            const eventStart = startOfDay(ev.start);
            const eventEnd = ev.end ? startOfDay(ev.end) : eventStart;
            return cellDateStart >= eventStart && cellDateStart <= eventEnd;
          });
          
          if (eventosEnEsteDia.length > 0) {
            const primerEvento = eventosEnEsteDia[0];
            this.hoverTimeout = setTimeout(() => {
              const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
              let isOverEvent = false;
              if (elementUnderCursor) {
                if (elementUnderCursor.classList.contains('activity-code-badge-inline')) {
                  isOverEvent = true;
                } else {
                  let checkElement: HTMLElement | null = elementUnderCursor as HTMLElement;
                  while (checkElement && !checkElement.classList.contains('cal-event')) {
                    checkElement = checkElement.parentElement;
                  }
                  isOverEvent = checkElement !== null && checkElement.classList.contains('cal-event');
                }
              }
              
              if (!isOverEvent) {
                this.ngZone.run(() => {
                  this.eventoHovered = primerEvento;
                  this.hoverPosition.set({
                    x: e.clientX,
                    y: e.clientY
                  });
                });
              }
            }, 200);
          }
        });
        
        cell.addEventListener('mouseleave', (e: MouseEvent) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (relatedTarget) {
            let checkElement: HTMLElement | null = relatedTarget;
            while (checkElement && !checkElement.classList.contains('cal-event')) {
              checkElement = checkElement.parentElement;
            }
            if (checkElement && checkElement.classList.contains('cal-event')) {
              return;
            }
          }
          
          if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
          }
          
          this.ngZone.run(() => {
            this.eventoHovered = null;
            this.hoverPosition.set(null);
          });
        });
        
        cell.addEventListener('mousemove', (e: MouseEvent) => {
          const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
          if (elementUnderCursor) {
            let checkElement: HTMLElement | null = elementUnderCursor as HTMLElement;
            while (checkElement && !checkElement.classList.contains('cal-event')) {
              checkElement = checkElement.parentElement;
            }
            if (checkElement && checkElement.classList.contains('cal-event')) {
              return;
            }
          }
          
          if (this.eventoHovered) {
            this.ngZone.run(() => {
              this.hoverPosition.set({
                x: e.clientX,
                y: e.clientY
              });
            });
          }
        });
      });
    });
  }

  agregarSombreadoRangos(): void {
    const dayCells = this.obtenerCeldasCalendario();
    if (!dayCells || dayCells.length === 0) {
      setTimeout(() => {
        const retryCells = this.obtenerCeldasCalendario();
        if (retryCells && retryCells.length > 0) {
          this.agregarSombreadoRangosEnCeldas(retryCells);
        }
      }, 200);
      return;
    }
    this.agregarSombreadoRangosEnCeldas(dayCells);
  }

  private agregarSombreadoRangosEnCeldas(dayCells: NodeListOf<HTMLElement>): void {
    const eventos = this.eventosCalendarioFiltrados();
    
    dayCells.forEach((cell: HTMLElement) => {
      cell.style.backgroundColor = '';
      cell.style.backgroundImage = '';
      
      const cellDate = this.obtenerFechaDeCelda(cell);
      if (!cellDate) return;
      
      const cellDateStart = startOfDay(cellDate);
      
      const eventosMultiplesDias = eventos.filter(e => {
        if (!e.end) return false;
        const eventStart = startOfDay(e.start);
        const eventEnd = startOfDay(e.end);
        return cellDateStart >= eventStart && cellDateStart <= eventEnd;
      });
      
      if (eventosMultiplesDias.length > 0) {
        const primerEvento = eventosMultiplesDias[0];
        const actividad = (primerEvento.meta as any)?.actividad;
        const subactividad = (primerEvento.meta as any)?.subactividad;
        
        let colorEstado = '#3B82F6';
        if (actividad && actividad.idEstadoActividad) {
          const estado = this.estadosActividad().find(
            e => (e.idEstadoActividad || e.id) === actividad.idEstadoActividad
          );
          if (estado) {
            colorEstado = (estado as any).color || '#3B82F6';
          }
        } else if (subactividad && subactividad.idEstadoActividad) {
          const estado = this.estadosActividad().find(
            e => (e.idEstadoActividad || e.id) === subactividad.idEstadoActividad
          );
          if (estado) {
            colorEstado = (estado as any).color || '#8B5CF6';
          }
        }
        
        const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };
        
        const rgb = hexToRgb(colorEstado);
        if (rgb) {
          const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
          cell.style.backgroundColor = backgroundColor;
        }
      }
    });
  }

  agregarPuntosColorEstado(): void {
    this.ngZone.runOutsideAngular(() => {
      const events = this.elementRef.nativeElement.querySelectorAll('.cal-event');
      const eventos = this.eventosCalendario();
      
      events.forEach((eventEl: HTMLElement) => {
        if (eventEl.querySelector('.estado-color-dot')) {
          return;
        }

        const eventId = eventEl.getAttribute('data-event-id');
        let evento: CalendarEvent | undefined;
        
        if (eventId) {
          evento = eventos.find(e => String(e.id) === eventId);
        }
        
        if (!evento) {
          const eventTitle = eventEl.textContent?.trim() || '';
          evento = eventos.find(e => {
            if (e.title === eventTitle) return true;
            const actividad = (e.meta as any)?.actividad;
            if (actividad?.nombre === eventTitle) return true;
            if (actividad?.nombre && eventTitle.includes(actividad.nombre)) return true;
            return false;
          });
        }
        
        if (evento) {
          const actividad = (evento.meta as any)?.actividad;
          const subactividad = (evento.meta as any)?.subactividad;
          let colorEstado = '#3B82F6';
          
          if (actividad && actividad.idEstadoActividad) {
            const estado = this.estadosActividad().find(
              e => (e.idEstadoActividad || e.id) === actividad.idEstadoActividad
            );
            if (estado) {
              colorEstado = (estado as any).color || '#3B82F6';
            }
          } else if (subactividad && subactividad.idEstadoActividad) {
            const estado = this.estadosActividad().find(
              e => (e.idEstadoActividad || e.id) === subactividad.idEstadoActividad
            );
            if (estado) {
              colorEstado = (estado as any).color || '#8B5CF6';
            }
          }
          
          const punto = document.createElement('span');
          punto.className = 'estado-color-dot';
          punto.style.cssText = `
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background-color: ${colorEstado};
            margin-right: 4px;
            vertical-align: middle;
            flex-shrink: 0;
          `;
          
          if (eventEl.parentNode && eventEl.firstChild) {
            try {
              eventEl.insertBefore(punto, eventEl.firstChild);
            } catch (error) {
              try {
                eventEl.appendChild(punto);
              } catch (e) {
                console.warn('No se pudo agregar el punto de color:', e);
              }
            }
          } else if (eventEl.parentNode) {
            try {
              eventEl.appendChild(punto);
            } catch (e) {
              console.warn('No se pudo agregar el punto de color:', e);
            }
          }
        }
      });
    });
  }
}

