import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { SubactividadService } from '../../core/services/subactividad.service';
import { CatalogosService } from '../../core/services/catalogos.service';
import { ActividadesService } from '../../core/services/actividades.service';
import type { Evidencia } from '../../core/models/evidencia';
import type { Subactividad } from '../../core/models/subactividad';
import type { TipoEvidencia } from '../../core/models/catalogos-nuevos';
import { IconComponent } from '../../shared/icon/icon.component';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { MultiSelectDropdownComponent } from '../../shared/multi-select-dropdown/multi-select-dropdown.component';

@Component({
  standalone: true,
  selector: 'app-evidencias-list',
  imports: [CommonModule, RouterModule, IconComponent, SkeletonCardComponent, ...BrnButtonImports, MultiSelectDropdownComponent],
  templateUrl: './evidencias-list.component.html',
})
export class EvidenciasListComponent implements OnInit {
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private actividadesService = inject(ActividadesService);
  private router = inject(Router);

  evidencias = signal<Evidencia[]>([]);
  subactividades = signal<Subactividad[]>([]);
  tiposEvidencia = signal<TipoEvidencia[]>([]);
  nombresActividades = signal<Map<number, string>>(new Map());
  loading = signal(false);
  error = signal<string | null>(null);

  // Vista de resumen (cards de actividades)
  resumenEvidencias = signal<any[]>([]);
  loadingResumen = signal(true);
  vistaDetalle = signal<{ idActividad: number, nombre: string } | null>(null);

  // Filtros
  busquedaTexto = signal<string>('');
  filtroTipo = signal<number[]>([]);
  filtroSeleccionadas = signal<boolean | null>(null);
  
  // Mapas para códigos y nombres
  codigosActividades = signal<Map<number, string>>(new Map());
  codigosSubactividades = signal<Map<number, string>>(new Map());
  
  // Modo selección múltiple
  modoSeleccion = signal(false);
  evidenciasSeleccionadas = signal<Set<number>>(new Set());
  eliminando = signal(false);

  actividades = signal<any[]>([]);

  ngOnInit(): void {
    this.loadSubactividades();
    this.loadTiposEvidencia();
    this.loadActividades();
    this.loadResumenEvidencias();
  }

  loadActividades(): void {
    this.actividadesService.getAll().subscribe({
      next: (data) => {
        this.actividades.set(data);
        // Crear mapa de códigos de actividades
        const codigosMap = new Map<number, string>();
        data.forEach(actividad => {
          if (actividad.codigoActividad) {
            codigosMap.set(actividad.id, actividad.codigoActividad);
          }
        });
        this.codigosActividades.set(codigosMap);
      },
      error: (err) => console.error('Error loading actividades:', err)
    });
  }

  loadSubactividades(): void {
    this.subactividadService.getAll().subscribe({
      next: (data) => {
        this.subactividades.set(data);
        // Crear mapa de códigos de subactividades
        const codigosMap = new Map<number, string>();
        data.forEach(subactividad => {
          if (subactividad.codigoSubactividad) {
            codigosMap.set(subactividad.idSubactividad, subactividad.codigoSubactividad);
          }
        });
        this.codigosSubactividades.set(codigosMap);
      },
      error: (err) => console.error('Error loading subactividades:', err)
    });
  }

  loadTiposEvidencia(): void {
    this.catalogosService.getTiposEvidencia().subscribe({
      next: (data) => this.tiposEvidencia.set(data),
      error: (err) => console.error('Error loading tipos evidencia:', err)
    });
  }

