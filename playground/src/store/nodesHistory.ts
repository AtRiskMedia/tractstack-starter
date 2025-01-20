import type { NodesContext } from "@/store/nodes.ts";
import { atom, type WritableAtom } from "nanostores";

export enum PatchOp {
  ADD,
  REMOVE,
  REPLACE,
}

export type HistoryPatch = {
  op: PatchOp;
  undo: (ctx: NodesContext) => void;
  redo: (ctx: NodesContext) => void;
};

export class NodesHistory {
  public history: WritableAtom<HistoryPatch[]> = atom([]);
  public headIndex: WritableAtom<number> = atom(0);

  protected _ctx: NodesContext;
  protected _maxBuffer: number;

  constructor(ctx: NodesContext, maxBuffer: number) {
    this._ctx = ctx;
    this._maxBuffer = maxBuffer;
  }

  canUndo(): boolean {
    return this.history.get().length > 0 && this.headIndex.get() < this.history.get().length;
  }

  canRedo(): boolean {
    return this.history.get().length > 0 && this.headIndex.get() > 0;
  }

  addPatch(patch: HistoryPatch) {
    while (this.headIndex.get() !== 0) {
      this.history.get().shift();
      this.headIndex.set(this.headIndex.get() - 1);
    }

    this.history.get().unshift(patch);
    if (this.history.get().length > this._maxBuffer) {
      this.history.get().pop();
    }
    this.history.set([...this.history.get()]);
  }

  undo() {
    if (this.headIndex.get() < this.history.get().length) {
      this.history.get()[this.headIndex.get()].undo(this._ctx);
      this.headIndex.set(this.headIndex.get() + 1);
    }
  }

  redo() {
    if (this.headIndex.get() > 0) {
      this.history.get()[this.headIndex.get() - 1].redo(this._ctx);
      this.headIndex.set(this.headIndex.get() - 1);
    }
  }

  clearHistory() {
    this.history.set([]);
    this.headIndex.set(0);
  }
}
