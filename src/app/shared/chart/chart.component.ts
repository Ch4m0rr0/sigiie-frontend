import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, ViewChild, ElementRef, Inject, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Registrar todos los componentes de Chart.js
Chart.register(...registerables);

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
      <div *ngIf="config?.title" class="chart-title mb-4">
        <h3 class="text-lg font-semibold text-slate-900">{{ config?.title }}</h3>
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

    const chartConfig: ChartConfiguration = {
      type: this.config!.type,
      data: this.data!,
      options: {
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
        scales: this.config?.scales || this.getDefaultScales(),
        ...this.config
      }
    };

    this.chart = new Chart(ctx, chartConfig);
  }

  private updateChart() {
    if (!this.isBrowser) return;
    
    if (this.chart && this.data) {
      this.chart.data = this.data;
      this.chart.update();
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