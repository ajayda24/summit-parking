import type { Database as SqlJsDb, SqlValue } from "sql.js";

/**
 * A tiny better-sqlite3-style facade over sql.js (SQLite compiled to WebAssembly),
 * so the whole marketplace engine runs inside the browser.
 */
export type Row = Record<string, any>;
export type Stmt = {
  get: (...params: unknown[]) => Row | undefined;
  all: (...params: unknown[]) => Row[];
  run: (...params: unknown[]) => { lastInsertRowid: number; changes: number };
};
export type DB = {
  prepare: (sql: string) => Stmt;
  exec: (sql: string) => void;
  transaction: <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A) => R;
  raw: SqlJsDb;
  dirty: boolean;
};

const norm = (params: unknown[]): SqlValue[] =>
  params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : (p as SqlValue)));

export function wrap(raw: SqlJsDb): DB {
  let depth = 0;
  const api: DB = {
    raw,
    dirty: false,
    exec: (sql) => {
      raw.exec(sql);
      api.dirty = true;
    },
    prepare: (sql) => ({
      get: (...params) => {
        const s = raw.prepare(sql);
        try {
          s.bind(norm(params));
          return s.step() ? (s.getAsObject() as Row) : undefined;
        } finally {
          s.free();
        }
      },
      all: (...params) => {
        const s = raw.prepare(sql);
        const rows: Row[] = [];
        try {
          s.bind(norm(params));
          while (s.step()) rows.push(s.getAsObject() as Row);
        } finally {
          s.free();
        }
        return rows;
      },
      run: (...params) => {
        raw.run(sql, norm(params));
        const changes = raw.getRowsModified();
        if (changes) api.dirty = true;
        const id = raw.exec("SELECT last_insert_rowid()")[0]?.values[0][0];
        return { lastInsertRowid: Number(id ?? 0), changes };
      },
    }),
    transaction:
      (fn) =>
      (...args) => {
        const sp = `sp${depth++}`;
        raw.run(`SAVEPOINT ${sp}`);
        try {
          const r = fn(...args);
          raw.run(`RELEASE ${sp}`);
          return r;
        } catch (e) {
          raw.run(`ROLLBACK TO ${sp}`);
          raw.run(`RELEASE ${sp}`);
          throw e;
        } finally {
          depth--;
        }
      },
  };
  return api;
}
