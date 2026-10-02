import { Component } from '@angular/core';
import { ScrollRevealDirective } from '../../shared/effects/scroll-reveal.directive';
@Component({
  selector: 'app-notices-page',
  standalone: true,
  imports: [ScrollRevealDirective],
  templateUrl: './notices-page.component.html',
  styleUrls: ['./notices-page.component.scss'],
})
export class NoticesPageComponent {}
