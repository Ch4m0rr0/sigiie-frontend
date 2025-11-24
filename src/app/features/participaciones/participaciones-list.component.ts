import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ParticipacionService } from '../../core/services/participacion.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Participacion } from '../../core/models/participacion';
import type { Subactividad } from '../../core/models/subactividad';
import type { RolEquipo } from '../../core/models/catalogos-nuevos';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-participaciones-list',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './participaciones-list.component.html',
})
export class ParticipacionesListComponent implements OnInit {
  private participacionService = inject(ParticipacionService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private router = inject(Router);

  participaciones = signal<Participacion[]>([]);
  subactividades = signal<Subactividad[]>([]);
  rolesEquipo = signal<RolEquipo[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros
  filtroSubactividad = signal<number | null>(null);
  filtroRolEquipo = signal<number | null>(null);
  filtroGrupo = signal<number | null>(null);

  ngOnInit(): void {
    this.loadSubactividades();
    this.loadRolesEquipo();
    this.loadParticipaciones();
  }

  loadSubactividades(): void {
    this.subactividadService.getAll().subscribe({
      next: (data) => this.subactividades.set(data),
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  loadRolesEquipo(): void {
    this.catalogosService.getRolesEquipo().subscribe({
      next: (data) => this.rolesEquipo.set(data),
      error: (err) => console.error('Error loading roles equipo:', err)
    });
  }

  loadParticipaciones(): void {
    this.loading.set(true);
    this.error.set(null);

    // Si hay filtro por subactividad, usar ese endpoint
    if (this.filtroSubactividad()) {
      this.participacionService.getBySubactividad(this.filtroSubactividad()!).subscribe({
        next: (data) => {
          let filtered = data;
          if (this.filtroRolEquipo()) {
            filtered = filtered.filter(p => p.idRolEquipo === this.filtroRolEquipo()!);
          }
          if (this.filtroGrupo()) {
            filtered = filtered.filter(p => p.grupoNumero === this.filtroGrupo()!);
          }
          this.participaciones.set(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading participaciones:', err);
          this.error.set('Error al cargar las participaciones');
          this.loading.set(false);
        }
      });
    } else {
      this.participacionService.getAll().subscribe({
        next: (data) => {
          let filtered = data;
          if (this.filtroRolEquipo()) {
            filtered = filtered.filter(p => p.idRolEquipo === this.filtroRolEquipo()!);
          }
          if (this.filtroGrupo()) {
            filtered = filtered.filter(p => p.grupoNumero === this.filtroGrupo()!);
          }
          this.participaciones.set(filtered);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading participaciones:', err);
          this.error.set('Error al cargar las participaciones');
          this.loading.set(false);
        }
      });
    }
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/participaciones', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/participaciones/nueva']);
  }

  onFiltroChange(): void {
    this.loadParticipaciones();
  }

  clearFilters(): void {
    this.filtroSubactividad.set(null);
    this.filtroRolEquipo.set(null);
    this.filtroGrupo.set(null);
    this.loadParticipaciones();
  }
}

