import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: ` <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" routerLink="/" aria-label="Atlas Cobblemon — início"
          ><img src="/logo-atlas.jpeg" alt="Logo Atlas" width="72" height="72" /><span
            >ATLAS<small>COBBLEMON</small></span
          ></a
        >
        <nav aria-label="Navegação principal">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
            >Início</a
          ><a routerLink="/how-to-play" routerLinkActive="active">Como jogar</a
          ><a routerLink="/notices" routerLinkActive="active">Novidades</a
          ><a routerLink="/store" routerLinkActive="active">Loja</a>
        </nav>
        <a
          class="button compact"
          href="https://discord.gg/uUBN4YV6Y"
          target="_blank"
          rel="noopener noreferrer"
          >Entrar no Discord ↗</a
        >
      </div>
    </header>
    <main id="conteudo" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer">
      <div>
        <a class="wordmark footer-brand" routerLink="/" aria-label="Atlas Cobblemon — início"
          ><img
            src="/logo-atlas.jpeg"
            alt="Logo Atlas"
            width="88"
            height="88"
            loading="lazy"
          /><span>ATLAS <small>COBBLEMON</small></span></a
        >
        <p>Um mundo para explorar. Uma comunidade para chamar de sua.</p>
      </div>
      <div class="footer-links">
        <a routerLink="/how-to-play">Comece por aqui</a
        ><a href="https://discord.gg/uUBN4YV6Y" target="_blank" rel="noopener noreferrer"
          >Comunidade ↗</a
        >
      </div>
      <small
        >Projeto independente de comunidade. Não afiliado à Mojang, Microsoft, Nintendo ou The
        Pokémon Company.</small
      >
    </footer>`,
})
export class AppComponent {}
