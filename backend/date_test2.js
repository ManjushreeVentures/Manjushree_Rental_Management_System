const d1 = new Date("2026-06-01T00:00:00Z");
const epoch = new Date(Date.UTC(1899, 11, 30));
const diffDays = Math.round((d1 - epoch) / (1000 * 60 * 60 * 24));
console.log("Excel Serial for Jun 1 2026:", diffDays);

// Now apply my formula
const testDate = new Date(Date.UTC(1899, 11, 30 + diffDays));
console.log("My Formula Output for", diffDays, ":", testDate.toISOString());

const may31 = new Date("2026-05-31T00:00:00Z");
const may31Days = Math.round((may31 - epoch) / (1000 * 60 * 60 * 24));
console.log("Excel Serial for May 31 2026:", may31Days);
