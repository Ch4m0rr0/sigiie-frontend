import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../shared/icon/icon.component';
import { ChartComponent, ChartData, ChartConfig } from '../../shared/chart/chart.component';
import { ReportesService } from '../../core/services/reportes.service';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { ParticipacionService } from '../../core/services/participacion.service';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { DashboardService } from '../../core/services/dashboard.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, IconComponent, ChartComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private reportesService = inject(ReportesService);
  private planificacionService = inject(PlanificacionService);
  private actividadesService = inject(ActividadesService);
  private participacionService = inject(ParticipacionService);
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private dashboardService = inject(DashboardService);

  // Estadísticas
  totalPlanificaciones = signal(0);
  totalActividades = signal(0);
  totalParticipaciones = signal(0);
  totalEvidencias = signal(0);
  totalSubactividades = signal(0);

  loading = signal(true);

  ngOnInit() {
    this.loadEstadisticas();
    // loadDashboardData() comentado porque puede contener datos hardcodeados del backend
    // this.loadDashboardData();
    // generateSampleData() comentado para no mostrar datos de prueba
    // this.generateSampleData();
  }

  loadDashboardData(): void {
    // NOTA: Este método está comentado porque el backend puede devolver datos hardcodeados
    // Solo usar si el backend devuelve datos reales verificados
    // Cargar datos del dashboard desde el backend
    this.dashboardService.getResumenGeneral().subscribe({
      next: (data) => {
        console.log('✅ Resumen general del dashboard:', data);
        // NO actualizar señales con datos del backend si pueden ser hardcodeados
        // Usar solo loadEstadisticas() que obtiene datos reales de los servicios
      },
      error: (error) => {
        console.warn('⚠️ Error cargando resumen general del dashboard:', error);
      }
    });

    // Cargar datos de tendencia
    this.dashboardService.getDatosTendencia().subscribe({
      next: (data) => {
        console.log('✅ Datos de tendencia:', data);
        // Solo usar si son datos reales verificados
      },
      error: (error) => {
        console.warn('⚠️ Error cargando datos de tendencia:', error);
      }
    });
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
      firstValueFrom(this.planificacionService.getAll())
        .then(data => {
          const count = data?.length || 0;
          console.log('✅ Planificaciones cargadas:', count);
          return count;
        })
        .catch(error => {
          console.warn('⚠️ Error cargando planificaciones:', error);
          return 0;
        }),
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
    ]).then(([planificaciones, actividades, participaciones, evidencias, subactividades]) => {
      this.totalPlanificaciones.set(planificaciones);
      this.totalActividades.set(actividades);
      this.totalParticipaciones.set(participaciones);
      this.totalEvidencias.set(evidencias);
      this.totalSubactividades.set(subactividades);
      console.log('📊 Estadísticas del dashboard:', {
        planificaciones,
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
}