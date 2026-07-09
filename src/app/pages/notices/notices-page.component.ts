import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type NoticeMenuItem = {
  label: string;
  href: string;
};

type HighlightCard = {
  label: string;
  title: string;
  text: string;
};

type NoticeCard = {
  category: string;
  title: string;
  text: string;
  date: string;
};

@Component({
  selector: 'app-notices-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notices-page.component.html',
  styleUrls: ['./notices-page.component.scss']
})
export class NoticesPageComponent {
  protected readonly serverName = 'Atlas';
  protected readonly serverIp = 'jogar.atlasserver.com.br';
  protected readonly serverStatus = 'Offline';

  protected readonly menu: NoticeMenuItem[] = [
    { label: 'Inicio', href: '/' },
    { label: 'Loja', href: '/store' },
    { label: 'Jogar', href: '/how-to-play' },
    { label: 'Noticias', href: '/notices' },
    { label: 'Equipe', href: '/#novidades' }
  ];

  protected readonly highlights: HighlightCard[] = [
    {
      label: 'Temporada',
      title: 'Preparacao da abertura oficial',
      text: 'A equipe esta finalizando ambientacao, progresso inicial e fluxo de entrada para a estreia do Atlas.'
    },
    {
      label: 'Servidor',
      title: 'IP principal definido',
      text: 'O endereco jogar.atlasserver.com.br ja entra como referencia central para os proximos avisos.'
    },
    {
      label: 'Comunidade',
      title: 'Noticias em ritmo continuo',
      text: 'A pagina de avisos sera o ponto para acompanhar mudancas, eventos, manutencoes e novidades da loja.'
    }
  ];

  protected readonly notices: NoticeCard[] = [
    {
      category: 'Aviso oficial',
      title: 'Atlas entra em fase de preparacao publica',
      text: 'A primeira fase do site ja esta no ar com home, loja e espaco proprio para noticias do servidor.',
      date: '08 Jul 2026'
    },
    {
      category: 'Loja',
      title: 'Planos VIP e chaves lendarias ganham pagina dedicada',
      text: 'A loja do Atlas agora alterna secoes e prepara o terreno para futuros itens sem poluir a navegacao.',
      date: '08 Jul 2026'
    },
    {
      category: 'Infra',
      title: 'Estrutura Angular organizada por paginas',
      text: 'O frontend foi reorganizado para crescer com mais seguranca, separando home, store e notices.',
      date: '08 Jul 2026'
    },
    {
      category: 'Comunidade',
      title: 'Nova area de noticias centraliza os proximos anuncios',
      text: 'Eventos, manutenções, aberturas de temporada e comunicados da equipe entram aqui como canal oficial.',
      date: '08 Jul 2026'
    }
  ];
}
