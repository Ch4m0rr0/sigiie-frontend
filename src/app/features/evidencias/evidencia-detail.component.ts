import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EvidenciaService } from '../../core/services/evidencia.service';
import type { Evidencia } from '../../core/models/evidencia';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

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
  imageError = signal(false);

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
        if (data.rutaArchivo && this.isImage(data.rutaArchivo)) {
          // Usar el endpoint del API para obtener la imagen
          const url = this.evidenciaService.getFileUrl(data.idEvidencia);
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

  onImageError(event: Event): void {
    console.error('Error loading image:', event);
    this.imageError.set(true);
  }
}

