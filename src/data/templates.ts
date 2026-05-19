import type { Template } from './types';

export const TEMPLATES: Template[] = [
  {
    id: 'gym-bro',
    label: 'Gym Bro',
    blurb: 'The cold truth about your lifting persona',
    emoji: '🦍',
    accent: { start: '#FF8A3D', end: '#FF2D87', glow: '#FF6B3D' },
    categories: [
      { key: 'mass', label: 'Mass', hint: 'plate count, not vibes' },
      { key: 'mirror_time', label: 'Mirror Time' },
      { key: 'preworkout', label: 'Pre-Workout Reliance' },
      { key: 'form', label: 'Form' },
      { key: 'rest_day_hatred', label: 'Rest-Day Hatred' },
      { key: 'aesthetic_splits', label: 'Aesthetic Splits' },
    ],
    archetypes: [
      {
        name: 'Lord of the Lat Spread',
        tagline: 'you are the wallpaper of your own brain',
        weights: { mass: 1, mirror_time: 1, aesthetic_splits: 1, rest_day_hatred: 1, form: 0.5 },
      },
      {
        name: 'Mirror Apostle',
        tagline: 'your delts have a podcast now',
        weights: { mirror_time: 1.4, mass: 0.6, aesthetic_splits: 0.6, form: -0.4 },
      },
      {
        name: 'Powdered Saint',
        tagline: '4 scoops and a prayer',
        weights: { preworkout: 1.6, rest_day_hatred: 0.8, form: -0.4 },
      },
      {
        name: 'Vanity Optimizer',
        tagline: 'arms day is every day',
        weights: { aesthetic_splits: 1.4, mirror_time: 0.8, mass: -0.3 },
      },
      {
        name: 'Phone-Camera Bro',
        tagline: 'the lighting in here is criminal',
        weights: { mirror_time: 1.2, aesthetic_splits: 0.8, form: -0.6, mass: -0.2 },
      },
      {
        name: 'Cardio Apologist',
        tagline: 'still counts as a lift',
        weights: { rest_day_hatred: 1.2, mass: -0.6, aesthetic_splits: -0.3 },
      },
      {
        name: 'Yoga Defector',
        tagline: 'breathwork-pilled, plate-curious',
        weights: { form: 1.4, mass: -0.4, preworkout: -0.4, rest_day_hatred: -0.4 },
      },
      {
        name: 'Treadmill Tourist',
        tagline: 'the gym is mostly a vibe to you',
        weights: {
          mass: -1,
          mirror_time: -1,
          aesthetic_splits: -1,
          rest_day_hatred: -1,
          form: -1,
          preworkout: -1,
        },
        bias: 0.1,
      },
    ],
  },
  {
    id: 'roommate',
    label: 'Roommate',
    blurb: 'Your lease behavior, finally on the record',
    emoji: '🛋️',
    accent: { start: '#9B8CFF', end: '#5BD2F0', glow: '#7AA9FF' },
    categories: [
      { key: 'dish_karma', label: 'Dish Karma' },
      { key: 'noise_discipline', label: 'Noise Discipline' },
      { key: 'bill_reliability', label: 'Bill Reliability' },
      { key: 'vibe_curation', label: 'Vibe Curation' },
      { key: 'snack_sharing', label: 'Snack Sharing' },
      { key: 'bathroom_honor', label: 'Bathroom Honor' },
    ],
    archetypes: [
      {
        name: 'Patron Saint of the Lease',
        tagline: 'they will name a candle after you',
        weights: {
          dish_karma: 1,
          noise_discipline: 1,
          bill_reliability: 1,
          bathroom_honor: 1,
          vibe_curation: 0.6,
          snack_sharing: 0.6,
        },
      },
      {
        name: 'Beloved Liability',
        tagline: 'broke, late, but the apartment is fun now',
        weights: { vibe_curation: 1.4, snack_sharing: 1.0, bill_reliability: -0.8 },
      },
      {
        name: 'Loud Clean Freak',
        tagline: 'the dishes are done. the screams are not.',
        weights: { dish_karma: 1.2, bathroom_honor: 0.8, noise_discipline: -1.0 },
      },
      {
        name: 'Functional Ghost',
        tagline: 'pays the bills, has never been seen',
        weights: { bill_reliability: 1.4, vibe_curation: -0.8, snack_sharing: -0.6 },
      },
      {
        name: 'Quiet Slob',
        tagline: 'a polite tornado',
        weights: { noise_discipline: 1.2, dish_karma: -1.0, bathroom_honor: -0.6 },
      },
      {
        name: 'Generous Goblin',
        tagline: 'shares everything. owns nothing clean.',
        weights: { snack_sharing: 1.4, bathroom_honor: -1.0, dish_karma: -0.4 },
      },
      {
        name: 'Why Are You Still On The Lease',
        tagline: 'a lawyer is being consulted',
        weights: {
          dish_karma: -1,
          noise_discipline: -1,
          bill_reliability: -1,
          vibe_curation: -1,
          snack_sharing: -1,
          bathroom_honor: -1,
        },
        bias: 0.05,
      },
      {
        name: 'Dishwasher Cop',
        tagline: 'enforces order. no fun allowed.',
        weights: { dish_karma: 1.2, noise_discipline: 1.0, vibe_curation: -0.6, snack_sharing: -0.4 },
      },
    ],
  },
  {
    id: 'dating-profile',
    label: 'Dating Profile',
    blurb: 'A cold radar of your romantic export',
    emoji: '💌',
    accent: { start: '#FF4FB1', end: '#FF7A4F', glow: '#FF6B8C' },
    categories: [
      { key: 'selfie_game', label: 'Selfie Game' },
      { key: 'bio_wit', label: 'Bio Wit' },
      { key: 'texting_stamina', label: 'Texting Stamina' },
      { key: 'date_logistics', label: 'Date Logistics' },
      { key: 'mystery', label: 'Mystery' },
      { key: 'red_flag_energy', label: 'Red Flag Energy' },
    ],
    archetypes: [
      {
        name: 'Algorithm Crush',
        tagline: 'engineered in a lab. faintly suspicious.',
        weights: {
          selfie_game: 1,
          bio_wit: 1,
          texting_stamina: 1,
          date_logistics: 1,
          mystery: 0.4,
          red_flag_energy: -1,
        },
      },
      {
        name: 'Posts and Ghosts',
        tagline: 'looks great, replies in business quarters',
        weights: { selfie_game: 1.2, mystery: 1.0, texting_stamina: -1.0 },
      },
      {
        name: 'Honestly Concerning Comedian',
        tagline: 'funny enough to ignore the alarm bells',
        weights: { bio_wit: 1.4, red_flag_energy: 1.2, date_logistics: -0.4 },
      },
      {
        name: 'Forever Pen Pal',
        tagline: 'will text for months, will not meet',
        weights: { texting_stamina: 1.4, date_logistics: -1.2, mystery: 0.4 },
      },
      {
        name: 'Calendar Crush',
        tagline: 'reservations made. personality pending.',
        weights: { date_logistics: 1.4, bio_wit: -0.8, mystery: -0.4 },
      },
      {
        name: 'Suspicious Anonymous',
        tagline: 'three photos. all of a sunset.',
        weights: { mystery: 1.6, selfie_game: -1.0, bio_wit: -0.4 },
      },
      {
        name: 'Visible From Space',
        tagline: 'the red flags have their own flag',
        weights: { red_flag_energy: 1.8, bio_wit: 0.4, date_logistics: -0.6 },
      },
      {
        name: 'Catfish Energy',
        tagline: 'no photos, no jokes, no plans',
        weights: {
          selfie_game: -1,
          bio_wit: -1,
          texting_stamina: -1,
          date_logistics: -1,
        },
        bias: 0.05,
      },
    ],
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function defaultScoresFor(template: Template): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of template.categories) out[c.key] = 50;
  return out;
}
