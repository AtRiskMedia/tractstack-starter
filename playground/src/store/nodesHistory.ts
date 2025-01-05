import type { NodesContext } from "@/store/nodes.ts";

export enum PatchOp { ADD, REMOVE, REPLACE }

export type HistoryPatch = {
  op: PatchOp;
  undo: (ctx: NodesContext) => void;
  redo: (ctx: NodesContext) => void;
}

export class NodesHistory {
  protected _ctx: NodesContext;
  protected _maxBuffer: number;
  protected _history: HistoryPatch[] = [];
  protected _headIndex: number = 0;

  constructor(ctx: NodesContext, maxBuffer: number) {
    this._ctx = ctx;
    this._maxBuffer = maxBuffer;
  }

  addPatch(patch: HistoryPatch) {
    while(this._headIndex !== 0) {
      this._history.shift();
      this._headIndex--;
    }

    this._history.unshift(patch);
    if(this._history.length > this._maxBuffer) {
      this._history.pop();
    }
  }

  undo() {
    if(this._headIndex < this._history.length) {
      this._history[this._headIndex].undo(this._ctx);
      this._headIndex++;
    }
  }

  redo() {
    if(this._headIndex > 0) {
      this._history[this._headIndex-1].redo(this._ctx);
      this._headIndex--;
    }
  }
}