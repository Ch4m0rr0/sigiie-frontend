import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ChartComponent, ChartData, ChartConfig } from '../../../shared/chart/chart.component';

@Component({
  standalone: true,
  selector: 'app-dashboard-charts',
  imports: [CommonModule, IconComponent, ChartComponent],
  templateUrl: './dashboard-charts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardChartsComponent {
  // Inputs para datos de gráficas
  progressChartData = input<ChartData | null>(null);
  progressChartConfig = input<ChartConfig | null>(null);
  usersChartData = input<ChartData | null>(null);
  usersChartConfig = input<ChartConfig | null>(null);
  
  // Inputs para métricas y rendimiento (mantenidos por compatibilidad, aunque ya no se usan)
  vistaEspecialMetricas = input<any>(null);
  vistaEspecialRendimiento = input<any>(null);
}

