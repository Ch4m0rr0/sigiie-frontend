import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogosService } from '../../core/services/catalogos.service';
import type { Departamento } from '../../core/models/departamento';
import type { Genero } from '../../core/models/genero';
// Add others as needed

@Component({
  standalone: true,
  selector: 'app-list-catalogos',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Catálogos</h1>
          <p class="mt-2 text-gray-600">Gestiona los catálogos del sistema</p>
        </div>

        <div class="mb-6">
          <select [(ngModel)]="selectedCatalogo" class="px-3 py-2 border border-gray-300 rounded-md">
            <option value="departamentos">Departamentos</option>
            <option value="generos">Géneros</option>
            <!-- Add more options -->
          </select>
        </div>

        <div class="bg-white shadow rounded-lg overflow-hidden" *ngIf="selectedCatalogo === 'departamentos'">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Departamentos</h3>
            <ul>
              <li *ngFor="let item of departamentos" class="py-2">{{ item.nombre }}</li>
            </ul>
          </div>
        </div>

        <div class="bg-white shadow rounded-lg overflow-hidden" *ngIf="selectedCatalogo === 'generos'">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Géneros</h3>
            <ul>
              <li *ngFor="let item of generos" class="py-2">{{ item.nombre }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ListCatalogosComponent implements OnInit {
  private catalogosService = inject(CatalogosService);
  selectedCatalogo = 'departamentos';
  departamentos: Departamento[] = [];
  generos: Genero[] = [];

  ngOnInit() {
    this.loadDepartamentos();
    this.loadGeneros();
  }

  loadDepartamentos() {
    this.catalogosService.getDepartamentos().subscribe({
      next: (data) => this.departamentos = data,
      error: (err) => console.error('Error loading departamentos:', err)
    });
  }

  loadGeneros() {
    this.catalogosService.getGeneros().subscribe({
      next: (data) => this.generos = data,
      error: (err) => console.error('Error loading generos:', err)
    });
  }
}
