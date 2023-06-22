const ticketData = require("./strand-ticket-data.json");
const showData = require("./strand-shows.json");

const removableTerms = [
  "EastSide Arts",
  "Live band",
  "Event Cinema",
  "with characters in costumes",
  "NT Live",
  "Fundraising Event",
];

const missingShows = [];
const performanceConflict = [];

const createKey = (value) =>
  value
    .trim()
    .toLowerCase()
    // Remove any terms which may be prefix, suffix or missing
    .replace(new RegExp(removableTerms.join("|"), "gi"), "")
    // Convert some number words to number characters
    .replace(/\bone\b/i, "1")
    .replace(/\btwo\b/i, "2")
    .replace(/\bthree\b/i, "3")
    // Convert accented characters into english letters for easier comparison
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Remove any stuff that's left that'll be hard to match
    .replace(/[^\w\s]+/g, "")
    .replace(/\-/g, "")
    .replace(/\s+/g, "");

ticketData.forEach((ticketShow) => {
  let match;

  const ticketShowTitleKey = createKey(ticketShow.title);

  // Find an exact match
  showData.forEach((show) => {
    if (createKey(show.title) === ticketShowTitleKey) {
      match = show;
    }
  });

  // If we can't find an exact match...
  if (!match) {
    const partialMatches = [];

    // ... look for a partial match in both directions
    showData.forEach((show) => {
      const showTitleKey = createKey(show.title);
      if (
        showTitleKey.includes(ticketShowTitleKey) ||
        ticketShowTitleKey.includes(showTitleKey)
      ) {
        partialMatches.push(show);
      }
    });

    // But, let's only use that partial match if it's the only match found
    if (partialMatches.length === 1) {
      match = partialMatches[0];
    }
  }

  if (!match) {
    missingShows.push({ ticketShow });
  } else {
    const ticketShowSortedTimes = ticketShow.performances
      .map(({ time }) => time)
      .sort();
    const showSortedTimes = match.performances.map(({ time }) => time).sort();
    if (
      JSON.stringify(ticketShowSortedTimes) !== JSON.stringify(showSortedTimes)
    ) {
      performanceConflict.push({ ticketShow, match });
    }
  }
});

console.log("\n### Data discrepancy check");
if (missingShows.length > 0 || performanceConflict.length > 0) {
  missingShows.forEach(({ ticketShow }) => {
    console.log(` - ❌ "${ticketShow.title}" has no match in the show data`);
  });
  performanceConflict.forEach(({ ticketShow, match }) => {
    console.log(
      ` - ❌ Performances for "${ticketShow.title}" and "${match.title}" do not match`
    );
  });
} else {
  console.log(" - ✅ No discrepancies found");
}
