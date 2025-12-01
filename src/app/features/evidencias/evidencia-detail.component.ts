import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
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
export class EvidenciaDetailComponent implements OnInit, OnDestroy {
  private evidenciaService = inject(EvidenciaService);
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
    this.attemptCount = 0; // Resetear contador de intentos
    
    // Limpiar URL anterior si existe
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.evidenciaService.getById(id).subscribe({
      next: (data) => {
        this.evidencia.set(data);
        console.log('📋 Evidencia cargada:', data);
        console.log('📁 rutaArchivo:', data.rutaArchivo);
        
        if (data.rutaArchivo && this.isImage(data.rutaArchivo)) {
          // Intentar construir la URL de la imagen basándose en rutaArchivo
          this.buildImageUrl(data.rutaArchivo, data.idEvidencia);
        } else {
          this.downloadUrl.set(null);
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading evidencia:', err);
        this.error.set('Error al cargar la evidencia');
        this.loading.set(false);
      }
    });
  }

  buildImageUrl(rutaArchivo: string, idEvidencia: number): void {
    console.log('🖼️ Construyendo URL para imagen. rutaArchivo:', rutaArchivo);
    
    // Verificar si rutaArchivo es una URL completa
    if (this.isValidUrl(rutaArchivo)) {
      console.log('✅ Es una URL completa, usando directamente');
      this.downloadUrl.set(this.sanitizer.bypassSecurityTrustUrl(rutaArchivo));
      this.loading.set(false);
      return;
    }

    // Si no es una URL completa, intentar diferentes estrategias
    const baseUrl = this.evidenciaService.getBaseUrl();
    const apiBaseUrl = 'https://localhost:7041'; // URL base del backend
    
    // Intentar múltiples opciones
    const posiblesUrls: string[] = [];
    
    // Opción 1: Si rutaArchivo comienza con /, usar directamente
    if (rutaArchivo.startsWith('/')) {
      posiblesUrls.push(`${apiBaseUrl}${rutaArchivo}`);
      posiblesUrls.push(`${baseUrl}${rutaArchivo}`);
    }
    // Opción 2: Si tiene barras, normalizar y construir
    else if (rutaArchivo.includes('/') || rutaArchivo.includes('\\')) {
      const normalizedPath = rutaArchivo.replace(/\\/g, '/');
      const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
      posiblesUrls.push(`${apiBaseUrl}${cleanPath}`);
      posiblesUrls.push(`${baseUrl}${cleanPath}`);
    }
    // Opción 3: Solo nombre de archivo
    else {
      posiblesUrls.push(`${apiBaseUrl}/uploads/evidencias/${rutaArchivo}`);
      posiblesUrls.push(`${apiBaseUrl}/wwwroot/uploads/evidencias/${rutaArchivo}`);
      posiblesUrls.push(`${apiBaseUrl}/Files/Evidencias/${rutaArchivo}`);
      posiblesUrls.push(`${baseUrl}/uploads/evidencias/${rutaArchivo}`);
    }
    
    // Opción 4: Intentar con el ID de la evidencia
    posiblesUrls.push(`${apiBaseUrl}/api/evidencias/${idEvidencia}/archivo`);
    posiblesUrls.push(`${apiBaseUrl}/api/evidencias/${idEvidencia}/file`);

    console.log('🔍 URLs a intentar:', posiblesUrls);
    
    // Intentar cargar la primera URL
    const primeraUrl = posiblesUrls[0];
    console.log('🎯 Intentando cargar:', primeraUrl);
    this.downloadUrl.set(this.sanitizer.bypassSecurityTrustUrl(primeraUrl));
    this.loading.set(false);
  }

  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
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
    const evidencia = this.evidencia();
    if (evidencia && evidencia.rutaArchivo) {
      // Intentar con otra URL si la primera falló
      this.tryAlternativeImageUrl(evidencia.rutaArchivo, evidencia.idEvidencia);
    } else {
      this.imageError.set(true);
    }
  }

  private attemptCount = 0;
  private maxAttempts = 3;

  tryAlternativeImageUrl(rutaArchivo: string, idEvidencia: number): void {
    this.attemptCount++;
    
    if (this.attemptCount > this.maxAttempts) {
      console.error('❌ Se agotaron los intentos para cargar la imagen');
      this.imageError.set(true);
      return;
    }
    
    console.log(`🔄 Intento ${this.attemptCount}/${this.maxAttempts} - URL alternativa para:`, rutaArchivo);
    const apiBaseUrl = 'https://localhost:7041';
    
    // Construir URLs alternativas según el intento
    let alternativeUrl: string;
    
    if (this.attemptCount === 1) {
      // Primer intento: wwwroot/uploads
      if (rutaArchivo.startsWith('/')) {
        alternativeUrl = `${apiBaseUrl}/wwwroot${rutaArchivo}`;
      } else {
        alternativeUrl = `${apiBaseUrl}/wwwroot/uploads/${rutaArchivo}`;
      }
    } else if (this.attemptCount === 2) {
      // Segundo intento: Files/Evidencias
      const fileName = rutaArchivo.split('/').pop() || rutaArchivo.split('\\').pop() || rutaArchivo;
      alternativeUrl = `${apiBaseUrl}/Files/Evidencias/${fileName}`;
    } else {
      // Tercer intento: ruta directa desde apiBaseUrl
      if (rutaArchivo.startsWith('/')) {
        alternativeUrl = `${apiBaseUrl}${rutaArchivo}`;
      } else {
        alternativeUrl = `${apiBaseUrl}/${rutaArchivo}`;
      }
    }
    
    console.log('🎯 Intentando URL alternativa:', alternativeUrl);
    this.imageError.set(false); // Resetear el error para intentar de nuevo
    this.downloadUrl.set(this.sanitizer.bypassSecurityTrustUrl(alternativeUrl));
  }

  downloadFile(): void {
    const evidencia = this.evidencia();
    if (!evidencia) {
      alert('No se puede descargar: Sin archivos');
      return;
    }

    // Guardar rutaArchivo en una variable para que TypeScript sepa que no es undefined
    const rutaArchivo = evidencia.rutaArchivo;
    if (!rutaArchivo) {
      alert('No se puede descargar: Sin archivos');
      return;
    }

    this.loading.set(true);
    const downloadUrlValue = this.downloadUrl();
    
    if (!downloadUrlValue) {
      alert('No se puede descargar: URL no disponible');
      this.loading.set(false);
      return;
    }

    // Convertir SafeUrl a string
    let urlString: string;
    if (typeof downloadUrlValue === 'string') {
      urlString = downloadUrlValue;
    } else {
      // SafeUrl tiene una propiedad que contiene la URL
      urlString = (downloadUrlValue as any).changingThisBreaksApplicationSecurity || String(downloadUrlValue);
    }

    // Intentar descargar usando fetch para manejar mejor los errores
    fetch(urlString)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Verificar que el blob no esté vacío
        if (blob.size === 0) {
          throw new Error('El archivo está vacío');
        }
        
        // Crear un enlace temporal para descargar
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Usar el nombre del archivo de rutaArchivo o un nombre por defecto
        // rutaArchivo ya fue validado arriba, así que no puede ser undefined aquí
        const fileName = rutaArchivo!.split('/').pop() || rutaArchivo!.split('\\').pop() || 'evidencia';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.loading.set(false);
      })
      .catch(error => {
        console.error('Error al descargar archivo:', error);
        alert('No se puede descargar: ' + (error.message || 'Error desconocido. Verifique que el archivo exista en el servidor.'));
        this.loading.set(false);
      });
  }
}

