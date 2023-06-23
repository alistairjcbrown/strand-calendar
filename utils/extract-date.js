const dateRegex =
  /(?:\W|^)(\d+\s*(?:st|nd|rd|th))\s+(January|February|March|April|May|June|July|August|September|October|November|December)\W(.*)?/i;
const timeRegex = /(?:\W|^)(\d+)([.:]\d+)?\s*(am|pm)(?:\W|$)/i;

const matchDate = (value) => value.match(dateRegex);
const matchTime = (value) => value.match(timeRegex);

const extractDate = (raw, previousContext) => {
  const multiple = raw.split(" & ");
  if (multiple.length > 1) {
    return multiple.reduce(
      (memo, piece, index) => memo.concat(extractDate(piece, memo[index - 1])),
      []
    );
  }

  const dateMatch = matchDate(raw);
  if (dateMatch) {
    const [, day, month, rest] = dateMatch;

    const timeMatch = matchTime(rest);
    if (timeMatch) {
      const [, hour, minutes, period] = timeMatch;
      return [
        {
          day: day.trim(),
          month: month.trim(),
          time: `${hour.trim()}${(minutes || ":00")
            .trim()
            .replace(".", ":")}${period.trim()}`,
        },
      ];
    }
  } else {
    const timeMatch = matchTime(raw);
    // If there's only a time match, but we have previous context, we can try again
    if (timeMatch && previousContext) {
      return extractDate(
        `${previousContext.day} ${previousContext.month} ${raw}`
      );
    }
  }

  return [];
};

module.exports = {
  extractDate,
  matchDate,
  matchTime,
};
