import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { ToastService } from './services/toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private toastService: ToastService, private zone: NgZone) {}

  handleError(error: any): void {
    const chunkFailedMessage = /Loading chunk [\d]+ failed/;
    if (chunkFailedMessage.test(error.message)) {
        window.location.reload();
        return;
    }

    console.error('Captured by Global Error Handler:', error);

    const message = error.message ? error.message : error.toString();
    
    this.zone.run(() => {
        this.toastService.show(message, 'error');
    });
  }
}
