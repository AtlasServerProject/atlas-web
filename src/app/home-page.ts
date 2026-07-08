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

type LinkCard = {
  title: string;
  text: string;
};

@Component({
  selector: 'app-home-page',
  standalone: true,
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class HomePageComponent {
  protected readonly serverName = 'Atlas';
  protected readonly serverIp = 'jogar.atlasserver.com.br';
  protected readonly navItems: NavItem[] = [
    { id: 'inicio', label: 'Início' },
    { id: 'jogar', label: 'Jogar' },
    { id: 'store', label: 'Loja' },
    { id: 'novidades', label: 'Notícias' },
    { id: 'suporte', label: 'Suporte' }
  ];

  protected readonly heroNotes = [
    'Servidor brasileiro de Pixelmon com foco em comunidade.',
    'A abertura foi desenhada para parecer uma intro oficial.',
    'Logo do Atlas integrada como identidade principal.'
  ];

  protected readonly updates: UpdateCard[] = [
    {
      meta: 'Notícia 01',
      title: 'O Atlas ganha uma entrada cinematografica',
      text: 'Mar em movimento, luz suave e a logo oficial como ponto central da primeira dobra.'
    },
    {
      meta: 'Notícia 02',
      title: 'Página pensada para status, eventos e suporte',
      text: 'A estrutura abaixo do hero já reserva espaço para comunicados e atalhos da comunidade.'
    },
    {
      meta: 'Notícia 03',
      title: 'Base pronta para integrar o backend Spring',
      text: 'Depois o site pode receber dados reais de notícias, equipe, tickets e status do servidor.'
    }
  ];

  protected readonly supportLinks: LinkCard[] = [
    {
      title: 'Abrir ticket',
      text: 'Central de suporte com histórico, anexos e acompanhamento.'
    },
    {
      title: 'Discord oficial',
      text: 'Canal principal para avisos, eventos e suporte rápido.'
    },
    {
      title: 'Wiki / Guia',
      text: 'Espaço para instruções, regras e como começar no servidor.'
    }
  ];

  protected readonly quickLinks: LinkCard[] = [
    {
      title: 'Jogar',
      text: 'Veja como entrar e preparar sua instalação.'
    },
    {
      title: 'Loja',
      text: 'Área reservada para vantagens e itens futuros.'
    },
    {
      title: 'Equipe',
      text: 'Conheça quem cuida do projeto e da comunidade.'
    }
  ];
}
