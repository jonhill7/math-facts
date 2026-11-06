import { ALL_FACTS } from './facts';

// The dragon world tour. Knowing more facts unlocks new places to fly to.
// Each place gives the games its own look. The first eight need facts known
// well; the far places after them also need facts mastered (box 5), which
// takes weeks of spaced practice, ending with the Moon for mastering every
// fact. Places are listed in the order they open: each one needs at least as
// much as the one before, so a kid never skips ahead of the route.

export interface Place {
  id: string;
  name: string;
  emoji: string;
  need: number; // facts known well (box 3 or higher) to unlock
  mastered?: number; // facts mastered (box 5) to unlock, for the far places
  pitch: [string, string]; // the soccer pitch's two stripe colors
  night: string; // the dark house's color
  fact: string;
}

export const PLACES: Place[] = [
  { id: 'meadow', name: 'Home Meadow', emoji: '🌳', need: 0, pitch: ['#2f8f3a', '#267a30'], night: '#0b1020', fact: 'Where every dragon starts its journey.' },
  { id: 'iceland', name: 'Iceland', emoji: '🌋', need: 15, pitch: ['#3f8f7a', '#357a68'], night: '#0b1a2a', fact: 'Iceland has volcanoes hiding under its glaciers.' },
  { id: 'brazil', name: 'Brazil', emoji: '🏖️', need: 35, pitch: ['#d9b26a', '#c9a15a'], night: '#1a1030', fact: "Brazil has won the men's World Cup five times, more than any other country." },
  { id: 'kenya', name: 'Kenya', emoji: '🦒', need: 60, pitch: ['#9a9a3a', '#8a8a30'], night: '#1f140a', fact: 'A giraffe has seven bones in its neck, the same as you.' },
  { id: 'japan', name: 'Japan', emoji: '🌸', need: 90, pitch: ['#4f9a5a', '#43884e'], night: '#1c0f24', fact: 'Japan is made of more than 14,000 islands.' },
  { id: 'egypt', name: 'Egypt', emoji: '🐫', need: 130, pitch: ['#c99a55', '#b8894a'], night: '#20160a', fact: 'The Great Pyramid was the tallest building on Earth for about 3,800 years.' },
  { id: 'australia', name: 'Australia', emoji: '🦘', need: 180, pitch: ['#b86a3a', '#a65e32'], night: '#1a0d0a', fact: 'A group of kangaroos is called a mob.' },
  { id: 'antarctica', name: 'Antarctica', emoji: '🐧', need: 240, pitch: ['#9ab8c8', '#8aa8b8'], night: '#0a1424', fact: 'Antarctica is the coldest, windiest and driest continent.' },
  { id: 'norway', name: 'Norway', emoji: '🌌', need: 240, mastered: 225, pitch: ['#2f7f6a', '#276b59'], night: '#071a1c', fact: 'In Norway you can see the northern lights dance across the sky.' },
  { id: 'india', name: 'India', emoji: '🐘', need: 240, mastered: 250, pitch: ['#c98a3a', '#b87b30'], night: '#1f0f14', fact: 'Our numbers 0 to 9 were first written this way in India.' },
  { id: 'peru', name: 'Peru', emoji: '🦙', need: 240, mastered: 270, pitch: ['#6a8f3a', '#5c7d32'], night: '#14101f', fact: 'Machu Picchu was built high in the mountains with no mortar at all.' },
  { id: 'moon', name: 'The Moon', emoji: '🌕', need: 240, mastered: ALL_FACTS.length, pitch: ['#8a8f99', '#7a7f89'], night: '#05060c', fact: 'Only twelve people have ever walked on the Moon.' },
];

export const placeById = (id: string | undefined) => PLACES.find((p) => p.id === id) ?? PLACES[0];
export const unlocked = (place: Place, known: number, mastered = 0) => known >= place.need && mastered >= (place.mastered ?? 0);

// How much is still to learn before a place opens, for its locked card.
export function placeGoal(place: Place, known: number, mastered: number): string {
  if (known < place.need) return `Know ${place.need} facts to fly here (${place.need - known} to go).`;
  if (place.mastered) return `Master ${place.mastered === ALL_FACTS.length ? `all ${place.mastered}` : place.mastered} facts to fly here (${Math.max(0, place.mastered - mastered)} to go).`;
  return `Know ${place.need} facts to fly here (${Math.max(0, place.need - known)} to go).`;
}
