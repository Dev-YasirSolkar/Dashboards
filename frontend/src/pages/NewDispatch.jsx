import React from 'react';

export default function NewDispatch() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 text-center space-y-4">
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
          📝
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white">
          New Entry Clean Canvas
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          New entry code cleared. Ready for your new entry workflow and single-sheet logic.
        </p>
      </div>
    </div>
  );
}
