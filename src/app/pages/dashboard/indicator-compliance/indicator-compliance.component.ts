import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ChartComponent, ChartData, ChartConfig } from '../../../shared/chart/chart.component';
import { IndicadorService } from '../../../core/services/indicador.service';
import { ActividadesService } from '../../../core/services/actividades.service';
import type { Indicador } from '../../../core/models/indicador';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

// Interfaz para datos de cumplimiento de indicadores
export interface IndicadorCumplimiento {
  indicador: Indicador;
  meta: number;
  metaAlcanzada: number;
  porcentajeCumplimiento: number;
  totalActividades: number;
  actividadesRelacionadas: any[];
  mideNumeroActividades?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-indicator-compliance',
  imports: [CommonModule, IconComponent, ChartComponent],
  templateUrl: './indicator-compliance.component.html'
})
export class IndicatorComplianceComponent implements OnInit {
  private indicadorService = inject(IndicadorService);
  private actividadesService = inject(ActividadesService);

  // Datos de cumplimiento de indicadores
  indicadoresCumplimiento = signal<IndicadorCumplimiento[]>([]);
  loadingIndicadores = signal(false);
  mostrarCumplimientoIndicadores = signal(false);
  
  // Tipo de ordenamiento actual
  tipoOrdenamiento = signal<'cumplimiento-desc' | 'cumplimiento-asc' | 'codigo-asc' | 'codigo-desc'>('cumplimiento-asc');
  
  // Indicadores ordenados y filtrados según el filtro seleccionado
  indicadoresOrdenados = computed(() => {
    let indicadores = this.indicadoresCumplimiento();
    const orden = this.tipoOrdenamiento();
    const filtroCodigo = this.filtroIndicadoresCodigo().toLowerCase().trim();
    const filtroPorcentaje = this.filtroIndicadoresPorcentaje();
    
    // Aplicar filtros
    if (filtroCodigo) {
      indicadores = indicadores.filter(ind => {
        const codigo = (ind.indicador.codigo || '').toLowerCase();
        const nombre = (ind.indicador.nombre || '').toLowerCase();
        return codigo.includes(filtroCodigo) || nombre.includes(filtroCodigo);
      });
    }
    
    if (filtroPorcentaje === 'cumplidos') {
      indicadores = indicadores.filter(ind => ind.porcentajeCumplimiento >= 100);
    } else if (filtroPorcentaje === 'pendientes') {
      indicadores = indicadores.filter(ind => ind.porcentajeCumplimiento < 100);
    }
    
    const copia = [...indicadores];
    
    switch (orden) {
      case 'cumplimiento-desc':
        return copia.sort((a, b) => b.porcentajeCumplimiento - a.porcentajeCumplimiento);
      case 'cumplimiento-asc':
        return copia.sort((a, b) => a.porcentajeCumplimiento - b.porcentajeCumplimiento);
      case 'codigo-asc':
        return copia.sort((a, b) => {
          const codigoA = a.indicador.codigo || '';
          const codigoB = b.indicador.codigo || '';
          return this.compararCodigos(codigoA, codigoB);
        });
      case 'codigo-desc':
        return copia.sort((a, b) => {
          const codigoA = a.indicador.codigo || '';
          const codigoB = b.indicador.codigo || '';
          return this.compararCodigos(codigoB, codigoA);
        });
      default:
        return copia;
    }
  });
  
  // Cache para datos y configuraciones de gráficas
  private chartDataCache = new Map<number, ChartData>();
  private chartConfigCache = new Map<number, ChartConfig>();

  // Filtros de cumplimiento de indicadores
  filtroIndicadoresCodigo = signal<string>('');
  filtroIndicadoresPorcentaje = signal<'todos' | 'cumplidos' | 'pendientes'>('todos');
  mostrarFiltrosIndicadores = signal(false);

  ngOnInit() {
    this.loadCumplimientoIndicadores();
  }

  // Toggle para mostrar/ocultar cumplimiento de indicadores
  toggleCumplimientoIndicadores(): void {
    this.mostrarCumplimientoIndicadores.update(value => !value);
  }

  // Toggle para mostrar/ocultar filtros
  toggleFiltrosIndicadores(): void {
    this.mostrarFiltrosIndicadores.update(v => !v);
  }

  // Limpiar filtros de indicadores
  limpiarFiltrosIndicadores(): void {
    this.filtroIndicadoresCodigo.set('');
    this.filtroIndicadoresPorcentaje.set('todos');
  }

