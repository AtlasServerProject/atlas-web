import { Component } from '@angular/core';

type NavItem = {
  id: string;
  label: string;
};

type UpdateCard = {
  title: string;
  text: string;
  meta: string;
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent {
  protected readonly serverName = 'Atlas';
  protected readonly serverIp = 'jogar.atlasserver.com.br';

  protected readonly navItems: NavItem[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'how-to-play', label: 'Jogar' },
    { id: 'store', label: 'Loja' },
    { id: 'notices', label: 'Noticias' }
  ];

  protected readonly heroNotes = [
    'Servidor brasileiro de Pixelmon com foco em comunidade.',
    'A abertura foi desenhada para parecer uma intro oficial.',
    'Logo do Atlas integrada como identidade principal.'
  ];

  protected readonly updates: UpdateCard[] = [
    {
      meta: 'Noticia 01',
      title: 'O Atlas ganha uma entrada cinematografica',
      text: 'Mar em movimento, luz suave e a logo oficial como ponto central da primeira dobra.'
    },
    {
      meta: 'Noticia 02',
      title: 'Pagina pensada para status, eventos e comunidade',
      text: 'A estrutura abaixo do hero ja reserva espaco para comunicados e atalhos centrais do servidor.'
    },
    {
      meta: 'Noticia 03',
      title: 'Base pronta para integrar o backend Spring',
      text: 'Depois o site pode receber dados reais de noticias, equipe, loja e status do servidor.'
    }
  ];

  protected readonly quickLinks = [
    {
      title: 'Jogar',
      text: 'Veja como entrar e preparar sua instalacao.'
    },
    {
      title: 'Loja',
      text: 'Area reservada para VIPs, chaves e futuras vantagens do Atlas.'
    },
    {
      title: 'Equipe',
      text: 'Conheca quem cuida do projeto e da comunidade.'
    }
  ];
}
