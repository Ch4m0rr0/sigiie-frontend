import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-statistics-cards',
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './statistics-cards.component.html'
})
export class StatisticsCardsComponent {
  private router = inject(Router);

  // Inputs
  totalActividades = input.required<number>();
  totalParticipaciones = input.required<number>();
  totalEvidencias = input.required<number>();
  totalSubactividades = input.required<number>();

  // Métodos para navegación
  navegarAActividades(): void {
    this.router.navigate(['/actividades']);
  }

  navegarAParticipaciones(): void {
    this.router.navigate(['/participaciones']);
  }

  navegarAEvidencias(): void {
    this.router.navigate(['/evidencias']);
  }

  navegarASubactividades(): void {
    this.router.navigate(['/subactividades']);
  }
}

