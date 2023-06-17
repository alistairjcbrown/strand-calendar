const { writeFileSync } = require("fs");
const cheerio = require("cheerio");
const parseDuration = require("parse-duration");
const { parse, format, getTime } = require("date-fns");
const en = require("date-fns/locale/en-GB");
const ics = require("ics");

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const fail = (url, page) => {
  console.log(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );
  console.log(
    "!! Unexpected page format detected during calendar generation !!"
  );
  console.log(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );
  console.log("");
  console.log(
    "Please review the details below as the page format may have changed"
  );
  console.log("");
  console.log(`Requesting: ${url}`);
  console.log("Page contents:");
  console.log(page);
  process.exit(1);
};

const parseDateTime = (date, time) =>
  parse(`${date} ${time}`, "EEE do MMMM HH:mm", new Date(), { locale: en });

const getEventDate = (time) =>
  format(time, "yyyy-M-d-H-m", { locale: en })
    .split("-")
    .map((value) => parseInt(value, 10));

const slugify = (value) =>
  value.trim().toLowerCase().replace(":", "").replace(/\s+/g, "-");

const formatOverviewItem = (key, value) => {
  if (value.split(",").length > 1) {
    return value.split(",").map((item) => item.trim());
  }
  if (key === "duration") return parseDuration(value);
  if (key === "actors" || key === "category") return [value.trim()];
  return value.trim();
};

const createShowFrom = (url, page) => {
  const $ = cheerio.load(page);
  const title = $(".entry .page_title").text();
  if (!title) fail(url, page);

  const overview = {};
  $(".entry .overview-container .event_list_item").each((i, item) => {
    const key = slugify($(item).find(".title").text());
    const value = formatOverviewItem(key, $(item).find(".info").text());
    overview[key] = value;
  });

  const performances = [];
  $(".entry .performancebatch").each((_, dateRow) => {
    const readableDateString = $(dateRow).find(".show_date").text();

    $(dateRow)
      .find(".show-time .date_time > a")
      .each((_, timeLink) => {
        const readableTimeString = $(timeLink).text().trim();

        const performanceDateTime = parseDateTime(
          readableDateString,
          readableTimeString
        );

        const performanceDetails = $(timeLink)
          .attr("title")
          .replace("Strand Arts Centre - Screen", "")
          .trim();

        performances.push({
          time: getTime(performanceDateTime),
          screen: performanceDetails.split(":")[0].trim(),
          notes: (performanceDetails.split(":")[1] || "").trim(),
          bookingUrl: $(timeLink).attr("href"),
        });
      });
  });

  return {
    title,
    url,
    overview,
    performances,
  };
};

const generateEventDescription = (show, performance) => {
  let description = "";
  if (performance.screen)
    description += `Showing in screen ${performance.screen}\n`;
  if (show.overview["age-restriction"])
    description += `Film classification: ${show.overview["age-restriction"]}\n`;
  if (show.overview.actors)
    description += `Starring ${show.overview.actors.join(", ")}\n`;
  if (show.url) description += `For more details, see ${show.url}\n`;
  if (performance.bookingUrl)
    description += `Book tickets at ${performance.bookingUrl}\n`;
  if (performance.notes) description += `\nNotes:\n${performance.notes}\n`;
  return description.trim();
};

(async () => {
  // Get a list of URLs for all the shows
  const includedCategories = ["Live Events", "Movies"];
  console.log(
    `Finding shows in categories ${includedCategories.join(", ")} ... `
  );
  const getCategoryUrl = (category) =>
    `https://www.strandartscentre.com/event_categories/${slugify(category)}/`;

  const categoryUrls = includedCategories.map(getCategoryUrl);
  const categoryPages = await Promise.all(
    categoryUrls.map((url) => fetch(url).then((response) => response.text()))
  );

  const uniqueShowUrls = new Set();
  categoryPages.forEach((page) => {
    const $ = cheerio.load(page);
    $("li.event_list .movie_title a").each((_, link) => {
      uniqueShowUrls.add($(link).attr("href"));
    });
  });

  await sleep(2000);

  // Go to each of the show pages and get the times they're on at
  console.log(`Getting data for ${uniqueShowUrls.size} shows ...`);
  const showUrls = Array.from(uniqueShowUrls);
  const requestsPerBatch = 1;
  const delayPerBatch = 3000;
  const batchCount = Math.ceil(showUrls.length / requestsPerBatch);
  const shows = [];

  for (let i = 0; i < batchCount; i++) {
    console.log(` > Requesting batch ${i + 1} of ${batchCount}`);
    const urls = showUrls.slice(
      i * requestsPerBatch,
      (i + 1) * requestsPerBatch
    );

    await Promise.all(
      urls.map(async (url) => {
        let response = await fetch(url);
        // If we get a "Too Many Requests" response, wait before trying again
        if (response.status === 429) {
          console.log(
            "    - ⚠️ 'Too Many Requests' response, waiting before trying again"
          );
          await sleep(60000);
          response = await fetch(url);
        }
        const page = await response.text();
        const show = createShowFrom(url, page);
        shows.push(show);
      })
    );

    await sleep(delayPerBatch);
  }
  const dataFile = `${__dirname}/strand-shows.json`;
  writeFileSync(dataFile, JSON.stringify(shows, null, 4));
  console.log(`✅ New data file created at ${dataFile}`);

  console.log(`Generating event data ...`);
  // Create an event for each show performance
  const icsFormattedEvents = shows.reduce((events, show) => {
    // Default to 60 minutes if we don't know the duration
    const duration = show.overview.duration || 60 * 60 * 1000;
    const showEvents = show.performances.map((performance) => ({
      title: show.title,
      description: generateEventDescription(show, performance),
      categories: [].concat(show.overview.category),
      start: getEventDate(performance.time),
      end: getEventDate(performance.time + duration),
      url: "https://www.strandartscentre.com/",
      location: "The Strand Cinema, 152-154 Holywood Rd, Belfast BT4 1NY, UK",
      geo: { lat: 54.60058832995138, lon: -5.87979518243924 },
    }));
    return events.concat(showEvents);
  }, []);

  // Write out ICS file of events
  const { error, value } = ics.createEvents(icsFormattedEvents);
  if (error) {
    console.log("Error generating ics:", error);
    process.exit(1);
  }

  const calendarFile = `${__dirname}/strand-calendar.ics`;
  writeFileSync(calendarFile, value);
  console.log(`✅ New calendar file created at ${calendarFile}`);
})();
