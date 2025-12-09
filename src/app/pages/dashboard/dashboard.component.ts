import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ChartData, ChartConfig } from '../../shared/chart/chart.component';
import { StatisticsCardsComponent } from './statistics-cards/statistics-cards.component';
import { CalendarSectionComponent } from './calendar-section/calendar-section.component';
import { IndicatorComplianceComponent } from './indicator-compliance/indicator-compliance.component';
import { MonthlyActivitiesComponent } from './monthly-activities/monthly-activities.component';
import { DashboardChartsComponent } from './dashboard-charts/dashboard-charts.component';
import { ActividadesService } from '../../core/services/actividades.service';
import { ParticipacionService } from '../../core/services/participacion.service';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, StatisticsCardsComponent, CalendarSectionComponent, IndicatorComplianceComponent, MonthlyActivitiesComponent, DashboardChartsComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private actividadesService = inject(ActividadesService);
  private participacionService = inject(ParticipacionService);
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private dashboardService = inject(DashboardService);

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

  loading = signal(true);

  // Datos para gráficos
  progressChartData: ChartData | null = null;
  progressChartConfig: ChartConfig = {
    title: 'Progreso de Proyectos',
    type: 'line',
    height: 300,
    responsive: true,
    maintainAspectRatio: false
  };

  usersChartData: ChartData | null = null;
  usersChartConfig: ChartConfig = {
    title: 'Distribución de Usuarios',
    type: 'pie',
    height: 400,
    responsive: true,
    maintainAspectRatio: true
  };

  ngOnInit() {
    this.loadEstadisticas();
    this.loadDashboardData();
  }

  loadEstadisticas(): void {
    this.loading.set(true);
    
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

  loadDashboardData(): void {
    // Cargar resumen general
    this.dashboardService.getResumenGeneral().subscribe({
      next: (data) => {
        console.log('✅ Resumen general del dashboard:', data);
        this.resumenGeneral.set(data);
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
}
