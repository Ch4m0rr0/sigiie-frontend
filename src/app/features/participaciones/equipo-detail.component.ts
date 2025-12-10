import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParticipacionService } from '../../core/services/participacion.service';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-equipo-detail',
  imports: [CommonModule, RouterModule, SkeletonCardComponent, ...BrnButtonImports],
  templateUrl: './equipo-detail.component.html',
})
export class EquipoDetailComponent implements OnInit {
  private participacionService = inject(ParticipacionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  equipo = signal<any>(null);
  edicionId = signal<number | null>(null);
  grupoNumero = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const edicionId = this.route.snapshot.paramMap.get('edicionId');
    const grupoNumero = this.route.snapshot.paramMap.get('grupoNumero');
    
    if (edicionId && grupoNumero) {
      this.edicionId.set(+edicionId);
      this.grupoNumero.set(+grupoNumero);
      this.loadEquipo(+edicionId, +grupoNumero);
    }
  }

  loadEquipo(edicionId: number, grupoNumero: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.participacionService.getEquipo(edicionId, grupoNumero).subscribe({
      next: (data) => {
        this.equipo.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading equipo:', err);
        this.error.set('Error al cargar el equipo');
        this.loading.set(false);
      }
    });
  }
}

