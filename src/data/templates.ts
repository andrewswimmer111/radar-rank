import type { Template } from './types';

export const TEMPLATES: Template[] = [
{
id: 'athleticism',
label: 'Athleticism',
blurb: 'A subjective breakdown of movement, endurance, and coordination.',
emoji: '🏃',
accent: {
start: '#FF8A3D',
end: '#FF4D6D',
glow: '#FF7A45',
},
categories: [
{ key: 'basketball', label: 'Basketball' },
{ key: 'soccer', label: 'Soccer' },
{ key: 'football', label: 'Football' },
{ key: 'swimming', label: 'Swimming' },
{ key: 'running', label: 'Running' },
{ key: 'coordination', label: 'Coordination' },
],
},

{
id: 'roommate-profile',
label: 'Roommate Profile',
blurb: 'Living compatibility, quantified through observation and opinion.',
emoji: '🛋️',
accent: {
start: '#8B8CFF',
end: '#5CC8FF',
glow: '#7AA9FF',
},
categories: [
{ key: 'cleanliness', label: 'Cleanliness' },
{ key: 'noise_awareness', label: 'Noise Awareness' },
{ key: 'bill_reliability', label: 'Bill Reliability' },
{ key: 'kitchen_etiquette', label: 'Kitchen Etiquette' },
{ key: 'guest_management', label: 'Guest Management' },
{ key: 'overall_vibes', label: 'Overall Vibes' },
],
},

{
id: 'dating-profile',
label: 'Dating Profile',
blurb: 'A subjective profile of communication, chemistry, and consistency.',
emoji: '💌',
accent: {
start: '#FF4FB1',
end: '#FF7A4F',
glow: '#FF6B8C',
},
categories: [
{ key: 'conversation', label: 'Conversation' },
{ key: 'initiative', label: 'Initiative' },
{ key: 'reliability', label: 'Reliability' },
{ key: 'humor', label: 'Humor' },
{ key: 'mystery', label: 'Mystery' },
{ key: 'chemistry', label: 'Chemistry' },
],
},

{
id: 'basketball-player',
label: 'Basketball Player',
blurb: 'Scouting-report style evaluation across core skill areas.',
emoji: '🏀',
accent: {
start: '#FF9F43',
end: '#FF5E62',
glow: '#FF7B54',
},
categories: [
{ key: 'shooting', label: 'Shooting' },
{ key: 'handles', label: 'Handles' },
{ key: 'playmaking', label: 'Playmaking' },
{ key: 'defense', label: 'Defense' },
{ key: 'athleticism', label: 'Athleticism' },
{ key: 'basketball_iq', label: 'Basketball IQ' },
],
},

{
id: 'music-taste',
label: 'Music Taste',
blurb: 'A profile of discovery, range, consistency, and replay value.',
emoji: '🎧',
accent: {
start: '#7F5AF0',
end: '#2CB67D',
glow: '#9B7BFF',
},
categories: [
{ key: 'range', label: 'Range' },
{ key: 'discovery', label: 'Discovery' },
{ key: 'consistency', label: 'Consistency' },
{ key: 'replayability', label: 'Replayability' },
{ key: 'taste_level', label: 'Taste Level' },
{ key: 'aux_skill', label: 'Aux Skill' },
],
},
];

export function getTemplate(id: string): Template | undefined {
return TEMPLATES.find((t) => t.id === id);
}

export function defaultScoresFor(
template: Template
): Record<string, number> {
const out: Record<string, number> = {};

for (const c of template.categories) {
out[c.key] = 50;
}

return out;
}
