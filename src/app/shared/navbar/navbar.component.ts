import { AuthService } from '../../core/auth.service';
import { DialogFocusDirective } from '../effects/dialog-focus.directive';
import { Component, inject, signal, ElementRef, viewChild, OnDestroy, NgZone } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { PlayModalService } from '../play-modal/play-modal.service';
import { SiteSettings } from '../site-settings.service';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [DialogFocusDirective, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly accountOpen = signal(false);
  readonly logoutError = signal('');
  accountBlur(event: FocusEvent) {
    if (!(event.currentTarget as HTMLElement).parentElement?.contains(event.relatedTarget as Node))
      this.accountOpen.set(false);
  }
  async logout() {
    try {
      await this.auth.logout();
    } catch (error) {
      this.logoutError.set(error instanceof Error ? error.message : 'Não foi possível sair.');
      return;
    }
    this.logoutError.set('');
    this.accountOpen.set(false);
    this.close();
    void this.router.navigateByUrl('/');
  }
  readonly play = inject(PlayModalService);
  readonly settings = inject(SiteSettings);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  readonly home = signal(this.router.url.split(/[?#]/)[0] === '/');
  readonly scrolled = signal(false);
  readonly section = signal('inicio');
  readonly menu = viewChild<ElementRef<HTMLDialogElement>>('menu');
  private observer?: IntersectionObserver;
  private frame = 0;
  private readonly onScroll = () => {
    const value = scrollY > 32;
    if (value !== this.scrolled()) this.zone.run(() => this.scrolled.set(value));
  };
  private readonly subscription = this.router.events.subscribe((event) => {
    if (event instanceof NavigationEnd) {
      this.home.set(event.urlAfterRedirects.split(/[?#]/)[0] === '/');
      this.close();
      this.accountOpen.set(false);
      this.section.set('inicio');
      this.observer?.disconnect();
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => this.observe());
    }
  });
  constructor() {
    this.zone.runOutsideAngular(() => addEventListener('scroll', this.onScroll, { passive: true }));
    this.onScroll();
  }
  private observe() {
    if (!this.home()) return;
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) this.section.set(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: 0 },
    );
    for (const id of ['inicio', 'quem-somos', 'discord']) {
      const element = document.getElementById(id);
      if (element) this.observer.observe(element);
    }
  }
  open() {
    this.menu()?.nativeElement.showModal();
  }
  close() {
    this.menu()?.nativeElement.close();
  }
  backdrop(event: MouseEvent) {
    if (event.target === this.menu()?.nativeElement) this.close();
  }
  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.observer?.disconnect();
    removeEventListener('scroll', this.onScroll);
    cancelAnimationFrame(this.frame);
  }
}
