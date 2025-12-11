import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ParticipacionService } from '../../core/services/participacion.service';
import { IconComponent } from '../../shared/icon/icon.component';
import { SkeletonCardComponent } from '../../shared/skeleton/skeleton-card.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';

@Component({
  standalone: true,
  selector: 'app-equipos',
  imports: [CommonModule, RouterModule, IconComponent, SkeletonCardComponent, ...BrnButtonImports],
  templateUrl: './equipos.component.html',
})
export class EquiposComponent implements OnInit {
  private participacionService = inject(ParticipacionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  equipos = signal<any[]>([]);
  edicionId = signal<number | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const edicionId = this.route.snapshot.paramMap.get('edicionId');
    if (edicionId) {
      this.edicionId.set(+edicionId);
      this.loadEquipos(+edicionId);
    }
  }

  loadEquipos(edicionId: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.participacionService.getEquipos(edicionId).subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : (data.data || []);
        this.equipos.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading equipos:', err);
        this.error.set('Error al cargar los equipos');
        this.loading.set(false);
      }
    });
  }

  navigateToEquipo(grupoNumero: number): void {
    const edicionId = this.edicionId();
    if (edicionId) {
      this.router.navigate(['/participaciones/equipos', edicionId, grupoNumero]);
    }
  }
}

