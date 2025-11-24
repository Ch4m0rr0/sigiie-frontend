import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SubactividadService } from '../../core/services/subactividad.service';
import { ActividadesService } from '../../core/services/actividades.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Subactividad } from '../../core/models/subactividad';
import type { Actividad } from '../../core/models/actividad';
import type { TipoSubactividad } from '../../core/models/catalogos-nuevos';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-subactividades-list',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './subactividades-list.component.html',
})
export class SubactividadesListComponent implements OnInit {
  private subactividadService = inject(SubactividadService);
  private actividadesService = inject(ActividadesService);
  private catalogosService = inject(CatalogosService);
  private router = inject(Router);

  subactividades = signal<Subactividad[]>([]);
  actividades = signal<Actividad[]>([]);
  tiposSubactividad = signal<TipoSubactividad[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros
  filtroActividad = signal<number | null>(null);
  filtroTipo = signal<number | null>(null);
  filtroActivo = signal<boolean | null>(null);

  ngOnInit(): void {
    this.loadActividades();
    this.loadTiposSubactividad();
    this.loadSubactividades();
  }

  loadActividades(): void {
    this.actividadesService.list().subscribe({
      next: (data) => this.actividades.set(data),
      error: (err) => console.error('Error loading actividades:', err)
    });
  }

  loadTiposSubactividad(): void {
    this.catalogosService.getTiposSubactividad().subscribe({
      next: (data) => this.tiposSubactividad.set(data),
      error: (err) => console.error('Error loading tipos subactividad:', err)
    });
  }

  loadSubactividades(): void {
    this.loading.set(true);
    this.error.set(null);

    // Si hay filtro por actividad, usar ese endpoint
    if (this.filtroActividad()) {
      this.subactividadService.getByActividad(this.filtroActividad()!).subscribe({
        next: (data) => {
          let filtered = data;
          if (this.filtroTipo()) {
            filtered = filtered.filter(s => s.idTipoSubactividad === this.filtroTipo()!);
          }
          if (this.filtroActivo() !== null) {
            filtered = filtered.filter(s => s.activo === this.filtroActivo()!);
          }
          this.subactividades.set(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading subactividades:', err);
          this.error.set('Error al cargar las subactividades');
          this.loading.set(false);
        }
      });
    } else {
      // Cargar todas y aplicar filtros
      this.subactividadService.getAll().subscribe({
        next: (data) => {
          let filtered = data;
          if (this.filtroTipo()) {
            filtered = filtered.filter(s => s.idTipoSubactividad === this.filtroTipo()!);
          }
          if (this.filtroActivo() !== null) {
            filtered = filtered.filter(s => s.activo === this.filtroActivo()!);
          }
          this.subactividades.set(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading subactividades:', err);
          this.error.set('Error al cargar las subactividades');
          this.loading.set(false);
        }
      });
    }
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/subactividades', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/subactividades/nueva']);
  }

  onFiltroChange(): void {
    this.loadSubactividades();
  }

  clearFilters(): void {
    this.filtroActividad.set(null);
    this.filtroTipo.set(null);
    this.filtroActivo.set(null);
    this.loadSubactividades();
  }
}

