// Unit testy práce s daty: node tests/dates.test.mjs
import * as D from '../js/dates.js';
import assert from 'node:assert/strict';
const r = (f,i=1)=>({freq:f,interval:i});
assert.equal(D.nextOccurrence('2026-01-31', r('monthly'), '2026-02-10'), '2026-03-31'); // Feb skipped
assert.equal(D.nextOccurrence('2026-01-15', r('monthly'), '2026-11-08'), '2026-11-15');
assert.equal(D.nextOccurrence('2026-01-15', r('monthly',3), '2026-11-08'), '2027-01-15');
assert.equal(D.nextOccurrence('2024-02-29', r('yearly'), '2025-01-01'), '2028-02-29');
assert.equal(D.nextOccurrence('2020-06-01', r('yearly',2), '2026-11-08'), '2028-06-01');
assert.equal(D.nextOccurrence('2025-03-01', r('none'), '2026-11-08'), '2025-03-01');
assert.equal(D.nextOccurrence('2027-03-01', r('yearly'), '2026-11-08'), '2027-03-01');
assert.equal(D.nextOccurrence('2026-11-08', r('monthly'), '2026-11-08'), '2026-11-08');
assert.equal(D.daysBetween('2026-03-28','2026-03-30'), 2); // DST
assert.equal(D.addDays('2026-12-31',1), '2027-01-01');
assert.equal(D.remindDaysToMinutes(1), 900);
assert.equal(D.remindDaysToMinutes(28), 40320-540);
assert.equal(D.remindDaysToMinutes(40), 40320-540);
for (const n of [0,1,3,7,14,28]) assert.equal(D.minutesToRemindDays(D.remindDaysToMinutes(n)), n);
assert.equal(D.toRRule(r('yearly',2)), 'RRULE:FREQ=YEARLY;INTERVAL=2');
assert.deepEqual(D.fromRRule(['RRULE:FREQ=MONTHLY;INTERVAL=3']), r('monthly',3));
assert.deepEqual(D.fromRRule(['RRULE:FREQ=YEARLY']), r('yearly',1));
assert.equal(D.relativeCz(3),'za 3 dny'); assert.equal(D.relativeCz(-5),'před 5 dny'); assert.equal(D.relativeCz(12),'za 12 dní');
console.log('dates OK');
assert.equal(D.addMonths('2026-08-31', 6), '2027-02-28');
assert.equal(D.repeatMonths({ freq: 'yearly', interval: 2 }), 24);
console.log('všechny testy prošly');
