import { Component, inject, OnInit, AfterViewInit, OnDestroy, signal, computed, effect, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SubactividadService } from '../../core/services/subactividad.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Subactividad } from '../../core/models/subactividad';
import type { Actividad } from '../../core/models/actividad';
import type { TipoSubactividad } from '../../core/models/catalogos-nuevos';
import { IconComponent } from '../../shared/icon/icon.component';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { CalendarModule, CalendarUtils, CalendarDateFormatter, CalendarA11y, CalendarEventTitleFormatter, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { es } from 'date-fns/locale';
import { format, startOfDay, endOfDay, differenceInDays, addMonths, subMonths } from 'date-fns';
import { EvidenciaFormComponent } from '../evidencias/evidencia-form.component';

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
  selector: 'app-subactividades-list',
  imports: [
    CommonModule, 
    RouterModule, 
    IconComponent, 
    SkeletonCardComponent,
    ...BrnButtonImports,
    CalendarModule,
    EvidenciaFormComponent
  ],
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
  templateUrl: './subactividades-list.component.html',
})
export class SubactividadesListComponent implements OnInit, AfterViewInit, OnDestroy {
  private subactividadService = inject(SubactividadService);
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  subactividades = signal<Subactividad[]>([]);
  actividades = signal<Actividad[]>([]);
  tiposSubactividad = signal<TipoSubactividad[]>([]);
  estadosActividad = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Modo de vista: 'cards' | 'lista' | 'calendario'
  modoVista = signal<'cards' | 'lista' | 'calendario'>('lista');
  
  // Calendario
  viewDate: Date = new Date();
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  locale: string = 'es';
  
  eventosCalendario = signal<CalendarEvent[]>([]);
  eventoHovered: CalendarEvent | null = null;
  hoverPosition = signal<{ x: number; y: number } | null>(null);

  // Filtros
  filtroActividad = signal<number | null>(null);
  filtroTipo = signal<number | null>(null);
  filtroActivo = signal<boolean | null>(null);
  terminoBusqueda = signal<string>('');

  // Modal de evidencia
  showEvidenciaModal = signal(false);
  subactividadParaEvidencia = signal<Subactividad | null>(null);
  
  // Dropdown de nueva subactividad
  mostrarDropdownSubactividad = signal(false);

  // Subactividades filtradas por búsqueda
  subactividadesFiltradas = computed(() => {
    const termino = this.terminoBusqueda().toLowerCase().trim();
    if (!termino) {
      return this.subactividades();
    }
    return this.subactividades().filter(subactividad => {
      const nombre = (subactividad.nombre || subactividad.nombreSubactividad || '').toLowerCase();
      return nombre.includes(termino);
    });
  });

  constructor() {
    // Efecto para actualizar eventos del calendario cuando cambien las subactividades
    effect(() => {
      const subactividades = this.subactividades();
      if (subactividades.length > 0 && this.modoVista() === 'calendario') {
        this.actualizarEventosCalendario(subactividades);
      }
    });
  }

  ngOnInit(): void {
    this.loadActividades();
    this.loadTiposSubactividad();
    this.loadEstadosActividad();
    this.loadSubactividades();
  }

  ngAfterViewInit(): void {
    // Attach event listeners después de que la vista se inicialice
    setTimeout(() => {
      this.attachEventListeners();
    }, 500);
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
  }

  loadActividades(): void {
    this.actividadesService.list().subscribe({
      next: (data) => this.actividades.set(data),
      error: (err) => console.error('Error loading actividades:', err)
    });
  }

  loadTiposSubactividad(): void {
    this.catalogosService.getTiposSubactividad().subscribe({
      next: (data) => this.tiposSubactividad.set(data),
      error: (err) => console.error('Error loading tipos subactividad:', err)
    });
  }

  loadEstadosActividad(): void {
    this.catalogosService.getEstadosActividad().subscribe({
      next: (data) => this.estadosActividad.set(data),
      error: (err) => console.error('Error loading estados actividad:', err)
    });
  }

