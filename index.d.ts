import {ChildProcess} from 'child_process';

declare class Xvfb {
  protected readonly _display: `:${number}`;
  protected readonly _reuse?: boolean;
  protected readonly _timeout: number;
  protected readonly _silent?: boolean;
  protected readonly _xvfb_args: string[];
  protected readonly _process: ChildProcess;

  constructor(options?: Xvfb.Options);

  start(cb: Xvfb.Callback);

  startSync(): ChildProcess;

  stop(cb: Xvfb.Callback);

  stopSync();

  display(): `:${number}`;
}

declare namespace Xvfb {
  interface Options {
    displayNum?: number;
    reuse?: boolean;
    /**
     * Maximum time to start/stop xvfb process.
     * @defaultValue 500
     */
    timeout?: boolean;
    /**
     * Whether or not to write errors to the stderr of the current process.
     * @defaultValue false
     */
    silent?: boolean;
    xvfb_args?: string[];
  }

  type Callback = ((error: Error) => void) | ((error: null, process: ChildProcess) => void);
}

export = Xvfb;
