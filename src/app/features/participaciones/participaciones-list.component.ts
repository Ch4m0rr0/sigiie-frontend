import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ParticipacionService } from '../../core/services/participacion.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { PersonasService } from '../../core/services/personas.service';
import type { Participacion } from '../../core/models/participacion';
import type { Subactividad } from '../../core/models/subactividad';
import type { RolEquipo } from '../../core/models/catalogos-nuevos';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';

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
  private personasService = inject(PersonasService);
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
          this.enriquecerParticipaciones(filtered);
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
          this.enriquecerParticipaciones(filtered);
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

  /**
   * Enriquece las participaciones con nombres desde los catálogos cuando no están disponibles
   */
  private enriquecerParticipaciones(participaciones: Participacion[]): void {
    // Si las participaciones ya tienen los nombres desde el backend, usarlas directamente
    // Solo enriquecer si faltan nombres
    const participacionesEnriquecidas = participaciones.map((p) => {
      // Verificar si necesita enriquecimiento
      const necesitaEnriquecimiento = (!p.nombreSubactividad && p.idSubactividad) || 
                                      (!p.nombreRolEquipo && p.idRolEquipo);
      
      // Si no necesita enriquecimiento, devolver la participación original
      if (!necesitaEnriquecimiento) {
        return p;
      }
      
      // Solo crear copia si vamos a modificar
      const participacion = { ...p };
      
      // Completar nombreSubactividad desde el catálogo de subactividades
      if (!participacion.nombreSubactividad && participacion.idSubactividad) {
        const subactividad = this.subactividades().find(s => s.idSubactividad === participacion.idSubactividad);
        if (subactividad) {
          participacion.nombreSubactividad = subactividad.nombre;
        }
      }
      
      // Completar nombreRolEquipo desde el catálogo de roles
      if (!participacion.nombreRolEquipo && participacion.idRolEquipo) {
        const rol = this.rolesEquipo().find(r => r.idRolEquipo === participacion.idRolEquipo);
        if (rol) {
          participacion.nombreRolEquipo = rol.nombre;
        }
      }
      
      return participacion;
    });
    
    // Si aún faltan nombres de tutores, obtenerlos del backend
    const tutoresFaltantes = participacionesEnriquecidas.filter(p => 
      !p.nombreTutor && p.idTutor
    );
    
    if (tutoresFaltantes.length > 0) {
      // Obtener IDs únicos de tutores para evitar consultas duplicadas
      const tutorIdsUnicos = [...new Set(tutoresFaltantes.map(p => p.idTutor!))];
      
      // Obtener todos los tutores únicos en paralelo
      const tutorRequests = tutorIdsUnicos.map(id => 
        this.personasService.getDocente(id).pipe(
          map(docente => ({ idTutor: id, tutor: docente }))
        )
      );
      
      forkJoin(tutorRequests).subscribe({
        next: (resultados) => {
          // Crear un mapa de ID de tutor a nombre
          const tutorMap = new Map<number, string>();
          resultados.forEach(r => {
            if (r.tutor && r.idTutor) {
              tutorMap.set(r.idTutor, r.tutor.nombreCompleto);
            }
          });
          
          // Aplicar los nombres de tutores
          const finales = participacionesEnriquecidas.map(p => {
            if (!p.nombreTutor && p.idTutor && tutorMap.has(p.idTutor)) {
              return { ...p, nombreTutor: tutorMap.get(p.idTutor)! };
            }
            return p;
          });
          
          this.participaciones.set(finales);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error obteniendo tutores:', err);
          // Aún así, mostrar las participaciones con los datos que tenemos
          this.participaciones.set(participacionesEnriquecidas);
          this.loading.set(false);
        }
      });
    } else {
      // No hay tutores faltantes, solo establecer las participaciones
      this.participaciones.set(participacionesEnriquecidas);
      this.loading.set(false);
    }
  }
}

