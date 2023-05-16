import {ChildProcess, spawn} from 'child_process';
import * as sleep from 'sleep';
import fs from 'fs';
import path from 'path';

type Sleep = (n: number) => void

var usleep: Sleep;
try {
  usleep = sleep.sleep;
} catch (e) {
  usleep = (microsecs) => {
    // Fall back to busy loop.
    do {
      var deadline = Date.now() + microsecs / 1000;
    } while (Date.now() <= deadline)
  }
}

class Xvfb {
  private _oldDisplay?: string;
  private _display?: string;
  private _reuse?: boolean;
  private _timeout: number;
  private _silent?: boolean;
  private _xvfb_args: string[];
  private _process?: ChildProcess;

  constructor(options?: Xvfb.Options) {
    options = options || {};
    this._display = (options.displayNum || options.displayNum === 0 ? ':' + options.displayNum : undefined);
    this._reuse = options.reuse;
    this._timeout = options.timeout || 500;
    this._silent = options.silent;
    this._xvfb_args = options.xvfb_args || [];
  }

  startSync(): ChildProcess | undefined {
    if (!this._process) {
      var lockFile = this._lockFile();

      this._setDisplayEnvVariable();
      this._spawnProcess(fs.existsSync(lockFile), function (e) {
        // Ignore async spawn error. While usleep is active, tasks on the
        // event loop cannot be executed, so spawn errors will never be
        // received during the startSync call.
      });

      var totalTime = 0;
      while (!fs.existsSync(lockFile)) {
        if (totalTime > this._timeout) {
          throw new Error('Could not start Xvfb.');
        }
        usleep(10000);
        totalTime += 10;
      }
    }

    return this._process;
  }

  stopSync() {
    if (this._process) {
      this._killProcess();
      this._restoreDisplayEnvVariable();

      var lockFile = this._lockFile();
      var totalTime = 0;
      while (fs.existsSync(lockFile)) {
        if (totalTime > this._timeout) {
          throw new Error('Could not stop Xvfb.');
        }
        usleep(10000);
        totalTime += 10;
      }
    }
  }

  display(): string | undefined {
    if (!this._display) {
      var displayNum = 98;
      var lockFile;
      do {
        displayNum++;
        lockFile = this._lockFile(`${displayNum}`);
      } while (!this._reuse && fs.existsSync(lockFile));
      this._display = ':' + displayNum;
    }
    return this._display;
  }

  private _setDisplayEnvVariable () {
    this._oldDisplay = process.env.DISPLAY;
    process.env.DISPLAY = this.display();
  }

  private _restoreDisplayEnvVariable () {
    process.env.DISPLAY = this._oldDisplay;
  }

  private _spawnProcess (lockFileExists, onAsyncSpawnError) {
    var display = this.display();
    if (lockFileExists) {
      if (!this._reuse) {
        throw new Error('Display ' + display + ' is already in use and the "reuse" option is false.');
      }
    } else {
      if (display) {
        this._process = spawn('Xvfb', [display].concat(this._xvfb_args));
        this._process.stderr?.on('data', (data) => {
          if (!this._silent) {
            process.stderr.write(data);
          }
        });
      }
      // Bind an error listener to prevent an error from crashing node.
      this._process?.once('error', function (e) {
        onAsyncSpawnError(e);
      });
    }
  }

  private _killProcess () {
    this._process?.kill();
    this._process = undefined;
  }

  private _lockFile (displayNum = this.display()?.toString().replace(/^:/, '')) {
    return '/tmp/.X' + displayNum + '-lock';
  }
}

declare namespace Xvfb {
  interface Options {
    displayNum?: number;
    reuse?: boolean;
    /**
     * Maximum time to start/stop xvfb process.
     * @defaultValue 500
     */
    timeout?: number;
    /**
     * Whether or not to write errors to the stderr of the current process.
     * @defaultValue false
     */
    silent?: boolean;
    xvfb_args?: string[];
  }

  type Callback = ((error: Error) => void) | ((error: null, process: ChildProcess) => void);
}

export default Xvfb;
