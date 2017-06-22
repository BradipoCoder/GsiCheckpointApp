import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableProdMode } from '@angular/core';
import { Configuration } from './app.configuration';
import { AppModule } from './app.module';

if(!Configuration.is_development_mode)
{
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule);
