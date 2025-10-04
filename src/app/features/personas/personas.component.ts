import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PersonasService } from '../../core/services/personas.service';
import type { Estudiante } from '../../core/models/estudiante';
import type { Docente } from '../../core/models/docente';
import type { Administrativo } from '../../core/models/administrativo';

@Component({
  standalone: true,
  selector: 'app-list-personas',
  imports: [CommonModule, FormsModule],
  templateUrl: './personas.component.html',
})
export class ListPersonasComponent implements OnInit {
  private personasService = inject(PersonasService);
  selectedTipo = 'estudiantes';
  estudiantes: Estudiante[] = [];
  docentes: Docente[] = [];
  administrativos: Administrativo[] = [];

  ngOnInit() {
    this.loadEstudiantes();
    this.loadDocentes();
    this.loadAdministrativos();
  }

  loadEstudiantes() {
    this.personasService.listEstudiantes().subscribe({
      next: (data) => this.estudiantes = data,
      error: (err) => console.error('Error loading estudiantes:', err)
    });
  }

  loadDocentes() {
    this.personasService.listDocentes().subscribe({
      next: (data) => this.docentes = data,
      error: (err) => console.error('Error loading docentes:', err)
    });
  }

  loadAdministrativos() {
    this.personasService.listAdministrativos().subscribe({
      next: (data) => this.administrativos = data,
      error: (err) => console.error('Error loading administrativos:', err)
    });
  }
}
