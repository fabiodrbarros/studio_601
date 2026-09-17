/** Additive JSON migration: existing durations and every row remain untouched.
 * The catalog lives in a JSON column, so no SQL column rebuild is necessary.
 * Apply inside the importing transaction; repeat calls are harmless.
 */
export function migrateCatalogV2(previous) {
 if(previous.schemaVersion===2)return structuredClone(previous);
 if(previous.schemaVersion!=null&&previous.schemaVersion!==1)throw Error('Versão de catálogo desconhecida.');
 return {...structuredClone(previous),schemaVersion:2};
}
