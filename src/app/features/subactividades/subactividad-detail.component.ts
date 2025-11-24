import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SubactividadService } from '../../core/services/subactividad.service';
import { ParticipacionService } from '../../core/services/participacion.service';
import { EvidenciaService } from '../../core/services/evidencia.service';
import type { Subactividad } from '../../core/models/subactividad';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-subactividad-detail',
  imports: [CommonModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './subactividad-detail.component.html',
})
export class SubactividadDetailComponent implements OnInit {
  private subactividadService = inject(SubactividadService);
  private participacionService = inject(ParticipacionService);
  private evidenciaService = inject(EvidenciaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  subactividad = signal<Subactividad | null>(null);
  participaciones = signal<any[]>([]);
  evidencias = signal<any[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  activeTab = signal<'info' | 'participantes' | 'evidencias'>('info');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSubactividad(+id);
      this.loadParticipaciones(+id);
      this.loadEvidencias(+id);
    }
  }

  loadSubactividad(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.subactividadService.getById(id).subscribe({
      next: (data) => {
        this.subactividad.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading subactividad:', err);
        this.error.set('Error al cargar la subactividad');
        this.loading.set(false);
      }
    });
  }

  loadParticipaciones(id: number): void {
    this.participacionService.getBySubactividad(id).subscribe({
      next: (data) => this.participaciones.set(data),
      error: (err) => console.error('Error loading participaciones:', err)
    });
  }

  loadEvidencias(id: number): void {
    this.evidenciaService.getBySubactividad(id).subscribe({
      next: (data) => this.evidencias.set(data),
      error: (err) => console.error('Error loading evidencias:', err)
    });
  }

  navigateToEdit(): void {
    const id = this.subactividad()?.idSubactividad;
    if (id) {
      this.router.navigate(['/subactividades', id, 'editar']);
    }
  }

  onDelete(): void {
    const id = this.subactividad()?.idSubactividad;
    if (id && confirm('¿Está seguro de que desea eliminar esta subactividad?')) {
      this.subactividadService.delete(id).subscribe({
        next: () => this.router.navigate(['/subactividades']),
        error: (err) => {
          console.error('Error deleting subactividad:', err);
          this.error.set('Error al eliminar la subactividad');
        }
      });
    }
  }

  setTab(tab: 'info' | 'participantes' | 'evidencias'): void {
    this.activeTab.set(tab);
  }
}

