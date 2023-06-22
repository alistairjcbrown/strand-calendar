const { writeFileSync } = require("fs");
const cheerio = require("cheerio");
const parseDuration = require("parse-duration");
const { parse, format, getTime } = require("date-fns");
const en = require("date-fns/locale/en-GB");

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const parseDateTime = (date, time) =>
  parse(`${date} ${time}`, "EEEE d MMMM HH:mm", new Date(), { locale: en });

// const formatOverviewItem = (key, value) => {
//   if (value.split(",").length > 1) {
//     return value.split(",").map((item) => item.trim());
//   }
//   if (key === "duration") return parseDuration(value);
//   if (key === "actors" || key === "category") return [value.trim()];
//   return value.trim();
// };

const getDataFromHeading = ($heading) => {
  const titleText = $heading.text().trim();
  const titleWithCertificate = titleText.match(/^(.+?)\s+- Certificate (.*)$/i);
  if (!titleWithCertificate) return { title: titleText };
  return {
    title: titleWithCertificate[1].trim(),
    certificate: titleWithCertificate[2].trim(),
  };
};

const createShowFrom = ($, $performance) => {
  const { title, certificate } = getDataFromHeading($performance.find("h3"));
  const overview = {};

  if (certificate) overview["age-restriction"] = certificate;

  const restrictionLogo = $performance.find("h3 a");
  if (restrictionLogo.length > 0) {
    const restriction = restrictionLogo.attr("alt").trim();
    overview["age-restriction"] = restriction;
  }

  const performances = [];
  const rowPairs = [];
  const $rows = $performance.find(".row");
  $rows.each(function (index) {
    if (index % 2 === 0)
      rowPairs.push([$rows.get(index), $rows.get(index + 1)]);
  });
  rowPairs.shift(); // throw away the title rows

  rowPairs.forEach(([dateRow, showsRow]) => {
    const readableDateString = $(dateRow).text().trim();

    $(showsRow)
      .find("a")
      .each((_, timeLink) => {
        const readableTimeString = $(timeLink).text().trim();

        const performanceDateTime = parseDateTime(
          readableDateString,
          readableTimeString
        );

        performances.push({
          time: getTime(performanceDateTime),
          bookingUrl:
            "https://eu.internet-ticketing.com/sales/STRBEL/" +
            $(timeLink).attr("href"),
        });
      });
  });

  return {
    title,
    overview,
    performances,
  };
};

(async () => {
  console.log(`Getting ticket site information ... `);
  const ticketSiteUrl = "https://eu.internet-ticketing.com/sales/STRBEL/start";
  const page = await fetch(ticketSiteUrl).then((response) => response.text());
  const shows = [];
  const $ = cheerio.load(page);

  $("#start-main-page .start-performance-box").each((_, performance) => {
    const show = createShowFrom($, $(performance));
    shows.push(show);
  });

  const dataFile = `${__dirname}/strand-ticket-data.json`;
  writeFileSync(dataFile, JSON.stringify(shows, null, 4));
  console.log(`✅ New data file created at ${dataFile}`);
})();
