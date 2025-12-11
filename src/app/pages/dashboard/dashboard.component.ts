import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ChartData, ChartConfig } from '../../shared/chart/chart.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { StatisticsCardsComponent } from './statistics-cards/statistics-cards.component';
import { CalendarSectionComponent } from './calendar-section/calendar-section.component';
import { IndicatorComplianceComponent } from './indicator-compliance/indicator-compliance.component';
import { MonthlyActivitiesComponent } from './monthly-activities/monthly-activities.component';
import { DashboardChartsComponent } from './dashboard-charts/dashboard-charts.component';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card.component';
import { ActividadesService } from '../../core/services/actividades.service';
import { ParticipacionService } from '../../core/services/participacion.service';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { PermisosService } from '../../core/services/permisos.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, IconComponent, StatisticsCardsComponent, CalendarSectionComponent, IndicatorComplianceComponent, MonthlyActivitiesComponent, DashboardChartsComponent, SkeletonCardComponent],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private actividadesService = inject(ActividadesService);
  private participacionService = inject(ParticipacionService);
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private dashboardService = inject(DashboardService);
  private permisosService = inject(PermisosService);
  private authService = inject(AuthService);

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
  
  // Verificar si el usuario es admin para mostrar sección de cumplimiento de indicadores
  esAdmin = signal(false);
  
  // Control de visibilidad de secciones
  mostrarCalendario = signal(true);
  mostrarEstadisticas = signal(true);
  mostrarIndicadores = signal(true);
  mostrarActividadesMes = signal(true);
  mostrarGraficos = signal(true);

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
    // Verificar si el usuario es admin
    this.esAdmin.set(this.permisosService.tieneTodosLosPermisosDeAdmin());

    // Priorizar carga de estadísticas básicas (crítico para LCP)
    // Los gráficos y datos adicionales se cargan después
    this.loadEstadisticas();

    // Cargar datos adicionales después de un breve delay para no bloquear renderizado inicial
    setTimeout(() => {
      this.loadDashboardData();
    }, 0);
  }

  loadEstadisticas(): void {
    this.loading.set(true);
    
    // Obtener el departamento del usuario si no es admin
    const usuario = this.authService.user();
    const departamentoId = usuario?.departamentoId;
    const esAdmin = this.esAdmin();
    
    // Si no es admin y tiene departamento, filtrar por departamento
    const filtroDepartamento = !esAdmin && departamentoId ? { DepartamentoResponsableId: departamentoId } : undefined;
    
    Promise.all([
      // Actividades: filtrar por departamento si no es admin
      firstValueFrom(this.actividadesService.getAll(filtroDepartamento))
        .then(data => {
          const count = data?.length || 0;
          console.log(`✅ Actividades cargadas${filtroDepartamento ? ` (filtradas por departamento ${departamentoId})` : ' (todas)'}:`, count);
          return { count, data };
        })
        .catch(error => {
          console.warn('⚠️ Error cargando actividades:', error);
          return { count: 0, data: [] };
        }),
      // Participaciones: cargar todas y filtrar por actividades/subactividades del departamento si no es admin
      firstValueFrom(this.participacionService.getAll())
        .then(data => {
          let participacionesFiltradas = data || [];
          
          // Si no es admin, necesitamos filtrar participaciones por actividades/subactividades del departamento
          if (!esAdmin && departamentoId) {
            // Primero obtener actividades del departamento
            return firstValueFrom(this.actividadesService.getAll(filtroDepartamento))
              .then(actividades => {
                const actividadIds = actividades.map(a => a.id).filter(id => id !== undefined) as number[];
                
                // Obtener subactividades de esas actividades
                return Promise.all(actividadIds.map(id => 
                  firstValueFrom(this.subactividadService.buscar({ IdActividad: id }))
                    .catch(() => [])
                )).then(subactividadesArrays => {
                  const subactividades = subactividadesArrays.flat();
                  const subactividadIds = subactividades.map(s => s.idSubactividad).filter(id => id !== undefined) as number[];
                  
                  // Filtrar participaciones:
                  // 1. Por subactividades del departamento (si tienen idSubactividad)
                  // 2. Por actividades del departamento (si tienen idActividad)
                  participacionesFiltradas = participacionesFiltradas.filter(p => {
                    // Verificar si tiene idSubactividad y está en la lista de subactividades del departamento
                    if (p.idSubactividad && subactividadIds.includes(p.idSubactividad)) {
                      return true;
                    }
                    // Verificar si tiene idActividad y está en la lista de actividades del departamento
                    if (p.idActividad && actividadIds.includes(p.idActividad)) {
                      return true;
                    }
                    return false;
                  });
                  
                  const count = participacionesFiltradas.length;
                  console.log(`✅ Participaciones cargadas (filtradas por departamento ${departamentoId}):`, count, {
                    totalActividades: actividadIds.length,
                    totalSubactividades: subactividadIds.length,
                    participacionesFiltradas: count
                  });
                  return { count, data: participacionesFiltradas };
                });
              })
              .catch(() => ({ count: 0, data: [] }));
          } else {
            const count = participacionesFiltradas.length;
            console.log('✅ Participaciones cargadas (todas):', count);
            return { count, data: participacionesFiltradas };
          }
        })
        .catch(error => {
          console.warn('⚠️ Error cargando participaciones:', error);
          return { count: 0, data: [] };
        }),
      // Evidencias: cargar todas y filtrar por actividades del departamento si no es admin
      firstValueFrom(this.evidenciaService.getAll())
        .then(data => {
          let evidenciasFiltradas = data || [];
          
          // Si no es admin, necesitamos filtrar evidencias por actividades del departamento
          if (!esAdmin && departamentoId) {
            return firstValueFrom(this.actividadesService.getAll(filtroDepartamento))
              .then(actividades => {
                const actividadIds = actividades.map(a => a.id).filter(id => id !== undefined) as number[];
                // Filtrar evidencias que pertenezcan a actividades del departamento
                evidenciasFiltradas = evidenciasFiltradas.filter(e => 
                  e.idActividad && actividadIds.includes(e.idActividad)
                );
                const count = evidenciasFiltradas.length;
                console.log(`✅ Evidencias cargadas (filtradas por departamento ${departamentoId}):`, count);
                return { count, data: evidenciasFiltradas };
              })
              .catch(() => ({ count: 0, data: [] }));
          } else {
            const count = evidenciasFiltradas.length;
            console.log('✅ Evidencias cargadas (todas):', count);
            return { count, data: evidenciasFiltradas };
          }
        })
        .catch(error => {
          console.warn('⚠️ Error cargando evidencias:', error);
          return { count: 0, data: [] };
        }),
      // Subactividades: filtrar por departamento si no es admin
      (filtroDepartamento 
        ? firstValueFrom(this.subactividadService.buscar({ DepartamentoResponsableId: departamentoId }))
        : firstValueFrom(this.subactividadService.getAll()))
        .then(data => {
          const count = data?.length || 0;
          console.log(`✅ Subactividades cargadas${filtroDepartamento ? ` (filtradas por departamento ${departamentoId})` : ' (todas)'}:`, count);
          return { count, data };
        })
        .catch(error => {
          console.warn('⚠️ Error cargando subactividades:', error);
          return { count: 0, data: [] };
        }),
    ]).then(([actividades, participaciones, evidencias, subactividades]) => {
      this.totalActividades.set(actividades.count);
      this.totalParticipaciones.set(participaciones.count);
      this.totalEvidencias.set(evidencias.count);
      this.totalSubactividades.set(subactividades.count);
      console.log('📊 Estadísticas del dashboard:', {
        esAdmin,
        departamentoId: departamentoId || 'N/A',
        actividades: actividades.count,
        participaciones: participaciones.count,
        evidencias: evidencias.count,
        subactividades: subactividades.count
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

  // Métodos para toggle de secciones
  toggleCalendario(): void {
    this.mostrarCalendario.update(v => !v);
  }

  toggleEstadisticas(): void {
    this.mostrarEstadisticas.update(v => !v);
  }

  toggleIndicadores(): void {
    this.mostrarIndicadores.update(v => !v);
  }

  toggleActividadesMes(): void {
    this.mostrarActividadesMes.update(v => !v);
  }

  toggleGraficos(): void {
    this.mostrarGraficos.update(v => !v);
  }
}
