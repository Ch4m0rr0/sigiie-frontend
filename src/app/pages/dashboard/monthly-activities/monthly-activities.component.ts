import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ActividadesService } from '../../../core/services/actividades.service';
import type { Actividad } from '../../../core/models/actividad';
import { forkJoin } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-monthly-activities',
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './monthly-activities.component.html'
})
export class MonthlyActivitiesComponent implements OnInit {
  private actividadesService = inject(ActividadesService);

  // Actividades de este mes
  actividadesEsteMes = signal<Actividad[]>([]);
  loadingActividadesMes = signal(false);
  mostrarActividadesMes = signal(false);

  ngOnInit() {
    this.loadActividadesEsteMes();
  }

  // Toggle para mostrar/ocultar actividades del mes
  toggleActividadesEsteMes(): void {
    this.mostrarActividadesMes.update(value => !value);
  }

  // Cargar actividades de este mes (que inicien o terminen este mes)
  loadActividadesEsteMes(): void {
    this.loadingActividadesMes.set(true);

    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = ahora.getMonth() + 1;
    
    const primerDia = new Date(año, mes - 1, 1);
    primerDia.setHours(0, 0, 0, 0);
    const primerDiaStr = primerDia.toISOString().split('T')[0];
    
    const ultimoDia = new Date(año, mes, 0);
    ultimoDia.setHours(23, 59, 59, 999);
    const ultimoDiaStr = ultimoDia.toISOString().split('T')[0];

    const actividadesInicio = this.actividadesService.getAll({
      FechaInicioDesde: primerDiaStr,
      FechaInicioHasta: ultimoDiaStr
    });

    const actividadesFin = this.actividadesService.getAll({
      FechaFinDesde: primerDiaStr,
      FechaFinHasta: ultimoDiaStr
    });

    forkJoin([actividadesInicio, actividadesFin]).subscribe({
      next: ([actividadesInicio, actividadesFin]) => {
        const actividadesMap = new Map<string, Actividad>();
        const idsProcesados = new Set<number>();
        const codigosProcesados = new Set<string>();

        const esDuplicada = (actividad: Actividad): boolean => {
          const codigo = actividad.codigoActividad?.trim();
          if (codigo && codigosProcesados.has(codigo)) {
            return true;
          }
          if (idsProcesados.has(actividad.id)) {
            return true;
          }
          return false;
        };

        const registrarActividad = (actividad: Actividad): void => {
          const codigo = actividad.codigoActividad?.trim();
          if (codigo) {
            codigosProcesados.add(codigo);
          }
          idsProcesados.add(actividad.id);
        };

        const generarClave = (actividad: Actividad): string => {
          const codigo = actividad.codigoActividad?.trim();
          return codigo ? `codigo:${codigo}` : `id:${actividad.id}`;
        };

        actividadesInicio.forEach(actividad => {
          if (actividad && actividad.id) {
            if (!esDuplicada(actividad)) {
              const clave = generarClave(actividad);
              actividadesMap.set(clave, actividad);
              registrarActividad(actividad);
            }
          }
        });

        actividadesFin.forEach(actividad => {
          if (actividad && actividad.id) {
            if (!esDuplicada(actividad)) {
              const clave = generarClave(actividad);
              actividadesMap.set(clave, actividad);
              registrarActividad(actividad);
            }
          }
        });

        const actividadesFiltradas = Array.from(actividadesMap.values()).filter(actividad => {
          return this.actividadSeSolapaConMes(actividad, primerDia, ultimoDia);
        });

        actividadesFiltradas.sort((a, b) => {
          const fechaA = a.fechaInicio ? new Date(a.fechaInicio).getTime() : 0;
          const fechaB = b.fechaInicio ? new Date(b.fechaInicio).getTime() : 0;
          return fechaB - fechaA;
        });

        this.actividadesEsteMes.set(actividadesFiltradas);
        this.loadingActividadesMes.set(false);
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
      return false;
    }

    const fechaInicio = actividad.fechaInicio ? new Date(actividad.fechaInicio) : null;
    const fechaFin = actividad.fechaFin ? new Date(actividad.fechaFin) : null;

    const normalizarFecha = (fecha: Date) => {
      const normalizada = new Date(fecha);
      normalizada.setHours(0, 0, 0, 0);
      return normalizada;
    };

    const primerDiaNormalizado = normalizarFecha(primerDiaMes);
    const ultimoDiaNormalizado = normalizarFecha(ultimoDiaMes);

    if (fechaInicio && !fechaFin) {
      const fechaInicioNormalizada = normalizarFecha(fechaInicio);
      return fechaInicioNormalizada >= primerDiaNormalizado && fechaInicioNormalizada <= ultimoDiaNormalizado;
    }

    if (!fechaInicio && fechaFin) {
      const fechaFinNormalizada = normalizarFecha(fechaFin);
      return fechaFinNormalizada >= primerDiaNormalizado && fechaFinNormalizada <= ultimoDiaNormalizado;
    }

    if (fechaInicio && fechaFin) {
      const fechaInicioNormalizada = normalizarFecha(fechaInicio);
      const fechaFinNormalizada = normalizarFecha(fechaFin);

      const iniciaEnMes = fechaInicioNormalizada >= primerDiaNormalizado && fechaInicioNormalizada <= ultimoDiaNormalizado;
      const terminaEnMes = fechaFinNormalizada >= primerDiaNormalizado && fechaFinNormalizada <= ultimoDiaNormalizado;
      const cubreTodoElMes = fechaInicioNormalizada < primerDiaNormalizado && fechaFinNormalizada > ultimoDiaNormalizado;

      return iniciaEnMes || terminaEnMes || cubreTodoElMes;
    }

    return false;
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
    
    if (estadoLower.includes('finaliz') || estadoLower.includes('complet') || estadoLower.includes('terminad')) {
      return 'text-blue-600';
    }
    if (estadoLower.includes('en curso') || estadoLower.includes('en ejecución') || estadoLower.includes('ejecución') || estadoLower.includes('proceso')) {
      return 'text-emerald-600';
    }
    if (estadoLower.includes('pendiente') || estadoLower.includes('planific')) {
      return 'text-amber-600';
    }
    return 'text-slate-500';
  }

  // Obtener color de fondo según el estado de la actividad
  getBgColorEstadoActividad(estado?: string): string {
    if (!estado) return 'bg-slate-50 border border-slate-200';
    const estadoLower = estado.toLowerCase();
    
    if (estadoLower.includes('finaliz') || estadoLower.includes('complet') || estadoLower.includes('terminad')) {
      return 'bg-blue-50 border border-blue-200';
    }
    if (estadoLower.includes('en curso') || estadoLower.includes('en ejecución') || estadoLower.includes('ejecución') || estadoLower.includes('proceso')) {
      return 'bg-emerald-50 border border-emerald-200';
    }
    if (estadoLower.includes('pendiente') || estadoLower.includes('planific')) {
      return 'bg-amber-50 border border-amber-200';
    }
    return 'bg-slate-50 border border-slate-200';
  }
}

