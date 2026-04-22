#!/usr/bin/env node
/**
 * G9 integration spot-check — Wave 5 Phase 1.
 * Constructs a trigger-meeting fixture and verifies applyG9SubordinateStep
 * produces the expected cap + fill shape end-to-end through the function.
 * Read-only. No DB calls. No side effects.
 */

import { applyG9SubordinateStep } from '../src/lib/scoring/g9SubordinateStep.js';

// Trigger-meeting student profile
const profile = {
  hs_lat: 42.5,
  hs_lng: -71.0,
};

// Base scoring output with all three triggers met
const base = {
  top30: [],
  top50: [],
  scored: [],
  athFit: { D1: 0.30, D2: 0.75, D3: 0.85 },
  athFitBase: {},
  boost: 0,
  topTier: 'D3',
  recruitReach: 450,
  acadRigorScore: 0.92,
  gates: {},
};

// Build a pool with >=30 D2 schools (for trigger 3), including Bentley + Mines
const pool = [
  { unitid: 1, school_name: 'Bentley University', type: 'D2',
    lat: 42.388, lng: -71.217, acadScore: 0.88 },
  { unitid: 2, school_name: 'Colorado School of Mines', type: 'D2',
    lat: 39.751, lng: -105.222, acadScore: 0.91 },
];
for (let i = 0; i < 30; i++) {
  pool.push({ unitid: 100 + i, school_name: `Generic D2 ${i}`, type: 'D2',
    lat: 40 + i * 0.1, lng: -80 - i * 0.1, acadScore: 0.50 + i * 0.005 });
}
for (let i = 0; i < 40; i++) {
  pool.push({ unitid: 200 + i, school_name: `D3 ${i}`, type: 'D3',
    lat: 41 + i * 0.1, lng: -72 - i * 0.1, acadScore: 0.99 - i * 0.01 });
}

const result = applyG9SubordinateStep(base, profile, pool);

console.log('=== G9 Integration Spot-Check ===');
console.log('Input pool:', pool.length, 'schools',
  `(D2=${pool.filter(s => s.type === 'D2').length}, D3=${pool.filter(s => s.type === 'D3').length})`);
console.log('Returned top30 length:', result.top30.length);
console.log('top30 D2 count:', result.top30.filter(s => s.type === 'D2').length);
console.log('top30 D3 count:', result.top30.filter(s => s.type === 'D3').length);
console.log('First two names:', result.top30.slice(0, 2).map(s => s.school_name));
console.log('Next 3 D3 (should be highest-acadScore first):',
  result.top30.slice(2, 5).map(s => `${s.school_name} (acad=${s.acadScore})`));

// Assertions
const d2s = result.top30.filter(s => s.type === 'D2');
const d3s = result.top30.filter(s => s.type === 'D3');
const names = d2s.map(s => s.school_name);

const checks = [
  ['total <= 30', result.top30.length <= 30],
  ['D2 count exactly 2', d2s.length === 2],
  ['D2 set is {Bentley, Mines}',
    names.includes('Bentley University') && names.includes('Colorado School of Mines')],
  ['D3 fill present', d3s.length > 0],
  ['D3 descending on acadScore',
    d3s.every((s, i, arr) => i === 0 || arr[i-1].acadScore >= s.acadScore)],
  ['input base not mutated (top30 still empty)', base.top30.length === 0],
];

let pass = 0;
let fail = 0;
for (const [label, ok] of checks) {
  console.log((ok ? '  ✓' : '  ✗') + ' ' + label);
  ok ? pass++ : fail++;
}

console.log(`\n${pass}/${checks.length} checks passed.`);
process.exit(fail === 0 ? 0 : 1);
