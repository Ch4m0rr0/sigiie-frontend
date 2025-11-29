import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EvidenciaService } from '../../core/services/evidencia.service';
import type { Evidencia } from '../../core/models/evidencia';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-evidencia-detail',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './evidencia-detail.component.html',
})
export class EvidenciaDetailComponent implements OnInit {
  private evidenciaService = inject(EvidenciaService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  evidencia = signal<Evidencia | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  downloadUrl = signal<SafeUrl | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEvidencia(+id);
    }
  }

  loadEvidencia(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.evidenciaService.getById(id).subscribe({
      next: (data) => {
        this.evidencia.set(data);
        if (data.rutaArchivo) {
          // El backend devuelve una ruta relativa como "/storage/evidencias/archivo.ext"
          // Necesitamos usar la URL completa del backend porque el proxy solo maneja /api
          const backendBase = this.getBackendBaseUrl();
          const url = `${backendBase}${data.rutaArchivo}`;
          this.downloadUrl.set(this.sanitizer.bypassSecurityTrustUrl(url));
        } else {
          this.downloadUrl.set(null);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading evidencia:', err);
        this.error.set('Error al cargar la evidencia');
        this.loading.set(false);
      }
    });
  }

  navigateToEdit(): void {
    const id = this.evidencia()?.idEvidencia;
    if (id) {
      this.router.navigate(['/evidencias', id, 'editar']);
    }
  }

  onDelete(): void {
    const id = this.evidencia()?.idEvidencia;
    if (id && confirm('¿Está seguro de que desea eliminar esta evidencia?')) {
      this.evidenciaService.delete(id).subscribe({
        next: () => this.router.navigate(['/evidencias']),
        error: (err) => {
          console.error('Error deleting evidencia:', err);
          this.error.set('Error al eliminar la evidencia');
        }
      });
    }
  }

  toggleSeleccionada(): void {
    const evidencia = this.evidencia();
    if (evidencia) {
      const nuevoEstado = !evidencia.seleccionadaParaReporte;
      this.evidenciaService.marcarParaReporte(evidencia.idEvidencia, nuevoEstado).subscribe({
        next: () => {
          evidencia.seleccionadaParaReporte = nuevoEstado;
          this.evidencia.set({ ...evidencia });
        },
        error: (err) => {
          console.error('Error updating evidencia:', err);
          this.error.set('Error al actualizar la evidencia');
        }
      });
    }
  }

  isImage(rutaArchivo?: string): boolean {
    if (!rutaArchivo) return false;
    const extension = rutaArchivo.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
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

