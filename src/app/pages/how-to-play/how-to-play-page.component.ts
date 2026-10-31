import { downloadAtlasLauncher } from '../../core/launcher-download';
import { Component, signal, OnDestroy } from '@angular/core';
import { ScrollRevealDirective } from '../../shared/effects/scroll-reveal.directive';
@Component({
  selector: 'app-how-to-play-page',
  standalone: true,
  imports: [ScrollRevealDirective],
  templateUrl: './how-to-play-page.component.html',
  styleUrls: ['./how-to-play-page.component.scss'],
})
export class HowToPlayPageComponent implements OnDestroy {
  downloading = signal(false);
  downloadProgress = signal(0);
  downloadMessage = signal('');
  private downloadController?: AbortController;
  ngOnDestroy() { this.downloadController?.abort(); }
  async downloadLauncher() {
    if (this.downloading()) return;
    const controller = new AbortController();
    this.downloadController = controller;
    this.downloading.set(true); this.downloadProgress.set(0);
    this.downloadMessage.set('Preparando o download…');
    try {
      const result = await downloadAtlasLauncher(percent => { this.downloadProgress.set(percent); this.downloadMessage.set(`Baixando launcher… ${percent}%`); }, controller.signal);
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a'); link.href = url; link.download = result.filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      this.downloadMessage.set('Download pronto. Abra o instalador e siga os passos para instalar o Atlas Launcher.');
    } catch {
      if (!controller.signal.aborted) this.downloadMessage.set('Não foi possível concluir o download. Tente novamente em um navegador atualizado.');
    } finally { this.downloading.set(false); this.downloadController = undefined; }
  }
  readonly serverAddress = 'stapling-gpo.tun.ply.gg';
  copyMessage = signal('');
  async copyAddress() {
    try {
      await navigator.clipboard.writeText(this.serverAddress);
      this.copyMessage.set('Endereço copiado!');
    } catch {
      this.copyMessage.set('Selecione e copie o endereço acima.');
    }
  }
}
