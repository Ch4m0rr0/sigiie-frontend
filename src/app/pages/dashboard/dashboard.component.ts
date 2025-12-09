import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, inject, signal, computed, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { IconComponent } from '../../shared/icon/icon.component';
import { ChartComponent, ChartData, ChartConfig } from '../../shared/chart/chart.component';
import { ReportesService } from '../../core/services/reportes.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { ParticipacionService } from '../../core/services/participacion.service';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { IndicadorService } from '../../core/services/indicador.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Indicador } from '../../core/models/indicador';
import type { ActividadIndicador } from '../../core/models/indicador';
import type { Actividad } from '../../core/models/actividad';
import { CalendarEvent, CalendarView } from 'angular-calendar';
import { CalendarModule, CalendarUtils, CalendarDateFormatter, CalendarA11y, CalendarEventTitleFormatter, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { es } from 'date-fns/locale';
import { format, startOfDay, endOfDay, differenceInDays } from 'date-fns';

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
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, IconComponent, ChartComponent, TitleCasePipe, CalendarModule],
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
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private reportesService = inject(ReportesService);
  private actividadesService = inject(ActividadesService);
  private participacionService = inject(ParticipacionService);
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private dashboardService = inject(DashboardService);
  private indicadorService = inject(IndicadorService);
  private catalogosService = inject(CatalogosService);
  private elementRef = inject(ElementRef);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  // Estadísticas básicas
  totalActividades = signal(0);
  totalParticipaciones = signal(0);
  totalEvidencias = signal(0);
  totalSubactividades = signal(0);

  // Datos del dashboard desde API
  resumenGeneral = signal<any>(null);
  datosTendencia = signal<any>(null);
  vistaEspecialMetricas = signal<any>(null);
  vistaEspecialRendimiento = signal<any>(null);

  // Datos de cumplimiento de indicadores
  indicadoresCumplimiento = signal<IndicadorCumplimiento[]>([]);
  loadingIndicadores = signal(false);
  mostrarCumplimientoIndicadores = signal(false);
  
  // Tipo de ordenamiento actual
  tipoOrdenamiento = signal<'cumplimiento-desc' | 'cumplimiento-asc' | 'codigo-asc' | 'codigo-desc'>('cumplimiento-asc');
  
  // Indicadores ordenados según el filtro seleccionado
  indicadoresOrdenados = computed(() => {
    const indicadores = this.indicadoresCumplimiento();
    const orden = this.tipoOrdenamiento();
    
    const copia = [...indicadores];
    
    switch (orden) {
      case 'cumplimiento-desc':
        // De más cumplidos a menos cumplidos
        return copia.sort((a, b) => b.porcentajeCumplimiento - a.porcentajeCumplimiento);
      
      case 'cumplimiento-asc':
        // De menos cumplidos a más cumplidos
        return copia.sort((a, b) => a.porcentajeCumplimiento - b.porcentajeCumplimiento);
      
      case 'codigo-asc':
        // Por código ascendente (6.1.1, 6.1.2, etc.)
        return copia.sort((a, b) => {
          const codigoA = a.indicador.codigo || '';
          const codigoB = b.indicador.codigo || '';
          return this.compararCodigos(codigoA, codigoB);
        });
      
      case 'codigo-desc':
        // Por código descendente (6.1.2, 6.1.1, etc.)
        return copia.sort((a, b) => {
          const codigoA = a.indicador.codigo || '';
          const codigoB = b.indicador.codigo || '';
          return this.compararCodigos(codigoB, codigoA);
        });
      
      default:
        return copia;
    }
  });
  
  // Cache para datos y configuraciones de gráficas (evita recreación innecesaria)
  private chartDataCache = new Map<number, ChartData>();
  private chartConfigCache = new Map<number, ChartConfig>();

  // Actividades de este mes
  actividadesEsteMes = signal<Actividad[]>([]);
  loadingActividadesMes = signal(false);
  mostrarActividadesMes = signal(false);

  loading = signal(true);

  // Calendario
  viewDate: Date = new Date();
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  locale: string = 'es';
  eventosCalendario = signal<CalendarEvent[]>([]);
  estadosActividad = signal<any[]>([]);

  // Hover para tooltip
  eventoHovered: CalendarEvent | null = null;
  hoverPosition = signal<{ x: number; y: number } | null>(null);
  hoverTimeout: any = null;

  ngOnInit() {
    this.loadEstadisticas();
    this.loadDashboardData();
    this.loadCumplimientoIndicadores();
    this.loadActividadesEsteMes();
    this.loadEstadosActividad();
    this.loadEventosCalendario();
  }

  ngAfterViewInit(): void {
    // Agregar listeners a los eventos del calendario después de que se rendericen
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

  // Cargar eventos del calendario desde todas las actividades
  // El calendario de angular-calendar automáticamente filtra los eventos por el mes visible
  loadEventosCalendario(): void {
    // Cargar todas las actividades (sin filtros de fecha)
    // El calendario de angular-calendar automáticamente mostrará solo las que corresponden al mes visible
    this.actividadesService.getAll().subscribe({
      next: (actividades) => {
        console.log(`📅 Cargando todas las actividades para el calendario: ${actividades.length} actividades encontradas`);
        this.actualizarEventosCalendario(actividades);
      },
      error: (error) => {
        console.warn('⚠️ Error cargando actividades para el calendario:', error);
        this.eventosCalendario.set([]);
      }
    });
  }

  // Actualizar eventos del calendario
  actualizarEventosCalendario(actividades: Actividad[]): void {
    const eventos: CalendarEvent[] = actividades
      .filter(actividad => actividad.fechaInicio || actividad.fechaEvento || actividad.fechaCreacion)
      .map(actividad => {
        let fechaInicio: Date;
        let fechaFin: Date | undefined;
        
        if (actividad.fechaInicio && actividad.fechaFin) {
          fechaInicio = startOfDay(new Date(actividad.fechaInicio));
          fechaFin = endOfDay(new Date(actividad.fechaFin));
          if (fechaFin < fechaInicio) {
            fechaFin = undefined;
          }
        } else if (actividad.fechaInicio) {
          fechaInicio = startOfDay(new Date(actividad.fechaInicio));
        } else if (actividad.fechaEvento) {
          fechaInicio = startOfDay(new Date(actividad.fechaEvento));
        } else {
          fechaInicio = startOfDay(new Date(actividad.fechaCreacion));
        }
        
        // Obtener el color del estado de la actividad
        let colorEstado = '#3B82F6'; // Color por defecto (azul)
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
        
        // Convertir color hex a RGB para crear variaciones más claras
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
        // Crear un color secundario más claro (background) basado en el color del estado
        const colorSecondary = rgb 
          ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
          : '#d1fae5'; // fallback a emerald claro
        
        const color = {
          primary: colorPrimary,
          secondary: colorSecondary
        };
        
        // Construir el título con código y nombre
        const codigo = actividad.codigoActividad || '';
        const nombre = actividad.nombre || actividad.nombreActividad || 'Sin nombre';
        let title = codigo ? `${codigo} - ${nombre}` : nombre;
        
        // Agregar información de duración si es un evento de varios días
        if (fechaFin) {
          const diasDuracion = differenceInDays(fechaFin, fechaInicio) + 1;
          if (diasDuracion > 1) {
            title = `${title} (${diasDuracion} días)`;
          }
        }
        
        const evento: CalendarEvent = {
          id: actividad.id,
          start: fechaInicio,
          title: title,
          color: color,
          meta: {
            actividad: actividad,
            estado: nombreEstado,
            codigoActividad: actividad.codigoActividad // Guardar código por separado para estilos
          }
        };
        
        if (fechaFin) {
          evento.end = fechaFin;
          evento.allDay = true;
        }
        
        return evento;
      });
    
    this.eventosCalendario.set(eventos);
    
    // Re-attach listeners después de actualizar eventos y agregar badges de código
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
    // No necesitamos recargar actividades, el calendario las filtra automáticamente
    // Solo actualizar los badges y estilos después de que el calendario se actualice
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  irAHoy(): void {
    this.viewDate = new Date();
    // No necesitamos recargar actividades, el calendario las filtra automáticamente
    // Solo actualizar los badges y estilos después de que el calendario se actualice
    setTimeout(() => {
      this.attachEventListeners();
      this.agregarPuntosColorEstado();
      this.agregarBadgesCodigo();
      this.agregarSombreadoRangos();
    }, 500);
  }

  eventoClicked({ event }: { event: CalendarEvent }): void {
    if (event.meta && event.meta.actividad) {
      // Navegar a la actividad si es necesario
      console.log('Evento clickeado:', event.meta.actividad);
    }
  }

  loadDashboardData(): void {
    // Cargar resumen general
    this.dashboardService.getResumenGeneral().subscribe({
      next: (data) => {
        console.log('✅ Resumen general del dashboard:', data);
        this.resumenGeneral.set(data);
        // Si el resumen general tiene estadísticas, actualizar las señales
        if (data) {
          if (data.totalActividades !== undefined) {
            this.totalActividades.set(data.totalActividades);
          }
          if (data.totalParticipaciones !== undefined) {
            this.totalParticipaciones.set(data.totalParticipaciones);
          }
          if (data.totalEvidencias !== undefined) {
            this.totalEvidencias.set(data.totalEvidencias);
          }
          if (data.totalSubactividades !== undefined) {
            this.totalSubactividades.set(data.totalSubactividades);
          }
        }
      },
      error: (error) => {
        console.warn('⚠️ Error cargando resumen general del dashboard:', error);
      }
    });

    // Cargar datos de tendencia
    this.dashboardService.getDatosTendencia().subscribe({
      next: (data) => {
        console.log('✅ Datos de tendencia:', data);
        this.datosTendencia.set(data);
        // Procesar datos de tendencia para gráficos
        this.procesarDatosTendencia(data);
      },
      error: (error) => {
        console.warn('⚠️ Error cargando datos de tendencia:', error);
      }
    });

    // Cargar vista especial de métricas
    this.dashboardService.getVistaEspecialMetricas().subscribe({
      next: (data) => {
        console.log('✅ Vista especial métricas:', data);
        this.vistaEspecialMetricas.set(data);
      },
      error: (error) => {
        console.warn('⚠️ Error cargando vista especial métricas:', error);
      }
    });

    // Cargar vista especial de rendimiento
    this.dashboardService.getVistaEspecialRendimiento().subscribe({
      next: (data) => {
        console.log('✅ Vista especial rendimiento:', data);
        this.vistaEspecialRendimiento.set(data);
      },
      error: (error) => {
        console.warn('⚠️ Error cargando vista especial rendimiento:', error);
      }
    });
  }

  procesarDatosTendencia(data: any): void {
    if (!data) return;

    // Procesar datos para gráfico de progreso (línea)
    if (data.progresoAnual || data.progresoPorMes) {
      const datosProgreso = data.progresoAnual || data.progresoPorMes || [];
      if (datosProgreso.length > 0) {
        this.progressChartData = {
          labels: datosProgreso.map((item: any) => item.mes || item.periodo || item.label),
          datasets: [{
            label: 'Progreso',
            data: datosProgreso.map((item: any) => item.valor || item.total || item.count),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }]
        };
      }
    }

    // Procesar datos para gráfico de actividades por mes (barras)
    if (data.actividadesPorMes) {
      const actividades = data.actividadesPorMes;
      if (actividades.length > 0) {
        this.activitiesChartData = {
          labels: actividades.map((item: any) => item.mes || item.periodo || item.label),
          datasets: [{
            label: 'Actividades',
            data: actividades.map((item: any) => item.total || item.count || item.valor),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1
          }]
        };
      }
    }

    // Procesar datos para gráfico de distribución de usuarios (pastel)
    if (data.distribucionUsuarios || data.usuariosPorTipo) {
      const usuarios = data.distribucionUsuarios || data.usuariosPorTipo || [];
      if (usuarios.length > 0) {
        const colors = [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ];
        this.usersChartData = {
          labels: usuarios.map((item: any) => item.tipo || item.categoria || item.label),
          datasets: [{
            label: 'Usuarios',
            data: usuarios.map((item: any) => item.total || item.count || item.valor),
            backgroundColor: colors.slice(0, usuarios.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        };
      }
    }
  }
  // Datos para gráfico de progreso de proyectos (línea)
  progressChartData: ChartData | null = null;
  progressChartConfig: ChartConfig = {
    title: 'Progreso de Proyectos',
    type: 'line',
    height: 300,
    responsive: true,
    maintainAspectRatio: false
  };

  // Datos para gráfico de actividades por mes (barras)
  activitiesChartData: ChartData | null = null;
  activitiesChartConfig: ChartConfig = {
    title: 'Actividades por Mes',
    type: 'bar',
    height: 250,
    responsive: true,
    maintainAspectRatio: false
  };

  // Datos para gráfico de distribución de usuarios (pastel)
  usersChartData: ChartData | null = null;
  usersChartConfig: ChartConfig = {
    title: 'Distribución de Usuarios',
    type: 'pie',
    height: 400,
    responsive: true,
    maintainAspectRatio: true
  };

  // Datos para gráfico de estado de proyectos (dona)
  projectsStatusData: ChartData | null = null;
  projectsStatusConfig: ChartConfig = {
    title: 'Estado de Proyectos',
    type: 'doughnut',
    height: 250,
    responsive: true,
    maintainAspectRatio: false
  };

  loadEstadisticas(): void {
    this.loading.set(true);
    
    // Cargar conteos en paralelo con mejor manejo de errores
    Promise.all([
      firstValueFrom(this.actividadesService.list())
        .then(data => {
          const count = data?.length || 0;
          console.log('✅ Actividades cargadas:', count);
          return count;
        })
        .catch(error => {
          console.warn('⚠️ Error cargando actividades:', error);
          return 0;
        }),
      firstValueFrom(this.participacionService.getAll())
        .then(data => {
          const count = data?.length || 0;
          console.log('✅ Participaciones cargadas:', count);
          return count;
        })
        .catch(error => {
          console.warn('⚠️ Error cargando participaciones:', error);
          return 0;
        }),
      firstValueFrom(this.evidenciaService.getAll())
        .then(data => {
          const count = data?.length || 0;
          console.log('✅ Evidencias cargadas:', count);
          return count;
        })
        .catch(error => {
          console.warn('⚠️ Error cargando evidencias:', error);
          return 0;
        }),
      firstValueFrom(this.subactividadService.getAll())
        .then(data => {
          const count = data?.length || 0;
          console.log('✅ Subactividades cargadas:', count);
          return count;
        })
        .catch(error => {
          console.warn('⚠️ Error cargando subactividades:', error);
          return 0;
        }),
    ]).then(([actividades, participaciones, evidencias, subactividades]) => {
      this.totalActividades.set(actividades);
      this.totalParticipaciones.set(participaciones);
      this.totalEvidencias.set(evidencias);
      this.totalSubactividades.set(subactividades);
      console.log('📊 Estadísticas del dashboard:', {
        actividades,
        participaciones,
        evidencias,
        subactividades
      });
      this.loading.set(false);
    }).catch(error => {
      console.error('❌ Error general cargando estadísticas:', error);
      this.loading.set(false);
    });
  }

  private generateSampleData() {
    // NOTA: Este método está comentado para no mostrar datos de prueba
    // Solo usar cuando se tengan datos reales del backend para los gráficos
    // Por ahora, los gráficos no se mostrarán hasta que haya datos reales
    
    // Los gráficos se pueden poblar con datos reales cuando estén disponibles
    // desde el backend o calculados desde los datos reales cargados
    this.progressChartData = null;
    this.activitiesChartData = null;
    this.usersChartData = null;
    this.projectsStatusData = null;
  }

  // Métodos helper para el template
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Exponer Math para usar en el template
  Math = Math;

  // Toggle para mostrar/ocultar cumplimiento de indicadores
  toggleCumplimientoIndicadores(): void {
    this.mostrarCumplimientoIndicadores.update(value => !value);
  }

  // Obtener todas las propiedades de métricas para mostrar
  getMetricasKeys(obj: any): Array<{key: string, value: any}> {
    if (!obj) return [];
    const keys: Array<{key: string, value: any}> = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && key !== 'metricas' && typeof obj[key] !== 'object') {
        keys.push({ key, value: obj[key] });
      }
    }
    return keys;
  }

  // Cargar cumplimiento de indicadores
  loadCumplimientoIndicadores(): void {
    this.loadingIndicadores.set(true);
    
    // Obtener todos los indicadores
    this.indicadorService.getAll().subscribe({
      next: (indicadores) => {
        // Filtrar solo indicadores activos con meta definida
        const indicadoresConMeta = indicadores.filter(ind => 
          ind.activo && ind.meta !== undefined && ind.meta !== null && ind.meta > 0
        );

        if (indicadoresConMeta.length === 0) {
          this.indicadoresCumplimiento.set([]);
          this.loadingIndicadores.set(false);
          return;
        }

        // Para cada indicador, obtener sus actividades y calcular el progreso
        // Usar el filtro IdIndicador para obtener solo las actividades relacionadas
        const requests = indicadoresConMeta.map(indicador => 
          this.actividadesService.getAll({ IdIndicador: indicador.idIndicador }).pipe(
            map(actividades => {
              // Las actividades ya vienen filtradas por indicador desde el backend
              const actividadesRelacionadas = actividades || [];

              // Determinar si el indicador mide número de actividades o cantidad acumulada
              // Si la unidad de medida contiene "actividad" o es null/undefined/vacía, 
              // probablemente mide número de actividades
              const unidadMedida = (indicador.unidadMedida || '').toLowerCase().trim();
              const mideNumeroActividades = unidadMedida.includes('actividad') || 
                                           unidadMedida === '' || 
                                           !indicador.unidadMedida ||
                                           unidadMedida === 'actividades' ||
                                           unidadMedida === 'actividad';

              let metaAlcanzadaTotal = 0;
              let totalActividades = actividadesRelacionadas.length;
              let porcentajeCumplimiento = 0;
              const meta = indicador.meta || 0;

              if (mideNumeroActividades) {
                // Si mide número de actividades, el cumplimiento es: totalActividades / meta
                metaAlcanzadaTotal = totalActividades;
                porcentajeCumplimiento = meta > 0 
                  ? Math.min((totalActividades / meta) * 100, 100) 
                  : 0;
                
                console.log(`📊 Indicador "${indicador.nombre}": Mide número de actividades. Total: ${totalActividades}, Meta: ${meta}, Porcentaje: ${porcentajeCumplimiento.toFixed(2)}%`);
              } else {
                // Si mide cantidad acumulada, sumar metaAlcanzada de todas las actividades
                actividadesRelacionadas.forEach(act => {
                  if (act.metaAlcanzada !== undefined && act.metaAlcanzada !== null) {
                    metaAlcanzadaTotal += act.metaAlcanzada;
                  }
                });

                // Calcular porcentaje de cumplimiento
                porcentajeCumplimiento = meta > 0 
                  ? Math.min((metaAlcanzadaTotal / meta) * 100, 100) 
                  : 0;
                
                console.log(`📊 Indicador "${indicador.nombre}": Mide cantidad acumulada. Alcanzado: ${metaAlcanzadaTotal}, Meta: ${meta}, Porcentaje: ${porcentajeCumplimiento.toFixed(2)}%`);
              }

              return {
                indicador,
                meta,
                metaAlcanzada: metaAlcanzadaTotal,
                porcentajeCumplimiento,
                totalActividades,
                actividadesRelacionadas,
                mideNumeroActividades
              } as IndicadorCumplimiento;
            })
          )
        );

        forkJoin(requests).subscribe({
          next: (resultados) => {
            // Ordenar por porcentaje de cumplimiento (menor a mayor para ver los que necesitan atención)
            const ordenados = resultados.sort((a, b) => 
              a.porcentajeCumplimiento - b.porcentajeCumplimiento
            );
            this.indicadoresCumplimiento.set(ordenados);
            // Limpiar cache de gráficas cuando se actualizan los datos
            this.chartDataCache.clear();
            this.chartConfigCache.clear();
            this.loadingIndicadores.set(false);
            console.log('✅ Cumplimiento de indicadores cargado:', ordenados);
          },
          error: (error) => {
            console.error('❌ Error calculando cumplimiento de indicadores:', error);
            this.loadingIndicadores.set(false);
          }
        });
      },
      error: (error) => {
        console.error('❌ Error cargando indicadores:', error);
        this.loadingIndicadores.set(false);
      }
    });
  }

  // Generar datos de gráfica para un indicador (con cache para evitar recreación)
  getChartDataForIndicador(cumplimiento: IndicadorCumplimiento): ChartData {
    const id = cumplimiento.indicador.idIndicador;
    const porcentaje = Math.max(0, Math.min(100, cumplimiento.porcentajeCumplimiento || 0));
    
    // Verificar si tenemos datos cacheados y si el porcentaje no ha cambiado
    const cached = this.chartDataCache.get(id);
    if (cached) {
      const cachedPorcentaje = cached.datasets[0].data[0];
      // Si el porcentaje es el mismo (con tolerancia de 0.01), usar cache
      if (Math.abs(cachedPorcentaje - porcentaje) < 0.01) {
        return cached;
      }
    }
    
    // Calcular porcentaje para mostrar (0% se muestra como mínimo para visibilidad)
    let porcentajeParaGrafica = porcentaje;
    if (porcentajeParaGrafica === 0) {
      porcentajeParaGrafica = 0.01;
    }
    
    // Colores simplificados: Verde si cumple (100%), Rojo si no cumple (<100%)
    const cumple = porcentaje >= 100;
    const colorCumplido = cumple ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    const borderColorCumplido = cumple ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)';
    
    // Asegurar que los datos sumen exactamente 100 para la gráfica de pastel
    const dataCumplido = porcentajeParaGrafica;
    const dataPendiente = 100 - dataCumplido;
    
    const chartData: ChartData = {
      labels: ['Cumplido', 'Pendiente'],
      datasets: [{
        label: 'Cumplimiento',
        data: [dataCumplido, dataPendiente],
        backgroundColor: [
          colorCumplido,
          'rgba(226, 232, 240, 0.7)' // Gris claro para pendiente
        ],
        borderColor: [
          borderColorCumplido,
          'rgb(203, 213, 225)' // Gris para pendiente
        ],
        borderWidth: 2
      }]
    };
    
    // Guardar en cache
    this.chartDataCache.set(id, chartData);
    return chartData;
  }

  // Configuración de gráfica para indicadores (con cache para evitar recreación)
  getChartConfigForIndicador(cumplimiento: IndicadorCumplimiento): ChartConfig {
    const id = cumplimiento.indicador.idIndicador;
    
    // Verificar cache
    const cached = this.chartConfigCache.get(id);
    if (cached) {
      return cached;
    }
    
    const unidad = cumplimiento.indicador.unidadMedida || '';
    const mostrarUnidad = unidad && !cumplimiento.mideNumeroActividades;
    
    const config: ChartConfig = {
      title: undefined, // No mostrar título en la gráfica (ya está en el header de la card)
      type: 'doughnut',
      height: 180, // Altura fija para estabilidad
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false, // Ocultar leyenda ya que mostramos el porcentaje destacado arriba
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              if (label === 'Cumplido') {
                const alcanzado = cumplimiento.mideNumeroActividades 
                  ? `${cumplimiento.totalActividades} actividades`
                  : `${cumplimiento.metaAlcanzada.toFixed(0)}${mostrarUnidad ? ' ' + unidad : ''}`;
                const meta = `${cumplimiento.meta.toFixed(0)}${mostrarUnidad ? ' ' + unidad : cumplimiento.mideNumeroActividades ? ' actividades' : ''}`;
                return `${label}: ${value.toFixed(1)}% (${alcanzado} / ${meta})`;
              }
              return `${label}: ${value.toFixed(1)}%`;
            }
          }
        }
      }
    };
    
    // Guardar en cache
    this.chartConfigCache.set(id, config);
    return config;
  }
  
  // TrackBy para el @for de indicadores (evita recreación innecesaria)
  trackByIndicadorId(index: number, cumplimiento: IndicadorCumplimiento): number {
    return cumplimiento.indicador.idIndicador;
  }

  // Obtener color de estado según porcentaje - Simplificado: Verde si cumple, Rojo si no
  getColorEstadoIndicador(porcentaje: number): string {
    return porcentaje >= 100 ? 'text-emerald-600' : 'text-red-600';
  }

  // Obtener color de fondo según porcentaje - Simplificado: Verde si cumple, Rojo si no
  getEstadoBgColor(porcentaje: number): string {
    return porcentaje >= 100 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200';
  }

  // Comparar códigos de indicadores (ej: "6.1.1" vs "6.1.2")
  private compararCodigos(codigoA: string, codigoB: string): number {
    if (!codigoA && !codigoB) return 0;
    if (!codigoA) return 1;
    if (!codigoB) return -1;
    
    // Dividir los códigos por puntos y comparar numéricamente
    const partesA = codigoA.split('.').map(p => parseInt(p, 10) || 0);
    const partesB = codigoB.split('.').map(p => parseInt(p, 10) || 0);
    
    const maxLongitud = Math.max(partesA.length, partesB.length);
    
    for (let i = 0; i < maxLongitud; i++) {
      const valorA = partesA[i] ?? 0;
      const valorB = partesB[i] ?? 0;
      
      if (valorA < valorB) return -1;
      if (valorA > valorB) return 1;
    }
    
    return 0;
  }

  // Cambiar tipo de ordenamiento
  cambiarOrdenamiento(tipo: 'cumplimiento-desc' | 'cumplimiento-asc' | 'codigo-asc' | 'codigo-desc'): void {
    this.tipoOrdenamiento.set(tipo);
  }

  // Obtener etiqueta del ordenamiento actual
  getEtiquetaOrdenamiento(): string {
    switch (this.tipoOrdenamiento()) {
      case 'cumplimiento-desc':
        return 'Más cumplidos primero';
      case 'cumplimiento-asc':
        return 'Menos cumplidos primero';
      case 'codigo-asc':
        return 'Código: 6.1.1 → 6.1.2';
      case 'codigo-desc':
        return 'Código: 6.1.2 → 6.1.1';
      default:
        return 'Ordenar por...';
    }
  }

  // Cargar actividades de este mes (que inicien o terminen este mes)
  loadActividadesEsteMes(): void {
    this.loadingActividadesMes.set(true);

    // Obtener el primer y último día del mes actual
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = ahora.getMonth() + 1; // getMonth() devuelve 0-11, necesitamos 1-12
    
    // Primer día del mes (inicio del día)
    const primerDia = new Date(año, mes - 1, 1);
    primerDia.setHours(0, 0, 0, 0);
    const primerDiaStr = primerDia.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Último día del mes (fin del día)
    const ultimoDia = new Date(año, mes, 0);
    ultimoDia.setHours(23, 59, 59, 999);
    const ultimoDiaStr = ultimoDia.toISOString().split('T')[0]; // YYYY-MM-DD

    // Cargar actividades que inicien este mes
    const actividadesInicio = this.actividadesService.getAll({
      FechaInicioDesde: primerDiaStr,
      FechaInicioHasta: ultimoDiaStr
    });

    // Cargar actividades que terminen este mes
    const actividadesFin = this.actividadesService.getAll({
      FechaFinDesde: primerDiaStr,
      FechaFinHasta: ultimoDiaStr
    });

    // Combinar ambas consultas y eliminar duplicados usando Map (garantiza una sola card por actividad)
    forkJoin([actividadesInicio, actividadesFin]).subscribe({
      next: ([actividadesInicio, actividadesFin]) => {
        // Usar Map con clave única basada en código de actividad (si existe) o ID
        // Esto garantiza que actividades con el mismo código pero diferentes IDs se traten como la misma
        const actividadesMap = new Map<string, Actividad>();
        const idsProcesados = new Set<number>();
        const codigosProcesados = new Set<string>();

        // Función para verificar si una actividad ya fue procesada
        const esDuplicada = (actividad: Actividad): boolean => {
          const codigo = actividad.codigoActividad?.trim();
          // Si tiene código, verificar por código
          if (codigo && codigosProcesados.has(codigo)) {
            return true;
          }
          // Si no tiene código o el código no está en la lista, verificar por ID
          if (idsProcesados.has(actividad.id)) {
            return true;
          }
          return false;
        };

        // Función para registrar una actividad como procesada
        const registrarActividad = (actividad: Actividad): void => {
          const codigo = actividad.codigoActividad?.trim();
          if (codigo) {
            codigosProcesados.add(codigo);
          }
          idsProcesados.add(actividad.id);
        };

        // Función para generar clave única para el Map
        const generarClave = (actividad: Actividad): string => {
          const codigo = actividad.codigoActividad?.trim();
          return codigo ? `codigo:${codigo}` : `id:${actividad.id}`;
        };

        // Agregar actividades que inician este mes
        actividadesInicio.forEach(actividad => {
          if (actividad && actividad.id) {
            if (!esDuplicada(actividad)) {
              const clave = generarClave(actividad);
              actividadesMap.set(clave, actividad);
              registrarActividad(actividad);
            } else {
              console.log(`⚠️ Actividad duplicada ignorada: "${actividad.nombreActividad}" (ID: ${actividad.id}, Código: ${actividad.codigoActividad || 'N/A'})`);
            }
          }
        });

        // Agregar actividades que terminan este mes
        actividadesFin.forEach(actividad => {
          if (actividad && actividad.id) {
            if (!esDuplicada(actividad)) {
              const clave = generarClave(actividad);
              actividadesMap.set(clave, actividad);
              registrarActividad(actividad);
            } else {
              console.log(`⚠️ Actividad duplicada ignorada: "${actividad.nombreActividad}" (ID: ${actividad.id}, Código: ${actividad.codigoActividad || 'N/A'})`);
            }
          }
        });

        // Filtrar actividades que realmente se solapan con el mes (incluyendo las que cubren todo el mes)
        const actividadesFiltradas = Array.from(actividadesMap.values()).filter(actividad => {
          return this.actividadSeSolapaConMes(actividad, primerDia, ultimoDia);
        });

        // Ordenar por fecha de inicio (más recientes primero)
        actividadesFiltradas.sort((a, b) => {
          const fechaA = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
          const fechaB = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
          return fechaB - fechaA;
        });

        this.actividadesEsteMes.set(actividadesFiltradas);
        this.loadingActividadesMes.set(false);
        console.log(`✅ Actividades de este mes cargadas: ${actividadesFiltradas.length} (sin duplicados)`);
        console.log(`📊 Total actividades procesadas: Inicio: ${actividadesInicio.length}, Fin: ${actividadesFin.length}`);
      },
      error: (error) => {
        console.error('❌ Error cargando actividades de este mes:', error);
        this.actividadesEsteMes.set([]);
        this.loadingActividadesMes.set(false);
      }
    });
  }

  // Verificar si una actividad se solapa con el mes actual
  private actividadSeSolapaConMes(actividad: Actividad, primerDiaMes: Date, ultimoDiaMes: Date): boolean {
    if (!actividad.fechaInicio && !actividad.fechaFin) {
      return false; // Sin fechas, no se puede determinar
    }

    const fechaInicio = actividad.fechaInicio ? new Date(actividad.fechaInicio) : null;
    const fechaFin = actividad.fechaFin ? new Date(actividad.fechaFin) : null;

    // Normalizar fechas (solo día, sin hora)
    const normalizarFecha = (fecha: Date) => {
      const normalizada = new Date(fecha);
      normalizada.setHours(0, 0, 0, 0);
      return normalizada;
    };

    const primerDiaNormalizado = normalizarFecha(primerDiaMes);
    const ultimoDiaNormalizado = normalizarFecha(ultimoDiaMes);

    // Si solo tiene fecha de inicio
    if (fechaInicio && !fechaFin) {
      const fechaInicioNormalizada = normalizarFecha(fechaInicio);
      return fechaInicioNormalizada >= primerDiaNormalizado && fechaInicioNormalizada <= ultimoDiaNormalizado;
    }

    // Si solo tiene fecha de fin
    if (!fechaInicio && fechaFin) {
      const fechaFinNormalizada = normalizarFecha(fechaFin);
      return fechaFinNormalizada >= primerDiaNormalizado && fechaFinNormalizada <= ultimoDiaNormalizado;
    }

    // Si tiene ambas fechas, verificar solapamiento
    if (fechaInicio && fechaFin) {
      const fechaInicioNormalizada = normalizarFecha(fechaInicio);
      const fechaFinNormalizada = normalizarFecha(fechaFin);

      // La actividad se solapa si:
      // - Inicia durante el mes, O
      // - Termina durante el mes, O
      // - Inicia antes del mes Y termina después del mes (cubre todo el mes)
      const iniciaEnMes = fechaInicioNormalizada >= primerDiaNormalizado && fechaInicioNormalizada <= ultimoDiaNormalizado;
      const terminaEnMes = fechaFinNormalizada >= primerDiaNormalizado && fechaFinNormalizada <= ultimoDiaNormalizado;
      const cubreTodoElMes = fechaInicioNormalizada < primerDiaNormalizado && fechaFinNormalizada > ultimoDiaNormalizado;

      return iniciaEnMes || terminaEnMes || cubreTodoElMes;
    }

    return false;
  }

  // Toggle para mostrar/ocultar actividades del mes
  toggleActividadesEsteMes(): void {
    this.mostrarActividadesMes.update(value => !value);
  }

  // Formatear fecha para mostrar
  formatearFecha(fecha?: string): string {
    if (!fecha) return 'Sin fecha';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return fecha;
    }
  }

  // Obtener color según el estado de la actividad
  getColorEstadoActividad(estado?: string): string {
    if (!estado) return 'text-slate-500';
    const estadoLower = estado.toLowerCase();
    
    // Finalizada/Completada → Azul
    if (estadoLower.includes('finaliz') || estadoLower.includes('complet') || estadoLower.includes('terminad')) {
      return 'text-blue-600';
    }
    // En curso/En ejecución → Verde
    if (estadoLower.includes('en curso') || estadoLower.includes('en ejecución') || estadoLower.includes('ejecución') || estadoLower.includes('proceso')) {
      return 'text-emerald-600';
    }
    // Pendiente/Planificada → Ámbar
    if (estadoLower.includes('pendiente') || estadoLower.includes('planific')) {
      return 'text-amber-600';
    }
    return 'text-slate-500';
  }

  // Obtener color de fondo según el estado de la actividad
  getBgColorEstadoActividad(estado?: string): string {
    if (!estado) return 'bg-slate-50 border border-slate-200';
    const estadoLower = estado.toLowerCase();
    
    // Finalizada/Completada → Azul
    if (estadoLower.includes('finaliz') || estadoLower.includes('complet') || estadoLower.includes('terminad')) {
      return 'bg-blue-50 border border-blue-200';
    }
    // En curso/En ejecución → Verde
    if (estadoLower.includes('en curso') || estadoLower.includes('en ejecución') || estadoLower.includes('ejecución') || estadoLower.includes('proceso')) {
      return 'bg-emerald-50 border border-emerald-200';
    }
    // Pendiente/Planificada → Ámbar
    if (estadoLower.includes('pendiente') || estadoLower.includes('planific')) {
      return 'bg-amber-50 border border-amber-200';
    }
    return 'bg-slate-50 border border-slate-200';
  }

  // Obtener estado para mostrar
  obtenerEstadoParaMostrar(actividad: Actividad): { nombre: string; id?: number; color?: string } {
    if (actividad.idEstadoActividad !== null && actividad.idEstadoActividad !== undefined) {
      const estadoGuardado = this.estadosActividad().find(
        e => {
          const estadoId = e.idEstadoActividad || e.id;
          return estadoId !== undefined && Number(estadoId) === Number(actividad.idEstadoActividad);
        }
      );
      
      if (estadoGuardado) {
        return {
          nombre: estadoGuardado.nombre || actividad.nombreEstadoActividad || 'Sin estado',
          id: actividad.idEstadoActividad,
          color: (estadoGuardado as any).color || '#3B82F6'
        };
      }
      
      if (actividad.nombreEstadoActividad) {
        return {
          nombre: actividad.nombreEstadoActividad,
          id: actividad.idEstadoActividad,
          color: '#3B82F6'
        };
      }
    }

    if (actividad.nombreEstadoActividad) {
      return {
        nombre: actividad.nombreEstadoActividad,
        id: actividad.idEstadoActividad,
        color: '#3B82F6'
      };
    }

    return { nombre: 'Sin estado', color: '#3B82F6' };
  }

  getEstadoColor(estado: any): string {
    return estado?.color || estado?.Color || '#3B82F6';
  }

  // Agregar badges de código a los eventos del calendario
  agregarBadgesCodigo(): void {
    this.ngZone.runOutsideAngular(() => {
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
    
    const calMonthView = this.elementRef.nativeElement.querySelector('.cal-month-view');
    if (calMonthView) {
      const dayCells = calMonthView.querySelectorAll('.cal-day-cell') as NodeListOf<HTMLElement>;
      if (dayCells && dayCells.length > 0) return dayCells;
    }
    
    const dayCells = this.elementRef.nativeElement.querySelectorAll('.cal-day-cell') as NodeListOf<HTMLElement>;
    if (dayCells && dayCells.length > 0) return dayCells;
    
    return null;
  }

  private agregarBadgesCodigoEnCeldas(dayCells: NodeListOf<HTMLElement>): void {
    const eventos = this.eventosCalendario();
    
    if (eventos.length === 0) {
      return;
    }
    
    // Crear un mapa de eventos por fecha para manejar múltiples eventos en la misma fecha
    const eventosPorFecha = new Map<string, CalendarEvent[]>();
    eventos.forEach(evento => {
      const eventStart = startOfDay(evento.start);
      const eventEnd = evento.end ? startOfDay(evento.end) : eventStart;
      
      // Agregar el evento a todas las fechas de su rango
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
    
    eventos.forEach((evento, eventoIndex) => {
      // Obtener el código de la actividad
      const meta = evento.meta as any;
      const codigo = meta?.codigoActividad || 
                    meta?.actividad?.codigoActividad ||
                    (meta?.actividad && typeof meta.actividad === 'object' && 'codigoActividad' in meta.actividad ? meta.actividad.codigoActividad : null);
      
      if (!codigo || typeof codigo !== 'string' || codigo.trim() === '') {
        return;
      }
      
      // Buscar la celda del calendario que corresponde a la fecha del evento
      const eventStart = startOfDay(evento.start);
      const eventEnd = evento.end ? startOfDay(evento.end) : eventStart;
      
      // Obtener el color como string
      let evColor: string | undefined;
      if (typeof evento.color === 'string') {
        evColor = evento.color;
      } else if (evento.color && typeof evento.color === 'object' && 'primary' in evento.color) {
        evColor = evento.color.primary;
      }
      
      if (!evColor) {
        return;
      }
      
      // Convertir color a RGB para comparar
      const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const rgb = hexToRgb(evColor);
      if (!rgb) {
        return;
      }
      
      const expectedRgb = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      let elementosEncontrados = 0;
      
      // Buscar en todas las celdas que corresponden a este evento
      dayCells.forEach((cell: HTMLElement) => {
        const cellDate = this.obtenerFechaDeCelda(cell);
        if (!cellDate) return;
        
        const cellDateStart = startOfDay(cellDate);
        
        // Verificar si esta celda contiene el evento
        if (cellDateStart >= eventStart && cellDateStart <= eventEnd) {
          const fechaKey = cellDateStart.toISOString().split('T')[0];
          const eventosEnEstaFecha = eventosPorFecha.get(fechaKey) || [];
          
          // Obtener el índice de este evento en la lista de eventos de esta fecha
          const indiceEnFecha = eventosEnEstaFecha.findIndex(ev => ev.id === evento.id);
          
          // Buscar eventos en esta celda que coincidan con el color
          const eventosEnCelda = Array.from(cell.querySelectorAll('.cal-event')) as HTMLElement[];
          
          // Filtrar eventos que ya tienen badge de este evento específico
          const eventosSinBadge = eventosEnCelda.filter(el => {
            const dataEventId = el.getAttribute('data-event-id');
            const existingBadge = el.querySelector('.activity-code-badge-inline');
            // Si ya tiene badge Y el data-event-id coincide, ya fue procesado
            if (existingBadge && dataEventId === String(evento.id)) {
              return false; // Ya tiene badge de este evento
            }
            return true;
          });
          
          // Buscar eventos que coinciden con el color
          const eventosConMismoColor = eventosSinBadge.filter(el => {
            const computedStyle = window.getComputedStyle(el);
            const backgroundColor = computedStyle.backgroundColor;
            return backgroundColor && (backgroundColor === expectedRgb || backgroundColor.includes(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`));
          });
          
          let eventoEncontrado: HTMLElement | null = null;
          
          if (eventosConMismoColor.length === 1) {
            // Solo hay un evento con este color, debe ser este
            eventoEncontrado = eventosConMismoColor[0];
          } else if (eventosConMismoColor.length > 1) {
            // Hay múltiples eventos con el mismo color, usar el índice
            // Filtrar los que ya tienen data-event-id asignado
            const eventosSinAsignar = eventosConMismoColor.filter(el => !el.getAttribute('data-event-id'));
            
            if (indiceEnFecha >= 0 && indiceEnFecha < eventosSinAsignar.length) {
              // Usar el índice para identificar el evento correcto
              eventoEncontrado = eventosSinAsignar[indiceEnFecha];
            } else if (eventosSinAsignar.length === 1) {
              // Solo hay un evento sin asignar, debe ser este
              eventoEncontrado = eventosSinAsignar[0];
            }
          } else if (eventosSinBadge.length > 0 && indiceEnFecha >= 0) {
            // No hay eventos con el color exacto, pero hay eventos sin badge
            // Usar el índice si está disponible
            const eventosSinAsignar = eventosSinBadge.filter(el => !el.getAttribute('data-event-id'));
            if (indiceEnFecha < eventosSinAsignar.length) {
              eventoEncontrado = eventosSinAsignar[indiceEnFecha];
            }
          }
          
          if (eventoEncontrado) {
            // Verificar que no esté ya asignado a otro evento
            const dataEventId = eventoEncontrado.getAttribute('data-event-id');
            if (dataEventId && dataEventId !== String(evento.id)) {
              // Ya asignado a otro evento, saltar
            } else {
              // Agregar badge y marcar con el ID del evento
              this.agregarBadgeAElemento(eventoEncontrado, codigo, evento.id);
              elementosEncontrados++;
            }
          }
        }
      });
    });
  }

  private agregarBadgeAElemento(eventEl: HTMLElement, codigo: string, eventoId?: string | number): void {
    // Verificar que el elemento aún existe en el DOM
    if (!eventEl.parentNode) {
      return;
    }
    
    const existingBadge = eventEl.querySelector('.activity-code-badge-inline');
    if (existingBadge) {
      try {
        existingBadge.remove();
      } catch (e) {
        console.warn('No se pudo remover el badge existente:', e);
      }
    }
    
    const badge = document.createElement('span');
    badge.className = 'activity-code-badge-inline';
    badge.style.cssText = 'margin-left: 0.5rem; padding: 0.125rem 0.375rem; font-size: 0.625rem; font-family: monospace; font-weight: 600; background-color: rgba(255, 255, 255, 0.9); color: #334155; border-radius: 0.25rem; border: 1px solid rgba(203, 213, 225, 0.8); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); white-space: nowrap; display: inline-block; vertical-align: middle;';
    badge.textContent = codigo;
    badge.title = `Código: ${codigo}`;
    
    try {
      const titleElement = eventEl.querySelector('.cal-event-title') as HTMLElement;
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

  obtenerFechaDeCelda(cell: HTMLElement): Date | null {
    try {
      const dayNumberEl = cell.querySelector('.cal-day-number');
      if (!dayNumberEl) return null;
      
      const dayNumber = parseInt(dayNumberEl.textContent?.trim() || '0', 10);
      if (dayNumber === 0) return null;
      
      const viewDate = this.viewDate;
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      
      const fecha = new Date(year, month, dayNumber);
      return fecha;
    } catch (e) {
      return null;
    }
  }

  attachEventListeners(): void {
    // Usar NgZone para ejecutar fuera del ciclo de detección de cambios de Angular
    this.ngZone.runOutsideAngular(() => {
      // Agregar listeners a eventos
      const eventos = document.querySelectorAll('.cal-month-view .cal-event');
      eventos.forEach((eventoEl) => {
        const eventElement = eventoEl as HTMLElement;
        
        // Verificar si ya tiene listeners agregados
        if (eventElement.hasAttribute('data-listeners-attached')) {
          return; // Ya tiene listeners, no agregar de nuevo
        }
        
        // Marcar como procesado
        eventElement.setAttribute('data-listeners-attached', 'true');
        
        eventElement.addEventListener('mouseenter', (e: Event) => {
          const mouseEvent = e as MouseEvent;
          const target = e.target as HTMLElement;
        
          
          // Cancelar cualquier timeout pendiente de la celda o de otros eventos
          if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
            this.hoverTimeout = null;
          }
          
          // Buscar el elemento del evento (puede ser el target o un padre)
          let eventElementFound: HTMLElement | null = target;
          while (eventElementFound && !eventElementFound.classList.contains('cal-event')) {
            eventElementFound = eventElementFound.parentElement;
          }
          
          if (!eventElementFound) {
            eventElementFound = target;
          }
          
          let evento: CalendarEvent | undefined;
          
          // PRIORIDAD 1: Si el target es el badge, buscar directamente por el código del badge
          if (target.classList.contains('activity-code-badge-inline')) {
            const codigoBadge = target.textContent?.trim() || '';
            if (codigoBadge) {
              evento = this.eventosCalendario().find(ev => {
                const meta = ev.meta as any;
                const codigo = meta?.codigoActividad || meta?.actividad?.codigoActividad;
                return codigo === codigoBadge;
              });
            }
          }
          
          // PRIORIDAD 2: Si no se encontró y hay un badge en el elemento del evento, buscar por código del badge
          if (!evento) {
            const badge = eventElementFound.querySelector('.activity-code-badge-inline');
            if (badge) {
              const codigoBadge = badge.textContent?.trim() || '';
              if (codigoBadge) {
                evento = this.eventosCalendario().find(ev => {
                  const meta = ev.meta as any;
                  const codigo = meta?.codigoActividad || meta?.actividad?.codigoActividad;
                  return codigo === codigoBadge;
                });
              }
            }
          }
          
          // PRIORIDAD 3: Si no se encontró por código, intentar por ID del evento
          if (!evento) {
            const eventId = eventElementFound.getAttribute('data-event-id');
            if (eventId) {
              evento = this.eventosCalendario().find(ev => String(ev.id) === eventId);
            }
          }
          
          // PRIORIDAD 4: Si aún no se encontró, usar el mismo método que actividades: buscar por título
          // Pero primero remover el código del badge del texto
          if (!evento) {
            // Obtener el título sin el badge
            const titleElement = eventElementFound.querySelector('.cal-event-title');
            let titulo = titleElement ? titleElement.textContent?.trim() : eventElementFound.textContent?.trim() || '';
            
            // Remover el código del badge si está en el texto (formato: CODIGO-YYYY)
            titulo = titulo.replace(/[A-Z0-9]+-\d{4}/g, '').trim();
            
            if (titulo) {
              evento = this.eventosCalendario().find(ev => {
                if (ev.title === titulo) return true;
                const actividad = (ev.meta as any)?.actividad;
                if (actividad?.nombre === titulo || actividad?.nombreActividad === titulo) return true;
                if (actividad?.nombre && titulo.includes(actividad.nombre)) return true;
                return false;
              });
            }
          }
          
          if (evento) {
            // Ejecutar dentro de NgZone para actualizar las señales
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
          
          // Verificar si estamos moviendo a otro evento o a la celda
          if (relatedTarget) {
            let checkElement: HTMLElement | null = relatedTarget;
            while (checkElement && !checkElement.classList.contains('cal-event') && !checkElement.classList.contains('cal-day-cell')) {
              checkElement = checkElement.parentElement;
            }
            // Si estamos moviendo a otro evento, no ocultar
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

      // Agregar listeners a las celdas del calendario para mostrar tooltip al hover
      // Solo cuando se hace hover sobre la celda pero NO sobre un evento específico
      const dayCells = this.elementRef.nativeElement.querySelectorAll('.cal-day-cell');
      dayCells.forEach((cell: HTMLElement) => {
        // Verificar si ya tiene listeners agregados
        if (cell.hasAttribute('data-listeners-attached')) {
          return; // Ya tiene listeners, no agregar de nuevo
        }
        
        // Marcar como procesado
        cell.setAttribute('data-listeners-attached', 'true');
        
        cell.addEventListener('mouseenter', (e: MouseEvent) => {
          // Verificar si el hover es sobre un evento específico usando elementFromPoint
          const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
          let eventElementFound: HTMLElement | null = null;
          let isOverBadge = false;
          
          if (elementUnderCursor) {
            // Verificar si estamos sobre un badge
            if (elementUnderCursor.classList.contains('activity-code-badge-inline')) {
              isOverBadge = true;
              eventElementFound = elementUnderCursor as HTMLElement;
              // Buscar el elemento del evento padre
              while (eventElementFound && !eventElementFound.classList.contains('cal-event')) {
                eventElementFound = eventElementFound.parentElement;
              }
            } else {
              eventElementFound = elementUnderCursor as HTMLElement;
              // Buscar si el elemento o algún padre es un evento
              while (eventElementFound && !eventElementFound.classList.contains('cal-event')) {
                eventElementFound = eventElementFound.parentElement;
              }
            }
          }
          
          // Si encontramos un evento o un badge, no hacer nada aquí (el listener del evento ya lo maneja)
          if (isOverBadge || (eventElementFound && eventElementFound.classList.contains('cal-event'))) {
            return;
          }
          
          // Solo si NO estamos sobre un evento, mostrar el primer evento del día
          const cellDate = this.obtenerFechaDeCelda(cell);
          if (!cellDate) return;
          
          const cellDateStart = startOfDay(cellDate);
          const eventos = this.eventosCalendario();
          
          // Buscar eventos que coincidan con esta fecha
          const eventosEnEsteDia = eventos.filter(ev => {
            const eventStart = startOfDay(ev.start);
            const eventEnd = ev.end ? startOfDay(ev.end) : eventStart;
            return cellDateStart >= eventStart && cellDateStart <= eventEnd;
          });
          
          if (eventosEnEsteDia.length > 0) {
            // Mostrar tooltip con información de la primera actividad solo si no hay un evento específico bajo el cursor
            const primerEvento = eventosEnEsteDia[0];
            this.hoverTimeout = setTimeout(() => {
              // Verificar nuevamente que no estamos sobre un evento específico o badge
              const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
              let isOverEvent = false;
              if (elementUnderCursor) {
                // Verificar si estamos sobre un badge
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
              
              // Solo mostrar el primer evento si no estamos sobre un evento específico
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
          // Solo ocultar si no estamos moviendo el mouse a un evento
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (relatedTarget) {
            let checkElement: HTMLElement | null = relatedTarget;
            while (checkElement && !checkElement.classList.contains('cal-event')) {
              checkElement = checkElement.parentElement;
            }
            // Si estamos moviendo a un evento, no ocultar
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
          // Verificar si estamos sobre un evento específico
          const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
          if (elementUnderCursor) {
            let checkElement: HTMLElement | null = elementUnderCursor as HTMLElement;
            while (checkElement && !checkElement.classList.contains('cal-event')) {
              checkElement = checkElement.parentElement;
            }
            // Si estamos sobre un evento, no actualizar desde la celda
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

  onEventMouseLeave(): void {
    if (this.hoverTimeout) {
      clearTimeout(this.hoverTimeout);
    }
    this.eventoHovered = null;
    this.hoverPosition.set(null);
  }

  getTooltipLeft(): number {
    if (!this.hoverPosition()) return 0;
    const tooltipWidth = 320; // Ancho aproximado del tooltip
    const margin = 20;
    const x = this.hoverPosition()!.x;
    
    // Si el tooltip se saldría por la derecha, posicionarlo a la izquierda del cursor
    if (x + tooltipWidth + margin > window.innerWidth) {
      return x - tooltipWidth - margin;
    }
    return x + margin;
  }

  getTooltipTop(): number {
    if (!this.hoverPosition()) return 0;
    const tooltipHeight = 200; // Altura aproximada del tooltip
    const margin = 20;
    const y = this.hoverPosition()!.y;
    
    // Si el tooltip se saldría por abajo, posicionarlo arriba del cursor
    if (y + tooltipHeight + margin > window.innerHeight) {
      return y - tooltipHeight - margin;
    }
    return y + margin;
  }

  agregarSombreadoRangos(): void {
    const dayCells = this.obtenerCeldasCalendario();
    
    if (!dayCells || dayCells.length === 0) {
      // Intentar de nuevo después de un breve delay
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
    const eventos = this.eventosCalendario();
    
    dayCells.forEach((cell: HTMLElement) => {
      // Limpiar estilos anteriores
      cell.style.backgroundColor = '';
      cell.style.backgroundImage = '';
      
      // Obtener la fecha de la celda
      const cellDate = this.obtenerFechaDeCelda(cell);
      if (!cellDate) return;
      
      const cellDateStart = startOfDay(cellDate);
      
      // Buscar eventos de múltiples días que incluyan esta fecha
      const eventosMultiplesDias = eventos.filter(e => {
        if (!e.end) return false; // Solo eventos con fecha fin
        const eventStart = startOfDay(e.start);
        const eventEnd = startOfDay(e.end);
        return cellDateStart >= eventStart && cellDateStart <= eventEnd;
      });
      
      if (eventosMultiplesDias.length > 0) {
        // Obtener el color del primer evento (o combinar colores si hay múltiples)
        const primerEvento = eventosMultiplesDias[0];
        const actividad = (primerEvento.meta as any)?.actividad;
        
        if (actividad) {
          const estadoInfo = this.obtenerEstadoParaMostrar(actividad);
          const colorEstado = estadoInfo.color || '#3B82F6';
          
          // Convertir color hex a RGB para crear sombreado
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
            // Sombreado suave con opacidad baja
            const backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
            cell.style.backgroundColor = backgroundColor;
          }
        }
      }
    });
  }

  // Agregar puntos de color según el estado
  agregarPuntosColorEstado(): void {
    this.ngZone.runOutsideAngular(() => {
      const events = this.elementRef.nativeElement.querySelectorAll('.cal-event');
      const eventos = this.eventosCalendario();
      
      events.forEach((eventEl: HTMLElement) => {
        if (eventEl.querySelector('.estado-color-dot')) {
          return; // Ya tiene el punto
        }

        // Intentar obtener el evento por data-event-id primero (más confiable)
        const eventId = eventEl.getAttribute('data-event-id');
        let evento: CalendarEvent | undefined;
        
        if (eventId) {
          evento = eventos.find(e => String(e.id) === eventId);
        }
        
        // Si no se encontró por ID, intentar por título
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
          if (actividad) {
            const estadoInfo = this.obtenerEstadoParaMostrar(actividad);
            const colorEstado = estadoInfo.color || '#3B82F6';
            
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
            
            // Verificar que el elemento aún existe y tiene hijos antes de insertar
            if (eventEl.parentNode && eventEl.firstChild) {
              try {
                eventEl.insertBefore(punto, eventEl.firstChild);
              } catch (error) {
                // Si falla insertBefore, intentar appendChild
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
        }
      });
    });
  }
}

// Interfaz para datos de cumplimiento de indicadores
export interface IndicadorCumplimiento {
  indicador: Indicador;
  meta: number;
  metaAlcanzada: number;
  porcentajeCumplimiento: number;
  totalActividades: number;
  actividadesRelacionadas: any[];
  mideNumeroActividades?: boolean; // Indica si el indicador mide número de actividades o cantidad acumulada
}