  loadSubactividades(): void {
    this.loading.set(true);
    this.error.set(null);

    // Si hay filtro por actividad, usar ese endpoint
    if (this.filtroActividad()) {
      this.subactividadService.getByActividad(this.filtroActividad()!).subscribe({
        next: (data) => {
          let filtered = data;
          if (this.filtroTipo()) {
            filtered = filtered.filter(s => s.idTipoSubactividad === this.filtroTipo()!);
          }
          if (this.filtroActivo() !== null) {
            filtered = filtered.filter(s => s.activo === this.filtroActivo()!);
          }
          this.subactividades.set(filtered);
          this.actualizarEventosCalendario(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading subactividades:', err);
          this.error.set('Error al cargar las subactividades');
          this.loading.set(false);
        }
      });
    } else {
      // Cargar todas y aplicar filtros
      this.subactividadService.getAll().subscribe({
        next: (data) => {
          let filtered = data;
          if (this.filtroTipo()) {
            filtered = filtered.filter(s => s.idTipoSubactividad === this.filtroTipo()!);
          }
          if (this.filtroActivo() !== null) {
            filtered = filtered.filter(s => s.activo === this.filtroActivo()!);
          }
          this.subactividades.set(filtered);
          this.actualizarEventosCalendario(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading subactividades:', err);
          this.error.set('Error al cargar las subactividades');
          this.loading.set(false);
        }
      });
    }
  }

  cambiarModoVista(modo: 'cards' | 'lista' | 'calendario'): void {
    this.modoVista.set(modo);
    if (modo === 'calendario') {
      setTimeout(() => {
        this.actualizarEventosCalendario(this.subactividades());
      }, 100);
    }
  }

  actualizarEventosCalendario(subactividades: Subactividad[]): void {
    const eventos: CalendarEvent[] = subactividades
      .filter(subactividad => subactividad.fechaInicio || subactividad.fechaCreacion)
      .map(subactividad => {
        let fechaInicio: Date;
        let fechaFin: Date | undefined;
        
        if (subactividad.fechaInicio && subactividad.fechaFin) {
          fechaInicio = startOfDay(new Date(subactividad.fechaInicio));
          fechaFin = endOfDay(new Date(subactividad.fechaFin));
          
          if (fechaFin < fechaInicio) {
            fechaFin = undefined;
          }
        } else if (subactividad.fechaInicio) {
          fechaInicio = startOfDay(new Date(subactividad.fechaInicio));
        } else {
          fechaInicio = startOfDay(new Date(subactividad.fechaCreacion));
        }
        
        // Obtener el color del estado
        let colorEstado = '#3B82F6';
        let nombreEstado = 'Sin estado';
        
        if (subactividad.idEstadoActividad) {
          const estado = this.estadosActividad().find(
            e => (e.idEstadoActividad || e.id) === subactividad.idEstadoActividad
          );
          if (estado) {
            colorEstado = (estado as any).color || '#3B82F6';
            nombreEstado = estado.nombre || nombreEstado;
          }
        }
        
        // Convertir color hex a RGB
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
        
        const evento: CalendarEvent = {
          id: subactividad.idSubactividad,
          start: fechaInicio,
          title: subactividad.nombre || subactividad.nombreSubactividad || 'Sin nombre',
          color: color,
          meta: {
            subactividad: subactividad,
            estado: nombreEstado
          }
        };
        
        if (fechaFin) {
          evento.end = fechaFin;
          evento.allDay = true;
        }
        
        return evento;
      });
    
    this.eventosCalendario.set(eventos);
  }

  eventoClicked(event: { event: CalendarEvent }): void {
    const subactividad = (event.event.meta as any)?.subactividad;
    if (subactividad && subactividad.idSubactividad) {
      this.navigateToDetail(subactividad.idSubactividad);
    }
  }

  cambiarMes(direccion: 'anterior' | 'siguiente'): void {
    if (direccion === 'anterior') {
      this.viewDate = subMonths(this.viewDate, 1);
    } else {
      this.viewDate = addMonths(this.viewDate, 1);
    }
  }

  irAHoy(): void {
    this.viewDate = new Date();
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/subactividades', id]);
  }

  navigateToCrearEvidencia(subactividad: Subactividad): void {
    // Obtener la actividad asociada para pasar los tipos de evidencia y el idActividad
    if (subactividad.idActividad) {
      this.actividadesService.getById(subactividad.idActividad).subscribe({
        next: (actividad) => {
          const subactividadConTipos = {
            ...subactividad,
            idTipoEvidencias: actividad.idTipoEvidencias || []
          };
          this.subactividadParaEvidencia.set(subactividadConTipos);
          this.showEvidenciaModal.set(true);
        },
        error: (err) => {
          console.error('Error al obtener actividad:', err);
          this.subactividadParaEvidencia.set(subactividad);
          this.showEvidenciaModal.set(true);
        }
      });
    } else {
      this.subactividadParaEvidencia.set(subactividad);
      this.showEvidenciaModal.set(true);
    }
  }

  cerrarEvidenciaModal(): void {
    this.showEvidenciaModal.set(false);
    this.subactividadParaEvidencia.set(null);
  }

  onEvidenciaCreada(): void {
    this.cerrarEvidenciaModal();
    this.loadSubactividades();
  }

  toggleDropdownSubactividad(): void {
    this.mostrarDropdownSubactividad.set(!this.mostrarDropdownSubactividad());
  }

  seleccionarTipoSubactividad(tipo: 'anual' | 'mensual' | 'planificada' | 'no-planificada'): void {
    this.mostrarDropdownSubactividad.set(false);
    
    // Navegar a la ruta de nueva subactividad con el tipo como query param
    this.router.navigate(['/subactividades/nueva'], {
      queryParams: { tipo: tipo }
    });
  }

  navigateToCreate(): void {
    this.mostrarDropdownSubactividad.set(false);
    this.router.navigate(['/subactividades/nueva']);
  }

  onFiltroChange(): void {
    this.loadSubactividades();
  }

  clearFilters(): void {
    this.filtroActividad.set(null);
    this.filtroTipo.set(null);
    this.filtroActivo.set(null);
    this.terminoBusqueda.set('');
    this.loadSubactividades();
  }

  obtenerEstadoParaMostrar(subactividad: Subactividad): { nombre: string; id?: number; color?: string } {
    // Buscar estado por ID
    if (subactividad.idEstadoActividad) {
      const estado = this.estadosActividad().find(
        e => (e.idEstadoActividad || e.id) === subactividad.idEstadoActividad
      );
      if (estado) {
        return {
          nombre: estado.nombre || 'Sin estado',
          id: subactividad.idEstadoActividad,
          color: (estado as any).color || '#3B82F6'
        };
      }
    }

    if (subactividad.idEstadoActividad) {
      const estado = this.estadosActividad().find(
        e => (e.idEstadoActividad || e.id) === subactividad.idEstadoActividad
      );
      if (estado) {
        return {
          nombre: estado.nombre || 'Sin estado',
          id: subactividad.idEstadoActividad,
          color: (estado as any).color || '#3B82F6'
        };
      }
    }

    return { nombre: 'Sin estado', color: '#3B82F6' };
  }

  getColoresBadgeEstado(colorEstado: string): { fondo: string; texto: string; borde: string; punto: string } {
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
      const fondo = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
      const texto = colorEstado;
      const borde = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
      const punto = colorEstado;
      return { fondo, texto, borde, punto };
    }

    return { fondo: '#d1fae5', texto: '#10b981', borde: '#a7f3d0', punto: '#10b981' };
  }

  getEstadoColor(estado: any): string {
    return estado?.color || estado?.Color || '#3B82F6';
  }

  attachEventListeners(): void {
    // Attach hover listeners para tooltips del calendario
    const eventElements = this.elementRef.nativeElement.querySelectorAll('.cal-event');
    eventElements.forEach((el: HTMLElement) => {
      el.addEventListener('mouseenter', (e) => {
        const eventId = el.getAttribute('data-event-id');
        if (eventId) {
          const evento = this.eventosCalendario().find(ev => String(ev.id) === eventId);
          if (evento) {
            this.eventoHovered = evento;
            this.hoverPosition.set({ x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY });
          }
        }
      });
      
      el.addEventListener('mouseleave', () => {
        this.eventoHovered = null;
        this.hoverPosition.set(null);
      });
    });
  }

  onEventMouseLeave(): void {
    this.eventoHovered = null;
    this.hoverPosition.set(null);
  }

  getTooltipLeft(): number {
    const pos = this.hoverPosition();
    if (!pos) return 0;
    return pos.x + 10;
  }

  getTooltipTop(): number {
    const pos = this.hoverPosition();
    if (!pos) return 0;
    return pos.y + 10;
  }

  getTiposEvidenciaDeSubactividad(): number[] | null {
    const subactividad = this.subactividadParaEvidencia();
    if (!subactividad) return null;
    
    const tipos: any = (subactividad as any).idTipoEvidencias;
    
    if (tipos === undefined || tipos === null) return null;
    
    if (typeof tipos === 'string' && tipos.trim() !== '') {
      try {
        const parsed = JSON.parse(tipos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
        }
      } catch (e) {
        console.warn('Error parseando tipos de evidencia:', e);
      }
    }
    
    if (Array.isArray(tipos) && tipos.length > 0) {
      return tipos.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);
    }
    
    return null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-subactividad')) {
      this.mostrarDropdownSubactividad.set(false);
    }
  }
}
