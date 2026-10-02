import { Component } from '@angular/core';
import { ScrollRevealDirective } from '../../shared/effects/scroll-reveal.directive';
@Component({
  selector: 'app-how-to-play-page',
  standalone: true,
  imports: [ScrollRevealDirective],
  templateUrl: './how-to-play-page.component.html',
  styleUrls: ['./how-to-play-page.component.scss'],
})
export class HowToPlayPageComponent {}
