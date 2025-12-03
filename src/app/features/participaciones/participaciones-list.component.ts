import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ParticipacionService } from '../../core/services/participacion.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { PersonasService } from '../../core/services/personas.service';
import { ActividadesService } from '../../core/services/actividades.service';
import type { Participacion } from '../../core/models/participacion';
import type { Subactividad } from '../../core/models/subactividad';
import type { RolEquipo } from '../../core/models/catalogos-nuevos';
import type { Actividad } from '../../core/models/actividad';
import type { Estudiante } from '../../core/models/estudiante';
import type { Docente } from '../../core/models/docente';
import type { Administrativo } from '../../core/models/administrativo';
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
  private actividadesService = inject(ActividadesService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  participaciones = signal<Participacion[]>([]);
  subactividades = signal<Subactividad[]>([]);
  actividades = signal<Actividad[]>([]);
  estudiantes = signal<Estudiante[]>([]);
  docentes = signal<Docente[]>([]);
  administrativos = signal<Administrativo[]>([]);
  rolesEquipo = signal<RolEquipo[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filtros avanzados
  filtroActividad = signal<number | null>(null);
  filtroSubactividad = signal<number | null>(null);
  filtroAnio = signal<number | null>(null);
  busquedaTexto = signal<string>('');
  filtroEstudiante = signal<number | null>(null);
  filtroDocente = signal<number | null>(null);
  filtroAdmin = signal<number | null>(null);
  esParticipacionSubactividad = signal<boolean | null>(null);
  fechaRegistroDesde = signal<string>('');
  fechaRegistroHasta = signal<string>('');
  
  // Filtros legacy (mantener para compatibilidad)
  filtroRolEquipo = signal<number | null>(null);
  filtroGrupo = signal<number | null>(null);

  ngOnInit(): void {
    // Leer query params para filtrar por actividad si viene desde el detalle
    this.route.queryParams.subscribe(params => {
      if (params['idActividad']) {
        this.filtroActividad.set(+params['idActividad']);
        // Recargar participaciones cuando cambie el filtro
        this.loadParticipaciones();
      }
    });
    
    this.loadCatalogos();
    this.loadParticipaciones();
  }

  loadCatalogos(): void {
    forkJoin({
      subactividades: this.subactividadService.getAll(),
      actividades: this.actividadesService.getAll(),
      estudiantes: this.personasService.listEstudiantes(),
      docentes: this.personasService.listDocentes(),
      administrativos: this.personasService.listAdministrativos(),
      rolesEquipo: this.catalogosService.getRolesEquipo()
    }).subscribe({
      next: (data) => {
        this.subactividades.set(data.subactividades);
        this.actividades.set(data.actividades);
        this.estudiantes.set(data.estudiantes);
        this.docentes.set(data.docentes);
        this.administrativos.set(data.administrativos);
        this.rolesEquipo.set(data.rolesEquipo);
      },
      error: (err) => {
        console.error('Error loading catalogos:', err);
        this.error.set('Error al cargar los catálogos');
      }
    });
  }

  loadParticipaciones(): void {
    this.loading.set(true);
    this.error.set(null);

    // Construir objeto de filtros
    const filtros: any = {};
    
    if (this.filtroActividad()) {
      filtros.idActividad = this.filtroActividad()!;
    }
    if (this.filtroSubactividad()) {
      filtros.idSubactividad = this.filtroSubactividad()!;
    }
    if (this.filtroAnio()) {
      filtros.anio = this.filtroAnio()!;
    }
    if (this.busquedaTexto().trim()) {
      filtros.busquedaTexto = this.busquedaTexto().trim();
    }
    if (this.filtroEstudiante()) {
      filtros.idEstudiante = this.filtroEstudiante()!;
    }
    if (this.filtroDocente()) {
      filtros.idDocente = this.filtroDocente()!;
    }
    if (this.filtroAdmin()) {
      filtros.idAdmin = this.filtroAdmin()!;
    }
    if (this.esParticipacionSubactividad() !== null) {
      filtros.esParticipacionSubactividad = this.esParticipacionSubactividad()!;
    }
    if (this.fechaRegistroDesde()) {
      filtros.fechaRegistroDesde = this.fechaRegistroDesde();
    }
    if (this.fechaRegistroHasta()) {
      filtros.fechaRegistroHasta = this.fechaRegistroHasta();
    }

    // Usar el método de filtrado avanzado
    this.participacionService.filtrar(filtros).subscribe({
      next: (data) => {
        // Aplicar filtros legacy del lado del cliente si es necesario
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
    this.filtroActividad.set(null);
    this.filtroSubactividad.set(null);
    this.filtroAnio.set(null);
    this.busquedaTexto.set('');
    this.filtroEstudiante.set(null);
    this.filtroDocente.set(null);
    this.filtroAdmin.set(null);
    this.esParticipacionSubactividad.set(null);
    this.fechaRegistroDesde.set('');
    this.fechaRegistroHasta.set('');
    this.filtroRolEquipo.set(null);
    this.filtroGrupo.set(null);
    this.loadParticipaciones();
  }

  onBusquedaTextoChange(value: string): void {
    this.busquedaTexto.set(value);
    // Debounce: esperar 500ms antes de buscar
    setTimeout(() => {
      if (this.busquedaTexto() === value) {
        this.loadParticipaciones();
      }
    }, 500);
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

