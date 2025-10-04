import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { Usuario } from '../../core/models/usuario';

@Component({
  standalone: true,
  selector: 'app-list-usuarios',
  imports: [CommonModule],
  templateUrl: './usuarios.component.html',
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