  loadResumenEvidencias(): void {
    // No cargar si ya hay una vista de detalle activa
    if (this.vistaDetalle()) {
      return;
    }
    
    this.loadingResumen.set(true);
    this.error.set(null);

    // Esperar a que las actividades estén cargadas
    if (this.actividades().length === 0) {
      setTimeout(() => this.loadResumenEvidencias(), 200);
      return;
    }

    const busqueda = this.busquedaTexto().trim().toLowerCase();

    // Cargar todas las evidencias y agrupar por actividad
    this.evidenciaService.getAll().subscribe({
      next: async (data) => {
        let filtered = data;
        
        // Aplicar búsqueda por nombre o código de actividad/subactividad
        if (busqueda) {
          filtered = filtered.filter(e => {
            // Buscar en nombre de actividad
            const nombreActividad = e.nombreActividad || this.getNombreActividad(e.idActividad) || '';
            if (nombreActividad.toLowerCase().includes(busqueda)) {
              return true;
            }
            
            // Buscar en código de actividad
            if (e.idActividad) {
              const codigoActividad = this.codigosActividades().get(e.idActividad) || '';
              if (codigoActividad.toLowerCase().includes(busqueda)) {
                return true;
              }
            }
            
            // Buscar en nombre de subactividad
            if (e.nombreSubactividad && e.nombreSubactividad.toLowerCase().includes(busqueda)) {
              return true;
            }
            
            // Buscar en código de subactividad
            if (e.idSubactividad) {
              const codigoSubactividad = this.codigosSubactividades().get(e.idSubactividad) || '';
              if (codigoSubactividad.toLowerCase().includes(busqueda)) {
                return true;
              }
            }
            
            return false;
          });
        }
        
        // Aplicar otros filtros
        if (this.filtroTipo().length > 0) {
          filtered = filtered.filter(e => e.idTipoEvidencia !== undefined && this.filtroTipo().includes(e.idTipoEvidencia));
        }
        if (this.filtroSeleccionadas() !== null) {
          filtered = filtered.filter(e => e.seleccionadaParaReporte === this.filtroSeleccionadas()!);
        }

        // Agrupar evidencias por actividad
        const evidenciasPorActividad = new Map<number, Evidencia[]>();
        filtered.forEach(evidencia => {
          if (evidencia.idActividad) {
            if (!evidenciasPorActividad.has(evidencia.idActividad)) {
              evidenciasPorActividad.set(evidencia.idActividad, []);
            }
            evidenciasPorActividad.get(evidencia.idActividad)!.push(evidencia);
          }
        });

        // Crear resumen con nombre de actividad y cantidad
        const resumen: any[] = [];
        evidenciasPorActividad.forEach((evidencias, idActividad) => {
          const actividad = this.actividades().find(a => a.id === idActividad);
          if (actividad) {
            resumen.push({
              idActividad: idActividad,
              nombre: actividad.nombre || actividad.nombreActividad || `Actividad #${idActividad}`,
              totalEvidencias: evidencias.length
            });
          }
        });

        // Ordenar por nombre
        resumen.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        this.resumenEvidencias.set(resumen);
        this.loadingResumen.set(false);
      },
      error: (err) => {
        console.error('Error loading resumen evidencias:', err);
        this.error.set('Error al cargar el resumen de evidencias');
        this.loadingResumen.set(false);
      }
    });
  }

  loadEvidencias(): void {
    this.loading.set(true);
    this.error.set(null);

    const actividadId = this.vistaDetalle()?.idActividad;
    const busqueda = this.busquedaTexto().trim().toLowerCase();

    this.evidenciaService.getAll().subscribe({
      next: async (data) => {
        let filtered = data;
        
        // Filtrar por actividad si estamos en vista de detalle
        if (actividadId) {
          filtered = filtered.filter(e => e.idActividad === actividadId);
        }
        
        // Aplicar búsqueda por nombre o código de actividad/subactividad
        if (busqueda) {
          filtered = filtered.filter(e => {
            // Buscar en nombre de actividad
            const nombreActividad = e.nombreActividad || this.getNombreActividad(e.idActividad) || '';
            if (nombreActividad.toLowerCase().includes(busqueda)) {
              return true;
            }
            
            // Buscar en código de actividad
            if (e.idActividad) {
              const codigoActividad = this.codigosActividades().get(e.idActividad) || '';
              if (codigoActividad.toLowerCase().includes(busqueda)) {
                return true;
              }
            }
            
            // Buscar en nombre de subactividad
            if (e.nombreSubactividad && e.nombreSubactividad.toLowerCase().includes(busqueda)) {
              return true;
            }
            
            // Buscar en código de subactividad
            if (e.idSubactividad) {
              const codigoSubactividad = this.codigosSubactividades().get(e.idSubactividad) || '';
              if (codigoSubactividad.toLowerCase().includes(busqueda)) {
                return true;
              }
            }
            
            return false;
          });
        }
        
        // Aplicar otros filtros
        if (this.filtroTipo().length > 0) {
          filtered = filtered.filter(e => e.idTipoEvidencia !== undefined && this.filtroTipo().includes(e.idTipoEvidencia));
        }
        if (this.filtroSeleccionadas() !== null) {
          filtered = filtered.filter(e => e.seleccionadaParaReporte === this.filtroSeleccionadas()!);
        }
        
        this.evidencias.set(filtered);
        await this.loadNombresActividades(filtered);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading evidencias:', err);
        this.error.set('Error al cargar las evidencias');
        this.loading.set(false);
      }
    });
  }

  abrirVistaDetalle(idActividad: number, nombre: string): void {
    this.vistaDetalle.set({ idActividad, nombre });
    this.loadEvidencias();
  }

  cerrarVistaDetalle(): void {
    this.vistaDetalle.set(null);
    this.loadResumenEvidencias();
  }

  async loadNombresActividades(evidencias: Evidencia[]): Promise<void> {
    const nombresMap = new Map<number, string>(this.nombresActividades());
    const actividadesIds = new Set<number>();
    
    // Recopilar todos los IDs de actividades únicos
    evidencias.forEach(evidencia => {
      if (evidencia.idActividad && !nombresMap.has(evidencia.idActividad)) {
        actividadesIds.add(evidencia.idActividad);
      }
    });

    // Cargar actividades en paralelo
    if (actividadesIds.size > 0) {
      const promesas = Array.from(actividadesIds).map(async (id) => {
        try {
          const actividad = await firstValueFrom(this.actividadesService.getById(id));
          if (actividad) {
            const nombre = actividad.nombreActividad || actividad.nombre || null;
            if (nombre) {
              nombresMap.set(id, nombre);
            }
          }
        } catch (err) {
          console.warn(`⚠️ No se pudo cargar la actividad ${id}:`, err);
        }
      });

      await Promise.all(promesas);
      this.nombresActividades.set(nombresMap);
    }
  }

