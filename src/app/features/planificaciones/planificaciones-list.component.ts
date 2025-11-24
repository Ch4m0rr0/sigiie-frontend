import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PlanificacionService } from '../../core/services/planificacion.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Planificacion, PlanificacionFilterDto } from '../../core/models/planificacion';
import type { TipoPlanificacion } from '../../core/models/catalogos-nuevos';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-planificaciones-list',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './planificaciones-list.component.html',
})
export class PlanificacionesListComponent implements OnInit {
  private planificacionService = inject(PlanificacionService);
  private catalogosService = inject(CatalogosService);
  private router = inject(Router);

  planificaciones = signal<Planificacion[]>([]);
  tiposPlanificacion = signal<TipoPlanificacion[]>([]);
  planificacionesPadre = signal<Planificacion[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros según PlanificacionFilterDto
  filtroTipo = signal<number | null>(null); // TipoId
  filtroAnio = signal<number | null>(null); // Anio
  filtroPadre = signal<number | null>(null); // PadreId
  filtroIncluirInactivos = signal<boolean>(false); // IncluirInactivos
  filtroPeriodoInicio = signal<string | null>(null); // PeriodoInicio (DateOnly)
  filtroPeriodoFin = signal<string | null>(null); // PeriodoFin (DateOnly)
  filtroProfundidad = signal<number | null>(null); // Profundidad
  filtroIncluirActividades = signal<boolean>(false); // IncluirActividades
  filtroIncluirReportes = signal<boolean>(false); // IncluirReportes

  ngOnInit(): void {
    console.log('🔄 PlanificacionesListComponent - ngOnInit');
    this.loadTiposPlanificacion();
    this.loadPlanificacionesPadre(); // Cargar planificaciones padre para el filtro
    // Cargar todas las planificaciones al iniciar
    this.loadPlanificaciones();
  }

  loadTiposPlanificacion(): void {
    this.catalogosService.getTiposPlanificacion().subscribe({
      next: (data) => this.tiposPlanificacion.set(data),
      error: (err) => console.error('Error loading tipos planificacion:', err)
    });
  }

  loadPlanificacionesPadre(): void {
    // Cargar planificaciones para el filtro de padre (solo las que no tienen padre)
    this.planificacionService.getAll({ IncluirInactivos: true }).subscribe({
      next: (data) => this.planificacionesPadre.set(data),
      error: (err) => console.error('Error loading planificaciones padre:', err)
    });
  }

  loadPlanificaciones(): void {
    this.loading.set(true);
    this.error.set(null);
    this.planificaciones.set([]);

    // Construir filtros según PlanificacionFilterDto
    const filters: PlanificacionFilterDto = {};
    
    if (this.filtroTipo() !== null) {
      filters.TipoId = this.filtroTipo()!;
    }
    
    if (this.filtroAnio() !== null) {
      filters.Anio = this.filtroAnio()!;
    }
    
    if (this.filtroPadre() !== null) {
      filters.PadreId = this.filtroPadre()!;
    }
    
    if (this.filtroIncluirInactivos()) {
      filters.IncluirInactivos = true;
    }
    
    if (this.filtroPeriodoInicio()) {
      filters.PeriodoInicio = this.filtroPeriodoInicio()!;
    }
    
    if (this.filtroPeriodoFin()) {
      filters.PeriodoFin = this.filtroPeriodoFin()!;
    }
    
    if (this.filtroProfundidad() !== null) {
      filters.Profundidad = this.filtroProfundidad()!;
    }
    
    if (this.filtroIncluirActividades()) {
      filters.IncluirActividades = true;
    }
    
    if (this.filtroIncluirReportes()) {
      filters.IncluirReportes = true;
    }

    console.log('🔍 Buscando planificaciones con filtros:', filters);
    
    // Usar getAll con filtros
    this.planificacionService.getAll(filters).subscribe({
      next: (data) => {
        console.log('✅ Planificaciones cargadas:', data.length);
        this.planificaciones.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading planificaciones:', err);
        this.error.set('Error al cargar las planificaciones. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/planificaciones', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/planificaciones/nueva']);
  }

  onFiltroChange(): void {
    this.loadPlanificaciones();
  }

  clearFilters(): void {
    this.filtroTipo.set(null);
    this.filtroAnio.set(null);
    this.filtroPadre.set(null);
    this.filtroIncluirInactivos.set(false);
    this.filtroPeriodoInicio.set(null);
    this.filtroPeriodoFin.set(null);
    this.filtroProfundidad.set(null);
    this.filtroIncluirActividades.set(false);
    this.filtroIncluirReportes.set(false);
    this.planificaciones.set([]);
    this.error.set(null);
    // Recargar sin filtros
    this.loadPlanificaciones();
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  onAnioInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filtroAnio.set(value ? +value : null);
  }

  onPeriodoInicioChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filtroPeriodoInicio.set(value || null);
  }

  onPeriodoFinChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filtroPeriodoFin.set(value || null);
  }

  loadAnuales(): void {
    this.loading.set(true);
    this.error.set(null);
    this.planificaciones.set([]);

    // Construir filtros para anuales
    const filters: PlanificacionFilterDto = {};
    
    if (this.filtroAnio() !== null) {
      filters.Anio = this.filtroAnio()!;
    }
    
    if (this.filtroPadre() !== null) {
      filters.PadreId = this.filtroPadre()!;
    }
    
    if (this.filtroIncluirInactivos()) {
      filters.IncluirInactivos = true;
    }
    
    if (this.filtroPeriodoInicio()) {
      filters.PeriodoInicio = this.filtroPeriodoInicio()!;
    }
    
    if (this.filtroPeriodoFin()) {
      filters.PeriodoFin = this.filtroPeriodoFin()!;
    }

    console.log('🔍 Buscando planificaciones anuales con filtros:', filters);
    
    this.planificacionService.getAnuales(filters).subscribe({
      next: (data) => {
        console.log('✅ Planificaciones anuales cargadas:', data.length);
        this.planificaciones.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading planificaciones anuales:', err);
        this.error.set('Error al cargar las planificaciones anuales. Por favor, intenta nuevamente.');
        this.loading.set(false);
      }
    });
  }
}

