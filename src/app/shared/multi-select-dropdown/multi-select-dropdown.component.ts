import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MultiSelectOption {
  id: number;
  label: string;
}

@Component({
  standalone: true,
  selector: 'app-multi-select-dropdown',
  imports: [CommonModule],
  templateUrl: './multi-select-dropdown.component.html',
  styleUrls: ['./multi-select-dropdown.component.scss']
})
export class MultiSelectDropdownComponent {
  @Input() options: MultiSelectOption[] = [];
  @Input() selectedIds: number[] = [];
  @Input() placeholder: string = 'Seleccionar...';
  @Input() label: string = '';
  
  @Output() selectionChange = new EventEmitter<number[]>();

  isOpen = signal(false);

  toggleDropdown(): void {
    this.isOpen.set(!this.isOpen());
  }

  toggleOption(id: number): void {
    const currentSelection = [...this.selectedIds];
    const index = currentSelection.indexOf(id);
    
    if (index > -1) {
      // Remover si ya está seleccionado
      currentSelection.splice(index, 1);
    } else {
      // Agregar si no está seleccionado
      currentSelection.push(id);
    }
    
    this.selectionChange.emit(currentSelection);
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  getDisplayText(): string {
    if (this.selectedIds.length === 0) {
      return this.placeholder;
    }
    if (this.selectedIds.length === 1) {
      const option = this.options.find(opt => opt.id === this.selectedIds[0]);
      return option ? option.label : this.placeholder;
    }
    return `${this.selectedIds.length} seleccionados`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.multi-select-dropdown')) {
      this.isOpen.set(false);
    }
  }
}

