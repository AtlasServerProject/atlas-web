import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class SiteSettings {
  readonly discord = 'https://discord.gg/uUBN4YV6Y';
  readonly serverAddress = signal<string | null>(null);
  readonly heroVideo = signal<string | null>(null);
  constructor() {
    fetch('/site-settings.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (
          typeof data?.serverAddress === 'string' &&
          /^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(data.serverAddress)
        )
          this.serverAddress.set(data.serverAddress);
        if (
          typeof data?.heroVideo === 'string' &&
          /^\/media\/[\w.-]+\.(webm|mp4)$/.test(data.heroVideo)
        )
          this.heroVideo.set(data.heroVideo);
      })
      .catch(() => {
        /* Safe defaults: no connection address or video is advertised. */
      });
  }
}
