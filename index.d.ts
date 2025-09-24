declare module 'piperline' {
  type PipeHandler<TInput = any, TOutput = any> = (
    data: TInput,
    next: (result?: TOutput) => void,
    done: (result?: TOutput | Error) => void
  ) => void;

  type PipeCallback<T = any> = (error: Error | null, result?: T) => void;

  interface Pipeline {
    /**
     * Adds a pipe function to the pipeline for execution.
     * Can only be called when the pipeline is not running.
     */
    pipe<TInput = any, TOutput = any>(handler: PipeHandler<TInput, TOutput>): Pipeline;

    /**
     * Builds and executes the pipeline.
     */
    run<T = any>(callback: PipeCallback<T>): Pipeline;
    run<T = any>(data: any, callback?: PipeCallback<T>): Pipeline;

    /**
     * Checks whether the pipeline is currently executing.
     */
    isRunning(): boolean;

    /**
     * Creates a new pipeline instance with the same pipe functions.
     */
    clone(): Pipeline;

    /**
     * Registers an event listener for the specified event.
     */
    on(event: 'run', listener: () => void): Pipeline;
    on(event: 'done', listener: (result: any) => void): Pipeline;
    on(event: 'error', listener: (error: Error) => void): Pipeline;
    on(event: 'finish', listener: () => void): Pipeline;
    on(event: string, listener: (...args: any[]) => void): Pipeline;

    /**
     * Registers a one-time event listener for the specified event.
     */
    once(event: 'run', listener: () => void): Pipeline;
    once(event: 'done', listener: (result: any) => void): Pipeline;
    once(event: 'error', listener: (error: Error) => void): Pipeline;
    once(event: 'finish', listener: () => void): Pipeline;
    once(event: string, listener: (...args: any[]) => void): Pipeline;

    /**
     * Removes an event listener for the specified event.
     */
    off(event: string, listener: (...args: any[]) => void): Pipeline;
  }

  interface PiperlineStatic {
    /**
     * Creates a new pipeline runner.
     */
    create(pipes?: PipeHandler[]): Pipeline;
  }

  const piperline: PiperlineStatic;
  export = piperline;
}