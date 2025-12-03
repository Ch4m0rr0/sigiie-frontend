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
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MultiSelectDropdownComponent } from '../../shared/multi-select-dropdown/multi-select-dropdown.component';

@Component({
  standalone: true,
  selector: 'app-evidencias-gallery',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports, MultiSelectDropdownComponent],
  templateUrl: './evidencias-gallery.component.html',
})
export class EvidenciasGalleryComponent implements OnInit {
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private actividadesService = inject(ActividadesService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  evidencias = signal<Evidencia[]>([]);
  subactividades = signal<Subactividad[]>([]);
  tiposEvidencia = signal<TipoEvidencia[]>([]);
  nombresActividades = signal<Map<number, string>>(new Map());
  loading = signal(false);
  error = signal<string | null>(null);
  previewUrls = signal<Map<number, SafeUrl>>(new Map());

  // Filtros
  filtroSubactividad = signal<number | null>(null);
  filtroTipo = signal<number[]>([]);
  filtroSeleccionadas = signal<boolean | null>(null);
  
  // Modo selección múltiple
  modoSeleccion = signal(false);
  evidenciasSeleccionadas = signal<Set<number>>(new Set());
  eliminando = signal(false);

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

    let observable;
    if (this.filtroSubactividad()) {
      observable = this.evidenciaService.getBySubactividad(this.filtroSubactividad()!);
    } else {
      observable = this.evidenciaService.getAll();
    }

    observable.subscribe({
      next: async (data) => {
        let filtered = data;
        if (this.filtroTipo().length > 0) {
          filtered = filtered.filter(e => e.idTipoEvidencia !== undefined && this.filtroTipo().includes(e.idTipoEvidencia));
        }
        if (this.filtroSeleccionadas() !== null) {
          filtered = filtered.filter(e => e.seleccionadaParaReporte === this.filtroSeleccionadas()!);
        }
        this.evidencias.set(filtered);
        await this.loadNombresActividades(filtered);
        this.loadPreviews(filtered);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading evidencias:', err);
        this.error.set('Error al cargar las evidencias');
        this.loading.set(false);
      }
    });
  }

  loadPreviews(evidencias: Evidencia[]): void {
    const newUrls = new Map<number, SafeUrl>();
    evidencias.forEach(evidencia => {
      if (evidencia.rutaArchivo && this.isImage(evidencia.rutaArchivo)) {
        // Usar el endpoint del API para obtener la imagen
        // IMPORTANTE: Usar idEvidencia (15, 16, 18, etc.) y NO idTipoEvidencia (0, 1, 2, etc.)
        // Para la galería, usamos la URL directa ya que cargar muchos blobs puede ser pesado
        const url = this.evidenciaService.getFileUrl(evidencia.idEvidencia);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(url);
        newUrls.set(evidencia.idEvidencia, safeUrl);
      }
    });
    // Actualizar todas las URLs de una vez
    this.previewUrls.set(newUrls);
  }

  isImage(rutaArchivo?: string): boolean {
    if (!rutaArchivo) return false;
    const extension = rutaArchivo.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
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
        this.loadEvidencias(); // Recargar la lista
      },
      error: (err) => {
        console.error('Error eliminando evidencias:', err);
        this.error.set('Error al eliminar algunas evidencias');
        this.eliminando.set(false);
        this.loadEvidencias(); // Recargar de todas formas para actualizar
      }
    });
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
}

