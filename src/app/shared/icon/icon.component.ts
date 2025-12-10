import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span 
      class="material-icons"
      [class]="sizeClass + ' ' + colorClass + ' ' + (className || '')"
      [style.font-size]="customSize"
      style="will-change: auto; contain: layout style;">
      {{ icon }}
    </span>
  `,
  styles: [`
    .material-icons {
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
      display: inline-block;
      line-height: 1;
      text-transform: none;
      letter-spacing: normal;
      word-wrap: normal;
      white-space: nowrap;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      -moz-osx-font-smoothing: grayscale;
      font-feature-settings: 'liga';
      contain: layout style;
      will-change: auto;
    }
  `]
})
export class IconComponent {
  @Input() icon!: string;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom' = 'md';
  @Input() color: string = '';
  @Input() className: string = '';
  @Input() customSize: string = '';

  get sizeClass(): string {
    const sizes = {
      'xs': 'text-xs',
      'sm': 'text-sm', 
      'md': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
      'custom': ''
    };
    return sizes[this.size];
  }

  get colorClass(): string {
    if (this.color) {
      return `text-${this.color}`;
    }
    return '';
  }
}
