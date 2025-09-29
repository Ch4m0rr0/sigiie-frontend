import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { App } from './app/pages/app';
import { config } from './app/core/app.config.server';

export default function bootstrap(context: BootstrapContext) {
	return bootstrapApplication(App, config, context);
}
