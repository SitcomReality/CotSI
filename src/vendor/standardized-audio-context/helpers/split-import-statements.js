/*
 * This massive regex tries to cover all the following cases.
 *
 * import './path';
 * import defaultImport from './path.js';
 * import { namedImport } from './path.js';
 * import { namedImport as renamendImport } from './path.js';
 * import * as namespaceImport from './path.js';
 * import defaultImport, { namedImport } from './path.js';
 * import defaultImport, { namedImport as renamendImport } from './path.js';
 * import defaultImport, * as namespaceImport from './path.js';
 */
const IMPORT_STATEMENT_REGEX = /^import(?:(?:[\s]+[\w]+|(?:[\s]+[\w]+[\s]*,)?[\s]*\{[\s]*[\w]+(?:[\s]+as[\s]+[\w]+)?(?:[\s]*,[\s]*[\w]+(?:[\s]+as[\s]+[\w]+)?)*[\s]*}|(?:[\s]+[\w]+[\s]*,)?[\s]*\*[\s]+as[\s]+[\w]+)[\s]+from)?(?:[\s]*)("([^"\\]|\\.)+"|'([^'\\]|\\.)+')(?:[\s]*);?/; // tslint:disable-line:max-line-length
export const splitImportStatements = (source, url) => {
    const importStatements = [];
    let sourceWithoutImportStatements = source.replace(/^[\s]+/, '');
    let result = sourceWithoutImportStatements.match(IMPORT_STATEMENT_REGEX);
    while (result !== null) {
        const unresolvedUrl = result[1].slice(1, -1);
        const importStatementWithResolvedUrl = result[0]
            .replace(/([\s]+)?;?$/, '')
            .replace(unresolvedUrl, new URL(unresolvedUrl, url).toString());
        importStatements.push(importStatementWithResolvedUrl);
        sourceWithoutImportStatements = sourceWithoutImportStatements.slice(result[0].length).replace(/^[\s]+/, '');
        result = sourceWithoutImportStatements.match(IMPORT_STATEMENT_REGEX);
    }
    return [importStatements.join(';'), sourceWithoutImportStatements];
};