  // Métodos helper para el template
  onFiltroCodigoChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.filtroIndicadoresCodigo.set(target.value);
  }

  onFiltroPorcentajeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filtroIndicadoresPorcentaje.set(target.value as 'todos' | 'cumplidos' | 'pendientes');
  }

  // Cargar cumplimiento de indicadores
  loadCumplimientoIndicadores(): void {
    this.loadingIndicadores.set(true);
    
    this.indicadorService.getAll().subscribe({
      next: (indicadores) => {
        const indicadoresConMeta = indicadores.filter(ind => 
          ind.activo && ind.meta !== undefined && ind.meta !== null && ind.meta > 0
        );

        if (indicadoresConMeta.length === 0) {
          this.indicadoresCumplimiento.set([]);
          this.loadingIndicadores.set(false);
          return;
        }

        const requests = indicadoresConMeta.map(indicador => 
          this.actividadesService.getAll({ IdIndicador: indicador.idIndicador }).pipe(
            map(actividades => {
              const actividadesRelacionadas = actividades || [];
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
                metaAlcanzadaTotal = totalActividades;
                porcentajeCumplimiento = meta > 0 
                  ? Math.min((totalActividades / meta) * 100, 100) 
                  : 0;
              } else {
                actividadesRelacionadas.forEach(act => {
                  if (act.metaAlcanzada !== undefined && act.metaAlcanzada !== null) {
                    metaAlcanzadaTotal += act.metaAlcanzada;
                  }
                });
                porcentajeCumplimiento = meta > 0 
                  ? Math.min((metaAlcanzadaTotal / meta) * 100, 100) 
                  : 0;
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
            const ordenados = resultados.sort((a, b) => 
              a.porcentajeCumplimiento - b.porcentajeCumplimiento
            );
            this.indicadoresCumplimiento.set(ordenados);
            this.chartDataCache.clear();
            this.chartConfigCache.clear();
            this.loadingIndicadores.set(false);
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

  // Generar datos de gráfica para un indicador
  getChartDataForIndicador(cumplimiento: IndicadorCumplimiento): ChartData {
    const id = cumplimiento.indicador.idIndicador;
    const porcentaje = Math.max(0, Math.min(100, cumplimiento.porcentajeCumplimiento || 0));
    
    const cached = this.chartDataCache.get(id);
    if (cached) {
      const cachedPorcentaje = cached.datasets[0].data[0];
      if (Math.abs(cachedPorcentaje - porcentaje) < 0.01) {
        return cached;
      }
    }
    
    let porcentajeParaGrafica = porcentaje;
    if (porcentajeParaGrafica === 0) {
      porcentajeParaGrafica = 0.01;
    }
    
    const cumple = porcentaje >= 100;
    const colorCumplido = cumple ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    const borderColorCumplido = cumple ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)';
    
    const dataCumplido = porcentajeParaGrafica;
    const dataPendiente = 100 - dataCumplido;
    
    const chartData: ChartData = {
      labels: ['Cumplido', 'Pendiente'],
      datasets: [{
        label: 'Cumplimiento',
        data: [dataCumplido, dataPendiente],
        backgroundColor: [
          colorCumplido,
          'rgba(226, 232, 240, 0.7)'
        ],
        borderColor: [
          borderColorCumplido,
          'rgb(203, 213, 225)'
        ],
        borderWidth: 2
      }]
    };
    
    this.chartDataCache.set(id, chartData);
    return chartData;
  }

  // Configuración de gráfica para indicadores
  getChartConfigForIndicador(cumplimiento: IndicadorCumplimiento): ChartConfig {
    const id = cumplimiento.indicador.idIndicador;
    
    const cached = this.chartConfigCache.get(id);
    if (cached) {
      return cached;
    }
    
    const unidad = cumplimiento.indicador.unidadMedida || '';
    const mostrarUnidad = unidad && !cumplimiento.mideNumeroActividades;
    
    const config: ChartConfig = {
      title: undefined,
      type: 'doughnut',
      height: 180,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
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
    
    this.chartConfigCache.set(id, config);
    return config;
  }
  
  // TrackBy para el @for de indicadores
  trackByIndicadorId(index: number, cumplimiento: IndicadorCumplimiento): number {
    return cumplimiento.indicador.idIndicador;
  }

  // Obtener color de estado según porcentaje
  getColorEstadoIndicador(porcentaje: number): string {
    return porcentaje >= 100 ? 'text-emerald-600' : 'text-red-600';
  }

  // Comparar códigos de indicadores
  private compararCodigos(codigoA: string, codigoB: string): number {
    if (!codigoA && !codigoB) return 0;
    if (!codigoA) return 1;
    if (!codigoB) return -1;
    
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

  // Métodos helper para el template
  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}

