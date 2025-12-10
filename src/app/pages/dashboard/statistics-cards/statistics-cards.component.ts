import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-statistics-cards',
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './statistics-cards.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* Prevenir layout shifts en botones de cards */
    button.bg-white {
      will-change: transform, box-shadow, border-color;
      transform: translateZ(0);
      contain: layout style;
      min-height: 180px;
      height: auto;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    
    button.bg-white:hover {
      transform: translateY(-4px) translateZ(0);
    }
    
    /* Estabilizar el contenedor de las cards */
    .grid {
      contain: layout style;
    }
  `]
})
export class StatisticsCardsComponent {
  private router = inject(Router);

  // Inputs
  totalActividades = input.required<number>();
  totalParticipaciones = input.required<number>();
  totalEvidencias = input.required<number>();
  totalSubactividades = input.required<number>();

  // Métodos para navegación - Optimizados para INP
  navegarAActividades(): void {
    // Diferir navegación para no bloquear el hilo principal
    requestAnimationFrame(() => {
      this.router.navigate(['/actividades']);
    });
  }

  navegarAParticipaciones(): void {
    requestAnimationFrame(() => {
      this.router.navigate(['/participaciones']);
    });
  }

  navegarAEvidencias(): void {
    requestAnimationFrame(() => {
      this.router.navigate(['/evidencias']);
    });
  }

  navegarASubactividades(): void {
    requestAnimationFrame(() => {
      this.router.navigate(['/subactividades']);
    });
  }
}

