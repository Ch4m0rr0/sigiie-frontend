import { Component, inject, OnInit, AfterViewInit, OnDestroy, signal, computed, effect, HostListener, ElementRef, NgZone } from '@angular/core';
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
    // Asegurar que el código siempre se muestre
    const codigo = event.meta?.codigoSubactividad || event.meta?.codigoActividad;
    const title = event.title || '';
    
    // Log para depuración
    console.log('🎨 [CustomCalendarEventTitleFormatter] Formateando título:', {
      codigo: codigo,
      titleOriginal: title,
      meta: event.meta
    });
    
    // Si el título ya incluye el código, retornarlo tal cual
    if (codigo && title.includes(codigo)) {
      console.log('✅ [CustomCalendarEventTitleFormatter] Título ya incluye código:', title);
      return title;
    }
    
    // Si hay código pero no está en el título, agregarlo
    if (codigo && !title.includes(codigo)) {
      const nombre = title || event.meta?.subactividad?.nombre || event.meta?.actividad?.nombre || 'Sin nombre';
      const nuevoTitle = `${codigo} - ${nombre}`;
      console.log('🔧 [CustomCalendarEventTitleFormatter] Agregando código al título:', nuevoTitle);
      return nuevoTitle;
    }
    
    console.log('⚠️ [CustomCalendarEventTitleFormatter] Sin código, retornando título original:', title);
    return title;
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
  private ngZone = inject(NgZone);

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
    console.log('📅 [Subactividades Calendar] Actualizando eventos con', subactividades.length, 'subactividades');
    subactividades.forEach(s => {
      console.log('  - Subactividad:', {
        id: s.idSubactividad,
        codigoSubactividad: s.codigoSubactividad,
        nombre: s.nombre
      });
    });
    
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
        
        // Obtener el código de la subactividad
        const codigo = subactividad.codigoSubactividad || '';
        const nombre = subactividad.nombre || subactividad.nombreSubactividad || 'Sin nombre';
        
        // Log para verificar que el código esté disponible
        console.log('📅 [Subactividades Calendar] Procesando subactividad:', {
          idSubactividad: subactividad.idSubactividad,
          codigoSubactividad: subactividad.codigoSubactividad,
          nombre: nombre,
          codigo: codigo
        });
        
        let title = codigo ? `${codigo} - ${nombre}` : nombre;
        
        // Agregar información de duración si es un evento de varios días
        if (fechaFin) {
          const diasDuracion = differenceInDays(fechaFin, fechaInicio) + 1;
          if (diasDuracion > 1) {
            title = `${title} (${diasDuracion} días)`;
          }
        }
        
        // Log del título final
        console.log('📅 [Subactividades Calendar] Título final del evento:', {
          idSubactividad: subactividad.idSubactividad,
          codigo: codigo,
          nombre: nombre,
          title: title
        });
        
        const evento: CalendarEvent = {
          id: subactividad.idSubactividad,
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
    
    // Log para verificar los eventos con código
    const eventosConCodigo = eventos.filter(e => e.meta?.codigoSubactividad || e.title?.includes(' - '));
    console.log('📅 [Subactividades Calendar] Eventos con código:', eventosConCodigo.length, 'de', eventos.length);
    eventosConCodigo.forEach(e => {
      console.log('  - Evento:', {
        id: e.id,
        title: e.title,
        codigo: e.meta?.codigoSubactividad
      });
    });
    
    this.eventosCalendario.set(eventos);
    
    // Forzar actualización del calendario después de establecer los eventos
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarBadgesCodigo();
      
      // Verificar que los títulos se muestren correctamente en el DOM
      const eventElements = this.elementRef.nativeElement.querySelectorAll('.cal-event-title');
      console.log('📅 [Subactividades Calendar] Verificando títulos en el DOM:', eventElements.length, 'elementos encontrados');
      eventElements.forEach((el: HTMLElement, index: number) => {
        const texto = el.textContent || el.innerText || '';
        console.log(`  - Título ${index + 1} en DOM:`, texto);
      });
      
      // Forzar detección de cambios para asegurar que el calendario se actualice
      if (this.modoVista() === 'calendario') {
        // El calendario debería actualizarse automáticamente con el signal
        // pero forzamos una actualización adicional
        const eventosActuales = this.eventosCalendario();
        this.eventosCalendario.set([...eventosActuales]);
      }
    }, 500);
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
    // Agregar badges después de cambiar el mes
    setTimeout(() => {
      this.agregarBadgesCodigo();
    }, 500);
  }

  irAHoy(): void {
    this.viewDate = new Date();
    // Agregar badges después de cambiar la fecha
    setTimeout(() => {
      this.agregarBadgesCodigo();
    }, 500);
  }

  agregarBadgesCodigo(): void {
    // Optimización CLS: Diferir toda la manipulación del DOM usando requestAnimationFrame
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        // Primero limpiar todos los badges existentes
        this.limpiarBadgesExistentes();
        
        // Esperar un frame adicional para que el layout se estabilice después de limpiar
        requestAnimationFrame(() => {
          const dayCells = this.obtenerCeldasCalendario();
          if (!dayCells || dayCells.length === 0) {
            // Si no hay celdas, reintentar después de un frame adicional
            requestAnimationFrame(() => {
              const retryCells = this.obtenerCeldasCalendario();
              if (retryCells && retryCells.length > 0) {
                this.agregarBadgesCodigoEnCeldas(retryCells);
              }
            });
            return;
          }
          this.agregarBadgesCodigoEnCeldas(dayCells);
        });
      });
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

  private obtenerCeldasCalendario(): NodeListOf<HTMLElement> | null {
    // Intentar múltiples selectores para encontrar las celdas
    const selectors = [
      '.cal-month-view .cal-day-cell',
      'mwl-calendar-month-view .cal-day-cell',
      '.cal-cell',
      '[class*="cal-day-cell"]'
    ];
    
    for (const selector of selectors) {
      const dayCells = this.elementRef.nativeElement.querySelectorAll(selector) as NodeListOf<HTMLElement>;
      if (dayCells && dayCells.length > 0) return dayCells;
    }
    return null;
  }

  private obtenerFechaDeCelda(cell: HTMLElement): Date | null {
    try {
      const dayNumberEl = cell.querySelector('.cal-day-number');
      if (!dayNumberEl) return null;
      
      const dayText = dayNumberEl.textContent?.trim();
      if (!dayText) return null;
      
      const dayNumber = parseInt(dayText, 10);
      if (isNaN(dayNumber)) return null;
      
      // Obtener el mes y año del viewDate
      const year = this.viewDate.getFullYear();
      const month = this.viewDate.getMonth();
      
      return new Date(year, month, dayNumber);
    } catch (e) {
      return null;
    }
  }

  private agregarBadgesCodigoEnCeldas(dayCells: NodeListOf<HTMLElement>): void {
    const eventos = this.eventosCalendario();
    if (eventos.length === 0) return;
    
    // Optimización CLS: Usar requestAnimationFrame para agregar todos los badges en un solo frame
    requestAnimationFrame(() => {
      this.agregarBadgesCodigoEnCeldasSync(dayCells, eventos);
    });
  }
  
  private agregarBadgesCodigoEnCeldasSync(dayCells: NodeListOf<HTMLElement>, eventos: CalendarEvent[]): void {
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
      
      // Obtener el código de la subactividad
      let codigo: string | undefined = meta?.codigoSubactividad || meta?.subactividad?.codigoSubactividad;
      
      // Si no hay código, intentar extraerlo del título (formato: "CODIGO - Nombre")
      if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
        const tituloMatch = evento.title.match(/^([A-Z0-9]+(?:-[A-Z0-9]+)*-\d{4}(?:-[A-Z]+)?)\s*-\s*/);
        if (tituloMatch && tituloMatch[1]) {
          codigo = tituloMatch[1];
        } else {
          // Si no hay código, saltar este evento
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
              // Ya estamos dentro de requestAnimationFrame, agregar directamente
              this.agregarBadgeAElementoSync(eventoEncontrado, codigo, evento.id);
            }
          }
        }
      });
    });
  }

  private agregarBadgeAElementoSync(eventEl: HTMLElement, codigo: string, eventoId?: string | number): void {
    if (!eventEl.parentNode) return;
    
    // Verificar si ya existe un badge con este código
    const existingBadge = eventEl.querySelector('.activity-code-badge-inline');
    if (existingBadge) {
      const codigoExistente = existingBadge.textContent?.trim();
      if (codigoExistente === codigo) {
        if (eventoId) {
          eventEl.setAttribute('data-event-id', String(eventoId));
        }
        return;
      }
      try {
        existingBadge.remove();
      } catch (e) {
        console.warn('No se pudo remover el badge existente:', e);
      }
    }
    
    const titleElement = eventEl.querySelector('.cal-event-title') as HTMLElement;
    
    const badge = document.createElement('span');
    badge.className = 'activity-code-badge-inline';
    // Optimización CLS: Usar will-change y transform para forzar composición de capas y evitar layout shifts
    badge.style.cssText = 'margin-left: 0.5rem; padding: 0.125rem 0.375rem; font-size: 0.625rem; font-family: monospace; font-weight: 600; background-color: rgba(255, 255, 255, 0.9); color: #334155; border-radius: 0.25rem; border: 1px solid rgba(203, 213, 225, 0.8); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); white-space: nowrap; display: inline-block; vertical-align: middle; will-change: transform; transform: translateZ(0); contain: layout style paint;';
    badge.textContent = codigo;
    badge.title = `Código: ${codigo}`;
    
    try {
      if (titleElement && titleElement.parentNode) {
        titleElement.appendChild(badge);
      } else if (eventEl.parentNode) {
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
