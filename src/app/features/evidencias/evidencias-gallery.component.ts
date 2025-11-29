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
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-evidencias-gallery',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './evidencias-gallery.component.html',
})
export class EvidenciasGalleryComponent implements OnInit {
  private evidenciaService = inject(EvidenciaService);
  private subactividadService = inject(SubactividadService);
  private catalogosService = inject(CatalogosService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  evidencias = signal<Evidencia[]>([]);
  subactividades = signal<Subactividad[]>([]);
  tiposEvidencia = signal<TipoEvidencia[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  previewUrls = signal<Map<number, SafeUrl>>(new Map());

  // Filtros
  filtroSubactividad = signal<number | null>(null);
  filtroTipo = signal<number | null>(null);
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

    let observable;
    if (this.filtroSubactividad()) {
      observable = this.evidenciaService.getBySubactividad(this.filtroSubactividad()!);
    } else {
      observable = this.evidenciaService.getAll();
    }

    observable.subscribe({
      next: (data) => {
        let filtered = data;
        if (this.filtroTipo()) {
          filtered = filtered.filter(e => e.idTipoEvidencia === this.filtroTipo()!);
        }
        if (this.filtroSeleccionadas() !== null) {
          filtered = filtered.filter(e => e.seleccionadaParaReporte === this.filtroSeleccionadas()!);
        }
        this.evidencias.set(filtered);
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
    const backendBase = this.getBackendBaseUrl();
    evidencias.forEach(evidencia => {
      if (evidencia.rutaArchivo && this.isImage(evidencia.rutaArchivo)) {
        // El backend devuelve una ruta relativa como "/storage/evidencias/archivo.ext"
        // Necesitamos usar la URL completa del backend porque el proxy solo maneja /api
        const url = `${backendBase}${evidencia.rutaArchivo}`;
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(url);
        const urls = this.previewUrls();
        urls.set(evidencia.idEvidencia, safeUrl);
        this.previewUrls.set(new Map(urls));
      }
    });
  }

  isImage(rutaArchivo?: string): boolean {
    if (!rutaArchivo) return false;
    const extension = rutaArchivo.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
  }

  toggleSeleccionada(id: number, seleccionada: boolean): void {
    this.evidenciaService.marcarParaReporte(id, seleccionada).subscribe({
      next: () => {
        const evidencias = this.evidencias();
        const index = evidencias.findIndex(e => e.idEvidencia === id);
        if (index > -1) {
          evidencias[index].seleccionadaParaReporte = seleccionada;
          this.evidencias.set([...evidencias]);
        }
      },
      error: (err) => {
        console.error('Error updating evidencia:', err);
        this.error.set('Error al actualizar la evidencia');
      }
    });
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/evidencias', id]);
  }

  onFiltroChange(): void {
    this.loadEvidencias();
  }

  clearFilters(): void {
    this.filtroSubactividad.set(null);
    this.filtroTipo.set(null);
    this.filtroSeleccionadas.set(null);
    this.loadEvidencias();
  }

  /**
   * Obtiene la URL base del backend desde environment.apiUrl
   * Si apiUrl es absoluta (https://...), extrae la base URL
   * Si apiUrl es relativa (/api), usa window.location.origin
   */
  private getBackendBaseUrl(): string {
    const apiUrl = environment.apiUrl;
    // Si apiUrl es absoluta (contiene http:// o https://), extraer la base URL
    if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
      try {
        const url = new URL(apiUrl);
        return `${url.protocol}//${url.host}`;
      } catch {
        // Si falla el parsing, usar window.location.origin como fallback
        return window.location.origin;
      }
    }
    // Si apiUrl es relativa, usar window.location.origin
    return window.location.origin;
  }
}

