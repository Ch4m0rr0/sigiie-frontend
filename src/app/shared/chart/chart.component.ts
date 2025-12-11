import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Lazy registration de Chart.js - solo se registra cuando se necesita (optimización LCP)
let chartRegistered = false;
function ensureChartRegistered() {
  if (!chartRegistered) {
    Chart.register(...registerables);
    chartRegistered = true;
  }
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

export interface ChartConfig {
  title?: string;
  type: ChartType;
  height?: number;
  width?: number;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: any;
  scales?: any;
}

@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <div *ngIf="shouldShowTitle" class="chart-title mb-4">
        <h3 class="text-lg font-semibold text-slate-900">{{ title }}</h3>
      </div>
      <div class="chart-wrapper" [style.height.px]="config?.height || 400">
        <canvas #chartCanvas [id]="canvasId"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      width: 100%;
      height: 100%;
    }
    
    .chart-wrapper {
      width: 100%;
      position: relative;
    }
    
    .chart-title {
      padding: 0 16px;
    }
  `]
})
export class ChartComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() data: ChartData | null = null;
  @Input() config: ChartConfig | null = null;

  // Helper para verificar si el título debe mostrarse
  get shouldShowTitle(): boolean {
    return !!(this.config?.title && this.config.title.trim() !== '');
  }

  // Helper para obtener el título de forma segura
  get title(): string {
    return this.config?.title || '';
  }
  
  private chart: Chart | null = null;
  private isBrowser: boolean;
  public canvasId: string;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.canvasId = `chart-canvas-${Math.random().toString(36).substr(2, 9)}`;
  }

  ngOnInit() {
    // No hacer nada aquí, esperar a que la vista esté lista
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      // Lazy registration de Chart.js solo cuando se necesita renderizar
      ensureChartRegistered();
      this.createChart();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isBrowser && (changes['data'] || changes['config'])) {
      this.updateChart();
    }
  }

  private createChart() {
    if (!this.isBrowser || !this.chartCanvas?.nativeElement || !this.data || !this.config) return;

    // Destruir el gráfico existente si existe
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Configuración base de opciones
    const baseOptions: any = {
      responsive: this.config?.responsive !== false,
      maintainAspectRatio: this.config?.maintainAspectRatio !== false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
              family: 'Inter, system-ui, sans-serif'
            }
          }
        },
        title: {
          display: false // Usamos nuestro propio título
        },
        ...this.config?.plugins
      },
      scales: this.config?.scales || this.getDefaultScales()
    };

    // Para gráficas doughnut/pie, agregar configuraciones de estabilidad
    if (this.config?.type === 'doughnut' || this.config?.type === 'pie') {
      // Solo aplicar animación si no está definida en la configuración personalizada
      if (!baseOptions.animation) {
        baseOptions.animation = {
          animateRotate: false, // Desactivar animación de rotación para evitar movimiento constante
          animateScale: false, // Desactivar animación de escala para evitar movimiento
          duration: 0 // Sin animación para máxima estabilidad
        };
      }
      baseOptions.layout = {
        padding: {
          top: 5,
          bottom: 5,
          left: 5,
          right: 5
        }
      };
      // Asegurar que el gráfico no se redimensione constantemente
      baseOptions.resizeDelay = 0;
    }

    // Combinar con configuraciones personalizadas
    const chartConfig: ChartConfiguration = {
      type: this.config!.type,
      data: this.data!,
      options: {
        ...baseOptions,
        ...this.config
      }
    };

    this.chart = new Chart(ctx, chartConfig);
  }

  private updateChart() {
    if (!this.isBrowser) return;
    
    if (this.chart && this.data) {
      // Para gráficas doughnut/pie, usar update con modo 'none' para evitar animaciones innecesarias
      const isDoughnutOrPie = this.config?.type === 'doughnut' || this.config?.type === 'pie';
      
      // Verificar si los datos realmente han cambiado antes de actualizar
      const currentData = this.chart.data.datasets[0]?.data;
      const newData = this.data.datasets[0]?.data;
      
      // Comparar datos para evitar actualizaciones innecesarias
      const dataChanged = !currentData || !newData || 
        currentData.length !== newData.length ||
        currentData.some((val: any, idx: number) => {
          const currentVal = typeof val === 'number' ? val : (Array.isArray(val) ? val[0] : 0);
          const newVal = typeof newData[idx] === 'number' ? newData[idx] : (Array.isArray(newData[idx]) ? newData[idx][0] : 0);
          return Math.abs(currentVal - (newVal || 0)) > 0.01;
        });
      
      if (dataChanged) {
        // Actualizar datos
        this.chart.data = this.data;
        
        // Actualizar con modo apropiado
        if (isDoughnutOrPie) {
          // Para doughnut/pie, usar 'none' para evitar movimiento constante
          this.chart.update('none');
        } else {
          // Para otros tipos, usar actualización normal
          this.chart.update();
        }
      }
    } else if (this.data && this.config) {
      // Destruir el gráfico existente antes de crear uno nuevo
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      this.createChart();
    }
  }

  private getDefaultScales() {
    // Escalas por defecto para diferentes tipos de gráficos
    if (this.config?.type === 'pie' || this.config?.type === 'doughnut') {
      return {}; // Los gráficos de pastel no necesitan escalas
    }

    return {
      x: {
        beginAtZero: true,
        grid: {
          color: '#e5e7eb',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif'
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#e5e7eb',
          drawBorder: false
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif'
          }
        }
      }
    };
  }

  public destroyChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  ngOnDestroy() {
    this.destroyChart();
  }
}