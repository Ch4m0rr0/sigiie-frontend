import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { UsuariosService } from '../../core/services/usuarios.service';
import type { Usuario } from '../../core/models/usuario';
import { IconComponent } from '../../shared/icon/icon.component';
import { BrnButtonImports } from '@spartan-ng/brain/button';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-list-usuarios',
  imports: [CommonModule, FormsModule, RouterModule, IconComponent, ...BrnButtonImports],
  templateUrl: './usuarios.component.html',
})
export class ListUsuariosComponent implements OnInit {
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private searchTimeout: any;

  busqueda = signal<string>('');
  busquedaDebounced = signal<string>('');
  usuarios = signal<Usuario[]>([]);
  loading = signal(false);
  deletingId = signal<number | null>(null);
  error = signal<string | null>(null);
  lastLoadTime = signal<Date | null>(null);

  usuariosFiltrados = computed<Usuario[]>(() => {
    const usuarios = this.usuarios();
    const busqueda = this.busquedaDebounced().toLowerCase().trim();
    if (!busqueda) return usuarios;
    return usuarios.filter(u => 
      u.nombreCompleto?.toLowerCase().includes(busqueda) ||
      u.correo?.toLowerCase().includes(busqueda) ||
      u.rolNombre?.toLowerCase().includes(busqueda)
    );
  });

  estadisticas = computed(() => ({
    total: this.usuarios().length,
    activos: this.usuarios().filter(u => u.activo).length,
    inactivos: this.usuarios().filter(u => !u.activo).length
  }));

  ngOnInit() {
    this.loadUsuarios();
  }

  onBusquedaChange(value: string) {
    this.busqueda.set(value);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.busquedaDebounced.set(value);
    }, 300);
  }

  loadUsuarios() {
    this.error.set(null);
    this.loading.set(true);
    this.usuariosService.getAll().pipe(
      finalize(() => {
        this.loading.set(false);
        this.lastLoadTime.set(new Date());
      })
    ).subscribe({
      next: (data) => {
        this.usuarios.set(data);
      },
      error: (err) => {
        console.error('Error loading usuarios:', err);
        this.error.set('Error al cargar usuarios. Por favor, intenta de nuevo.');
      }
    });
  }

  onAddNew() {
    this.router.navigate(['/usuarios/nuevo']);
  }

  onEdit(id: any): void {
    const usuarioId = Number(id) || 0;
    if (!usuarioId || usuarioId === 0) {
      console.error('ID inválido para editar:', usuarioId);
      return;
    }
    this.router.navigate(['/usuarios/editar', usuarioId]);
  }

  onDelete(id: any): void {
    const usuarioId = Number(id) || 0;
    if (!usuarioId || usuarioId === 0) {
      console.error('ID inválido para eliminar:', usuarioId);
      return;
    }
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }
    this.deletingId.set(usuarioId);
    this.usuariosService.delete(usuarioId).subscribe({
      next: (success) => {
        if (success) {
          this.loadUsuarios();
        } else {
          this.error.set('Error al eliminar el usuario.');
        }
        this.deletingId.set(null);
      },
      error: (err) => {
        console.error('Error deleting usuario:', err);
        this.error.set('Error al eliminar el usuario.');
        this.deletingId.set(null);
      }
    });
  }

  getLastLoadTime(): string {
    const time = this.lastLoadTime();
    if (!time) return '';
    return new Intl.DateTimeFormat('es-NI', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(time);
  }

  getUsuarioId(usuario: Usuario): number {
    if (typeof usuario.idUsuario === 'number' && usuario.idUsuario > 0) {
      return usuario.idUsuario;
    }
    if (typeof usuario.id === 'number' && usuario.id > 0) {
      return usuario.id;
    }
    return 0;
  }
}
