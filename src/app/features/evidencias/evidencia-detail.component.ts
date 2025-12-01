import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { EvidenciaService } from '../../core/services/evidencia.service';
import { ImageStorageService } from '../../core/services/image-storage.service';
import type { Evidencia } from '../../core/models/evidencia';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-evidencia-detail',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './evidencia-detail.component.html',
})
export class EvidenciaDetailComponent implements OnInit, OnDestroy {
  private evidenciaService = inject(EvidenciaService);
  private imageStorageService = inject(ImageStorageService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  evidencia = signal<Evidencia | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  downloadUrl = signal<SafeUrl | null>(null);
  imageError = signal(false);
  private objectUrl: string | null = null;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadEvidencia(+id);
    }
  }

  loadEvidencia(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.imageError.set(false);
    
    // Limpiar URL anterior si existe
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.evidenciaService.getById(id).subscribe({
      next: async (data) => {
        this.evidencia.set(data);
        
        // Cargar imagen desde almacenamiento local del frontend (IndexedDB)
        const storedImage = await this.imageStorageService.getImage(data.idEvidencia);
        if (storedImage) {
          // La imagen está almacenada como base64, usarla directamente
          this.downloadUrl.set(this.sanitizer.bypassSecurityTrustUrl(storedImage));
          this.imageError.set(false);
        } else {
          // No hay imagen almacenada localmente
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


  ngOnDestroy(): void {
    // Limpiar object URL cuando el componente se destruya
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
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


  isImage(rutaArchivo?: string): boolean {
    if (!rutaArchivo) return false;
    const extension = rutaArchivo.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');
  }

  onImageError(event: Event): void {
    console.error('❌ Error cargando imagen:', event);
    this.imageError.set(true);
  }

  async downloadFile(): Promise<void> {
    const evidencia = this.evidencia();
    if (!evidencia) {
      alert('No se puede descargar: Sin evidencia');
      return;
    }

    // Verificar si existe la imagen
    const hasImage = await this.imageStorageService.hasImage(evidencia.idEvidencia);
    if (!hasImage) {
      alert('No se puede descargar: No hay imagen almacenada');
      return;
    }

    // Obtener el nombre del archivo de rutaArchivo o usar un nombre por defecto
    const fileName = evidencia.rutaArchivo 
      ? (evidencia.rutaArchivo.split('/').pop() || evidencia.rutaArchivo.split('\\').pop() || 'evidencia')
      : `evidencia_${evidencia.idEvidencia}.jpg`;

    try {
      // Descargar usando el servicio de almacenamiento de imágenes (IndexedDB)
      await this.imageStorageService.downloadImage(evidencia.idEvidencia, fileName);
      console.log('✅ Descarga iniciada desde almacenamiento local');
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Error al descargar la imagen');
    }
  }
}

