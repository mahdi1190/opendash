// lib/meet-logic.mjs - the page's meetings and last-contact rules, for Node
// (the stories, person.get, tests).
//
// The single source is in the page: src/app/12-home-meet-logic.js (meetings:
// dedupe, attendees -> People, next / ended) and src/app/53-people-contact-logic.js
// (last contact). Both are pure classic-script files; the meetings file calls
// the ppl* helpers of src/app/52-people-link.js, so that file is evaluated with
// them, the same way lib/people-tags.mjs does it. tests/meet-logic.test.mjs keeps
// the files pure.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const SOURCE_FILES = Object.freeze([
  join(APP, '52-people-link.js'), join(APP, '12-home-meet-logic.js'), join(APP, '53-people-contact-logic.js'),
]);

const NAMES = [
  'homeDedupeEvents', 'meetPeopleIndex', 'meetAttendeePerson', 'homeMeetingAttendees', 'homeEventPeople', 'homeIsMeeting',
  'homeMeetings', 'homeNextMeeting', 'homeEndedMeetings',
  'CONTACT_KINDS', 'lastContactMap', 'lastContactFor', 'contactDaysAgo', 'contactDue',
];

const code = SOURCE_FILES.map(f => readFileSync(f, 'utf8')).join('\n;\n');
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${code}\nreturn { ${NAMES.join(', ')} };`)();

export const {
  homeDedupeEvents, meetPeopleIndex, meetAttendeePerson, homeMeetingAttendees, homeEventPeople, homeIsMeeting,
  homeMeetings, homeNextMeeting, homeEndedMeetings,
  CONTACT_KINDS, lastContactMap, lastContactFor, contactDaysAgo, contactDue,
} = api;
