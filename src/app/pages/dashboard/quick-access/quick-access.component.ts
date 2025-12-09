import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  standalone: true,
  selector: 'app-quick-access',
  imports: [CommonModule, RouterModule, IconComponent],
  templateUrl: './quick-access.component.html'
})
export class QuickAccessComponent {
}

