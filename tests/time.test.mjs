import assert from 'node:assert/strict';
import test from 'node:test';
import { durationInSeconds, formatDuration } from '../src/lib/time.ts';

test('calculates elapsed whole seconds from backend timestamps', () => {
    assert.equal(durationInSeconds('2026-09-25T12:00:00.000Z', '2026-09-25T12:03:20.900Z'), 200);
});

test('does not display a negative duration', () => {
    assert.equal(durationInSeconds('2026-09-25T12:00:01Z', '2026-09-25T12:00:00Z'), 0);
});

test('formats durations below and above one hour', () => {
    assert.equal(formatDuration(83), '01:23');
    assert.equal(formatDuration(3_723), '01:02:03');
});
