export class ProcessingCancelledError extends Error {
  constructor() {
    super("処理をキャンセルしました。");
    this.name = "ProcessingCancelledError";
  }
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ProcessingCancelledError();
}
