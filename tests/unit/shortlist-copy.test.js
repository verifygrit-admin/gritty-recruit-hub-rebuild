/**
 * shortlist-copy.test.js — Sprint 004 Wave 2 (S1b).
 * Verbatim test on the Pre-Read Docs Library explainer.
 */

import { describe, it, expect } from 'vitest';
import { PRE_READ_DOCS_EXPLAINER } from '../../src/lib/copy/shortlistCopy.js';

describe('shortlistCopy — S1b Pre-Read Docs explainer', () => {
  it('matches the verbatim operator-approved string', () => {
    expect(PRE_READ_DOCS_EXPLAINER).toBe(
      'Coaches and admissions officials at academically selective schools will require some or all of these documents to recruit you. Upload your documents once here, beginning on February 1st of your Junior Year, then share them with individual schools from each school card below when requested.'
    );
  });
});
