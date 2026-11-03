// The dragon world tour. Knowing more facts unlocks new places to fly to.
// Each place gives the games its own look.

export interface Place {
  id: string;
  name: string;
  emoji: string;
  need: number; // facts known well (box 3 or higher) to unlock
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
];

export const placeById = (id: string | undefined) => PLACES.find((p) => p.id === id) ?? PLACES[0];
export const unlocked = (place: Place, known: number) => known >= place.need;
