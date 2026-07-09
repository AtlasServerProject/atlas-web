import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type NavigationItem = {
  label: string;
  href: string;
};

type StepCard = {
  step: string;
  title: string;
  text: string;
  action: string;
};

type DownloadCard = {
  badge: string;
  title: string;
  text: string;
  action: string;
};

@Component({
  selector: 'app-how-to-play-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-to-play-page.component.html',
  styleUrls: ['./how-to-play-page.component.scss']
})
export class HowToPlayPageComponent {
  protected readonly serverName = 'Atlas';
  protected readonly serverIp = 'jogar.atlasserver.com.br';

  protected readonly menu: NavigationItem[] = [
    { label: 'Inicio', href: '/' },
    { label: 'Loja', href: '/store' },
    { label: 'Como Jogar', href: '/how-to-play' },
    { label: 'Noticias', href: '/notices' },
    { label: 'Equipe', href: '/#novidades' }
  ];

  protected readonly steps: StepCard[] = [
    {
      step: '1',
      title: 'Prepare sua instalacao',
      text: 'Use sua versao Java pronta para modpacks e organize sua pasta do jogo antes de entrar no Atlas.',
      action: 'Ver requisitos'
    },
    {
      step: '2',
      title: 'Baixe o modpack oficial',
      text: 'A base do Atlas vai nascer com instalacao guiada para deixar mods, recursos e configuracoes prontos.',
      action: 'Baixar pacote'
    },
    {
      step: '3',
      title: 'Adicione o servidor',
      text: 'Abra o Minecraft, entre em multiplayer e use o IP oficial para encontrar o mundo do Atlas.',
      action: 'Copiar IP'
    },
    {
      step: '4',
      title: 'Comece sua jornada',
      text: 'Entre no tutorial inicial, monte seu primeiro time e avance pelos sistemas centrais do servidor.',
      action: 'Comecar agora'
    }
  ];

  protected readonly downloadOptions: DownloadCard[] = [
    {
      badge: 'Recomendado',
      title: 'Launcher Atlas',
      text: 'Instalacao simplificada com tudo pronto para futuros updates e ajustes do servidor.',
      action: 'Download em breve'
    },
    {
      badge: 'Manual',
      title: 'Modpack .zip',
      text: 'Opcao para quem prefere configurar a pasta do jogo manualmente com mais controle.',
      action: 'Ver instrucoes'
    },
    {
      badge: 'Mobile',
      title: 'Guia alternativo',
      text: 'Espaco reservado para orientar jogadores que quiserem acompanhar possibilidades fora do PC.',
      action: 'Ler guia'
    }
  ];
}
