import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteSettings } from '../site-settings.service';
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly settings = inject(SiteSettings);
  readonly year = new Date().getFullYear();
}
