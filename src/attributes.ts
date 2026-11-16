import type { Attribute } from '@reportportal/client-javascript/models';

/**
 * Convert Gherkin tags (already stripped of adapter-consumed special tags like `@skip()`,
 * `@lock()`, etc. - see `test.tags`) into ReportPortal attributes.
 * `@key:value` becomes `{ key, value }`, a plain `@tag` becomes `{ value: tag }`.
 */
export function tagsToAttributes(tags: readonly string[]): Attribute[] {
    return tags.map(tag => {
        const name = tag.startsWith('@') ? tag.slice(1) : tag;
        const separatorIndex = name.indexOf(':');
        if (separatorIndex === -1) return { value: name };
        return { key: name.slice(0, separatorIndex), value: name.slice(separatorIndex + 1) };
    });
}