  getNombreActividad(idActividad: number | undefined): string | null {
    if (!idActividad) return null;
    return this.nombresActividades().get(idActividad) || null;
  }

  navigateToCreate(): void {
    this.router.navigate(['/evidencias/nueva']);
  }

  onFiltroChange(): void {
    if (this.vistaDetalle()) {
      this.loadEvidencias();
    } else {
      this.loadResumenEvidencias();
    }
  }

  clearFilters(): void {
    this.busquedaTexto.set('');
    this.filtroTipo.set([]);
    this.filtroSeleccionadas.set(null);
    if (this.vistaDetalle()) {
      this.loadEvidencias();
    } else {
      this.loadResumenEvidencias();
    }
  }

  onBusquedaChange(): void {
    if (this.vistaDetalle()) {
      this.loadEvidencias();
    } else {
      this.loadResumenEvidencias();
    }
  }

  getTipoEvidencia(evidencia: Evidencia): 'Actividad' | 'Subactividad' {
    return evidencia.idSubactividad ? 'Subactividad' : 'Actividad';
  }

  getCodigoEvidencia(evidencia: Evidencia): string | null {
    if (evidencia.idSubactividad) {
      return this.codigosSubactividades().get(evidencia.idSubactividad) || null;
    } else if (evidencia.idActividad) {
      return this.codigosActividades().get(evidencia.idActividad) || null;
    }
    return null;
  }

  getTiposEvidenciaOptions() {
    return this.tiposEvidencia().map(tipo => ({
      id: tipo.idTipoEvidencia,
      label: tipo.nombre
    }));
  }

  toggleModoSeleccion(): void {
    this.modoSeleccion.set(!this.modoSeleccion());
    if (!this.modoSeleccion()) {
      // Si se desactiva el modo selección, limpiar selección
      this.evidenciasSeleccionadas.set(new Set());
    }
  }

  toggleSeleccionEvidencia(evidenciaId: number, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Evitar que se active el click en la card
    }
    
    const seleccionadas = new Set(this.evidenciasSeleccionadas());
    if (seleccionadas.has(evidenciaId)) {
      seleccionadas.delete(evidenciaId);
    } else {
      seleccionadas.add(evidenciaId);
    }
    this.evidenciasSeleccionadas.set(seleccionadas);
  }

  isEvidenciaSeleccionada(evidenciaId: number): boolean {
    return this.evidenciasSeleccionadas().has(evidenciaId);
  }

  seleccionarTodas(): void {
    const todas = new Set(this.evidencias().map(e => e.idEvidencia));
    this.evidenciasSeleccionadas.set(todas);
  }

  deseleccionarTodas(): void {
    this.evidenciasSeleccionadas.set(new Set());
  }

  get totalSeleccionadas(): number {
    return this.evidenciasSeleccionadas().size;
  }

  eliminarSeleccionadas(): void {
    const seleccionadas = Array.from(this.evidenciasSeleccionadas());
    if (seleccionadas.length === 0) {
      return;
    }

    const mensaje = seleccionadas.length === 1
      ? '¿Está seguro de que desea eliminar esta evidencia?'
      : `¿Está seguro de que desea eliminar las ${seleccionadas.length} evidencias seleccionadas?`;

    if (!confirm(mensaje)) {
      return;
    }

    this.eliminando.set(true);
    this.error.set(null);

    // Eliminar evidencias en paralelo
    const deleteObservables = seleccionadas.map(id => 
      this.evidenciaService.delete(id)
    );

    // Usar forkJoin para esperar todas las eliminaciones
    forkJoin(deleteObservables).subscribe({
      next: () => {
        console.log(`✅ ${seleccionadas.length} evidencia(s) eliminada(s) correctamente`);
        this.evidenciasSeleccionadas.set(new Set());
        this.modoSeleccion.set(false);
        this.eliminando.set(false);
        if (this.vistaDetalle()) {
          this.loadEvidencias(); // Recargar la lista
        } else {
          this.loadResumenEvidencias(); // Recargar el resumen
        }
      },
      error: (err) => {
        console.error('Error eliminando evidencias:', err);
        this.error.set('Error al eliminar algunas evidencias');
        this.eliminando.set(false);
        if (this.vistaDetalle()) {
          this.loadEvidencias(); // Recargar de todas formas para actualizar
        } else {
          this.loadResumenEvidencias(); // Recargar el resumen
        }
      }
    });
  }

  navigateToDetail(id: number, event?: Event): void {
    if (this.modoSeleccion()) {
      // Si está en modo selección, no navegar, solo seleccionar
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      this.toggleSeleccionEvidencia(id, event);
    } else {
      this.router.navigate(['/evidencias', id]);
    }
  }

}

