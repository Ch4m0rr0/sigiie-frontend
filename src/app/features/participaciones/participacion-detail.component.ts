import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParticipacionService } from '../../core/services/participacion.service';
import type { Participacion } from '../../core/models/participacion';
import { IconComponent } from '../../shared/icon/icon.component';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-participacion-detail',
  imports: [CommonModule, RouterModule, IconComponent, SkeletonCardComponent, ...BrnButtonImports],
  templateUrl: './participacion-detail.component.html',
})
export class ParticipacionDetailComponent implements OnInit {
  private participacionService = inject(ParticipacionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  participacion = signal<Participacion | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadParticipacion(+id);
    }
  }

  loadParticipacion(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.participacionService.getById(id).subscribe({
      next: (data) => {
        this.participacion.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading participacion:', err);
        this.error.set('Error al cargar la participación');
        this.loading.set(false);
      }
    });
  }

  navigateToEdit(): void {
    const id = this.participacion()?.id;
    if (id) {
      this.router.navigate(['/participaciones', id, 'editar']);
    }
  }

  onDelete(): void {
    const id = this.participacion()?.id;
    if (id && confirm('¿Está seguro de que desea eliminar esta participación?')) {
      this.participacionService.delete(id).subscribe({
        next: () => this.router.navigate(['/participaciones']),
        error: (err) => {
          console.error('Error deleting participacion:', err);
          this.error.set('Error al eliminar la participación');
        }
      });
    }
  }
}

