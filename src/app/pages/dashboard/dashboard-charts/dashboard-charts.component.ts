import { Component, input, signal } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ChartComponent, ChartData, ChartConfig } from '../../../shared/chart/chart.component';
import { QuickAccessComponent } from '../quick-access/quick-access.component';

@Component({
  standalone: true,
  selector: 'app-dashboard-charts',
  imports: [CommonModule, IconComponent, ChartComponent, TitleCasePipe, QuickAccessComponent],
  templateUrl: './dashboard-charts.component.html'
})
export class DashboardChartsComponent {
  // Inputs para datos de gráficas
  progressChartData = input<ChartData | null>(null);
  progressChartConfig = input<ChartConfig | null>(null);
  usersChartData = input<ChartData | null>(null);
  usersChartConfig = input<ChartConfig | null>(null);
  
  // Inputs para métricas y rendimiento
  vistaEspecialMetricas = input<any>(null);
  vistaEspecialRendimiento = input<any>(null);

  // Métodos helper para el template
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
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
}

