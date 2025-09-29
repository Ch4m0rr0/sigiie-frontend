import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { Usuario } from '../../core/models/usuario';

@Component({
  standalone: true,
  selector: 'app-list-usuarios',
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="mb-8">
          <div class="flex justify-between items-center">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">Usuarios</h1>
              <p class="mt-2 text-gray-600">Gestiona todos los usuarios del sistema</p>
            </div>
            <button class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Nuevo Usuario
            </button>
          </div>
        </div>

        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-4 py-5 sm:p-6">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr *ngFor="let usuario of usuarios">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ usuario.nombreCompleto }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ usuario.correo }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ usuario.role }}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span [class]="usuario.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                        {{ usuario.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button class="text-blue-600 hover:text-blue-900 mr-3">Editar</button>
                      <button class="text-red-600 hover:text-red-900">Eliminar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ListUsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  usuarios: Usuario[] = [];

  ngOnInit() {
    this.loadUsuarios();
  }

  loadUsuarios() {
    this.usuariosService.list().subscribe({
      next: (data) => this.usuarios = data,
      error: (err) => console.error('Error loading usuarios:', err)
    });
  }
}
