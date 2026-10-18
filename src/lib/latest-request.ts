export class LatestRequest {
  private controller?: AbortController;
  begin() { this.controller?.abort(); const controller = new AbortController(); this.controller = controller; return controller; }
  isCurrent(controller: AbortController) { return this.controller === controller && !controller.signal.aborted; }
  cancel() { this.controller?.abort(); this.controller = undefined; }
}
