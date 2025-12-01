import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Evidencia } from '../../core/models/evidencia';
import type { Subactividad } from '../../core/models/subactividad';
import type { TipoEvidencia } from '../../core/models/catalogos-nuevos';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { MultiSelectDropdownComponent } from '../../shared/multi-select-dropdown/multi-select-dropdown.component';

@Component({
  standalone: true,
  selector: 'app-evidencias-list',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports, MultiSelectDropdownComponent],
  templateUrl: './evidencias-list.component.html',
})
export class EvidenciasListComponent implements OnInit {
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private router = inject(Router);

  evidencias = signal<Evidencia[]>([]);
  subactividades = signal<Subactividad[]>([]);
  tiposEvidencia = signal<TipoEvidencia[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros
  filtroSubactividad = signal<number | null>(null);
  filtroTipo = signal<number[]>([]);
  filtroSeleccionadas = signal<boolean | null>(null);

  ngOnInit(): void {
    this.loadSubactividades();
    this.loadTiposEvidencia();
    this.loadEvidencias();
  }

  loadSubactividades(): void {
    this.subactividadService.getAll().subscribe({
      next: (data) => this.subactividades.set(data),
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  loadTiposEvidencia(): void {
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => this.tiposEvidencia.set(data),
      error: (err) => console.error('Error loading tipos evidencia:', err)
    });
  }

  loadEvidencias(): void {
    this.loading.set(true);
    this.error.set(null);

    // Si hay filtro por subactividad, usar ese endpoint
    if (this.filtroSubactividad()) {
      this.evidenciaService.getBySubactividad(this.filtroSubactividad()!).subscribe({
        next: (data) => {
          let filtered = data;
          if (this.filtroTipo().length > 0) {
            filtered = filtered.filter(e => e.idTipoEvidencia !== undefined && this.filtroTipo().includes(e.idTipoEvidencia));
          }
          if (this.filtroSeleccionadas() !== null) {
            filtered = filtered.filter(e => e.seleccionadaParaReporte === this.filtroSeleccionadas()!);
          }
          this.evidencias.set(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading evidencias:', err);
          this.error.set('Error al cargar las evidencias');
          this.loading.set(false);
        }
      });
    } else {
      this.evidenciaService.getAll().subscribe({
        next: (data) => {
          let filtered = data;
          if (this.filtroTipo().length > 0) {
            filtered = filtered.filter(e => e.idTipoEvidencia !== undefined && this.filtroTipo().includes(e.idTipoEvidencia));
          }
          if (this.filtroSeleccionadas() !== null) {
            filtered = filtered.filter(e => e.seleccionadaParaReporte === this.filtroSeleccionadas()!);
          }
          this.evidencias.set(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading evidencias:', err);
          this.error.set('Error al cargar las evidencias');
          this.loading.set(false);
        }
      });
    }
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/evidencias', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/evidencias/nueva']);
  }

  onFiltroChange(): void {
    this.loadEvidencias();
  }

  clearFilters(): void {
    this.filtroSubactividad.set(null);
    this.filtroTipo.set([]);
    this.filtroSeleccionadas.set(null);
    this.loadEvidencias();
  }

  getTiposEvidenciaOptions() {
    return this.tiposEvidencia().map(tipo => ({
      id: tipo.idTipoEvidencia,
      label: tipo.nombre
    }));
  }

}

