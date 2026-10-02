import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroComponent } from '../../shared/hero/hero.component';
import { ScrollRevealDirective } from '../../shared/effects/scroll-reveal.directive';
import { ParallaxDirective } from '../../shared/effects/parallax.directive';
import { PlayModalService } from '../../shared/play-modal/play-modal.service';
import { SiteSettings } from '../../shared/site-settings.service';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, HeroComponent, ScrollRevealDirective, ParallaxDirective],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  readonly play = inject(PlayModalService);
  readonly settings = inject(SiteSettings);
}
