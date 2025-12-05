import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import type { Indicador } from '../../core/models/indicador';
import type { ActividadIndicador } from '../../core/models/indicador';
import type { Actividad } from '../../core/models/actividad';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, IconComponent, ChartComponent, TitleCasePipe],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private reportesService = inject(ReportesService);
  private actividadesService = inject(ActividadesService);
  private participacionService = inject(ParticipacionService);
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private dashboardService = inject(DashboardService);
  private indicadorService = inject(IndicadorService);

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

  ngOnInit() {
    this.loadEstadisticas();
    this.loadDashboardData();
    this.loadCumplimientoIndicadores();
    this.loadActividadesEsteMes();
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
  getEstadoColor(porcentaje: number): string {
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