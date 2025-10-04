import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActividadesService } from '../../core/services/actividades.service';
import type { Actividad } from '../../core/models/actividad';

@Component({
  standalone: true,
  selector: 'app-list-actividades',
  imports: [CommonModule, FormsModule],
  templateUrl: './actividades.component.html',
})
export class ListActividadesComponent implements OnInit {
  private actividadesService = inject(ActividadesService);
  actividades: Actividad[] = [];

  ngOnInit() {
    this.loadActividades();
  }

  loadActividades() {
    this.actividadesService.list().subscribe({
      next: (data) => this.actividades = data,
      error: (err) => console.error('Error loading actividades:', err)
    });
  }
}
