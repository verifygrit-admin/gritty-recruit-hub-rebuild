/**
 * @vitest-environment jsdom
 *
 * components.test.jsx — Sprint 026 Phase 1a (Coach UI).
 *
 * Asserts the locked `data-testid` taxonomy from
 * `tests/e2e/bulk-pds/SELECTORS.md` is present on each bulk-pds component
 * and that basic interactive behaviors fire (Add, Remove, Submit gating).
 *
 * Tests are deliberately narrow — they cover the Playwright handshake
 * (selectors live + render correctly) plus one interaction proof per
 * component. Full coverage lives in the E2E specs (§4.4).
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';

// Mock the singleton — components import it transitively for avatar URLs.
vi.mock('../../../src/lib/supabaseClient.js', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.invalid/avatar.jpg' } }),
      }),
    },
  },
}));

import BulkPdsHeader from '../../../src/components/bulk-pds/BulkPdsHeader.jsx';
import BulkPdsBackground, { __OVERLAY_ALPHA } from '../../../src/components/bulk-pds/BulkPdsBackground.jsx';
import CoachIdentityBox from '../../../src/components/bulk-pds/CoachIdentityBox.jsx';
import StudentDropdownPicker from '../../../src/components/bulk-pds/StudentDropdownPicker.jsx';
import PlayerUpdateCardList from '../../../src/components/bulk-pds/PlayerUpdateCardList.jsx';
import PlayerUpdateCard from '../../../src/components/bulk-pds/PlayerUpdateCard.jsx';
import SubmitBatchButton from '../../../src/components/bulk-pds/SubmitBatchButton.jsx';

afterEach(() => cleanup());

const makeStudent = (overrides = {}) => ({
  id: 1,
  user_id: 'student-uuid-1',
  name: 'Sample Player',
  email: 'sample@example.com',
  grad_year: 2027,
  high_school: 'BC High',
  avatar_storage_path: null,
  ...overrides,
});

const EMPTY_FIELDS = {
  height: '', weight: '', speed_40: '', time_5_10_5: '',
  time_l_drill: '', bench_press: '', squat: '', clean: '',
};

describe('BulkPdsHeader', () => {
  it('renders title + how-to copy under the locked testid', () => {
    const { getByTestId } = render(<BulkPdsHeader />);
    const header = getByTestId('bulk-pds-coach-header');
    expect(header).toBeTruthy();
    expect(header.textContent).toMatch(/Player Updates/i);
    expect(header.textContent).toMatch(/Submit/i);
  });
});

describe('BulkPdsBackground', () => {
  it('renders the background layer under the locked testid', () => {
    const { getByTestId } = render(<BulkPdsBackground />);
    expect(getByTestId('bulk-pds-coach-background')).toBeTruthy();
  });

  it('Q5 — locks the overlay alpha within the [0.65, 0.80] range', () => {
    expect(__OVERLAY_ALPHA).toBeGreaterThanOrEqual(0.65);
    expect(__OVERLAY_ALPHA).toBeLessThanOrEqual(0.80);
  });
});

describe('CoachIdentityBox', () => {
  it('renders name / email / school text nodes with locked testids', () => {
    const identity = { name: 'Coach Test', email: 'coach@test.edu', school: 'BC HIGH', loading: false };
    const { getByTestId } = render(<CoachIdentityBox identity={identity} />);
    expect(getByTestId('bulk-pds-coach-identity-box')).toBeTruthy();
    expect(getByTestId('bulk-pds-coach-identity-name').textContent).toBe('Coach Test');
    expect(getByTestId('bulk-pds-coach-identity-email').textContent).toBe('coach@test.edu');
    expect(getByTestId('bulk-pds-coach-identity-school').textContent).toBe('BC HIGH');
  });
});

describe('StudentDropdownPicker', () => {
  it('disables Add until a student is selected, then fires onAdd with the id', () => {
    const onAdd = vi.fn();
    const students = [makeStudent({ user_id: 'a', name: 'Alpha' }), makeStudent({ user_id: 'b', name: 'Bravo' })];
    const { getByTestId } = render(<StudentDropdownPicker students={students} onAdd={onAdd} />);
    const select = getByTestId('bulk-pds-coach-student-picker');
    const button = getByTestId('bulk-pds-coach-student-add-btn');
    expect(button.disabled).toBe(true);
    fireEvent.change(select, { target: { value: 'b' } });
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onAdd).toHaveBeenCalledWith('b');
  });

  it('shows the loading option while students load', () => {
    const { getByTestId } = render(<StudentDropdownPicker students={[]} loading={true} />);
    const select = getByTestId('bulk-pds-coach-student-picker');
    expect(select.disabled).toBe(true);
    expect(select.textContent).toMatch(/loading/i);
  });
});

describe('PlayerUpdateCard', () => {
  it('renders the 5 RO identity fields and all 8 writeable inputs with testids', () => {
    const student = makeStudent({ user_id: 'card-1', name: 'Card Player' });
    const { getByTestId, container } = render(
      <PlayerUpdateCard student={student} fields={EMPTY_FIELDS} errors={null} />
    );
    expect(getByTestId('bulk-pds-coach-card-card-1')).toBeTruthy();
    expect(getByTestId('bulk-pds-coach-card-remove-card-1')).toBeTruthy();
    // Read-only identity: name + email + grad year + id snippet appear in header.
    expect(container.textContent).toMatch(/Card Player/);
    expect(container.textContent).toMatch(/sample@example.com/);
    expect(container.textContent).toMatch(/Class of 2027/);
    expect(container.textContent).toMatch(/ID card-1/);
    // All 8 writeable input testids.
    for (const f of ['height', 'weight', 'speed_40', 'time_5_10_5', 'time_l_drill', 'bench_press', 'squat', 'clean']) {
      expect(getByTestId(`bulk-pds-coach-field-${f}-card-1`)).toBeTruthy();
    }
  });

  it('fires onFieldChange with the field name + value on input', () => {
    const onFieldChange = vi.fn();
    const { getByTestId } = render(
      <PlayerUpdateCard
        student={makeStudent({ user_id: 'x' })}
        fields={EMPTY_FIELDS}
        errors={null}
        onFieldChange={onFieldChange}
      />
    );
    fireEvent.change(getByTestId('bulk-pds-coach-field-weight-x'), { target: { value: '215' } });
    expect(onFieldChange).toHaveBeenCalledWith('x', 'weight', '215');
  });

  it('fires onRemove with the student id when remove clicked', () => {
    const onRemove = vi.fn();
    const { getByTestId } = render(
      <PlayerUpdateCard
        student={makeStudent({ user_id: 'rem' })}
        fields={EMPTY_FIELDS}
        errors={null}
        onRemove={onRemove}
      />
    );
    fireEvent.click(getByTestId('bulk-pds-coach-card-remove-rem'));
    expect(onRemove).toHaveBeenCalledWith('rem');
  });
});

describe('PlayerUpdateCardList', () => {
  it('renders the empty state container under the locked testid', () => {
    const { getByTestId } = render(<PlayerUpdateCardList cards={[]} />);
    expect(getByTestId('bulk-pds-coach-card-list')).toBeTruthy();
  });

  it('renders one PlayerUpdateCard per entry', () => {
    const cards = [
      { student: makeStudent({ user_id: 'a' }), fields: EMPTY_FIELDS },
      { student: makeStudent({ user_id: 'b' }), fields: EMPTY_FIELDS },
    ];
    const { getByTestId } = render(<PlayerUpdateCardList cards={cards} />);
    expect(getByTestId('bulk-pds-coach-card-a')).toBeTruthy();
    expect(getByTestId('bulk-pds-coach-card-b')).toBeTruthy();
  });
});

describe('SubmitBatchButton', () => {
  it('is disabled when `disabled` prop is true, enabled otherwise', () => {
    const { getByTestId, rerender } = render(<SubmitBatchButton disabled={true} />);
    const btn = getByTestId('bulk-pds-coach-submit-btn');
    expect(btn.disabled).toBe(true);
    rerender(<SubmitBatchButton disabled={false} />);
    expect(getByTestId('bulk-pds-coach-submit-btn').disabled).toBe(false);
  });

  it('shows the submitting label while submitting', () => {
    const { getByTestId } = render(<SubmitBatchButton disabled={false} submitting={true} />);
    expect(getByTestId('bulk-pds-coach-submit-btn').textContent).toMatch(/submitting/i);
  });

  it('calls onSubmit when clicked', () => {
    const onSubmit = vi.fn();
    const { getByTestId } = render(<SubmitBatchButton disabled={false} onSubmit={onSubmit} />);
    fireEvent.click(getByTestId('bulk-pds-coach-submit-btn'));
    expect(onSubmit).toHaveBeenCalled();
  });
});
