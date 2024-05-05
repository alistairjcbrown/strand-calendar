# 📆 Strand Calendar

⚠️ **This code is no longer running** - there will be no new releases published.
Previously published releases will remain, but data in the last versions
published may be incorrect.

The Strand Cinema has recently updated their website layout, which has broken
the scripts in this repo from running correctly. They are also due to close for
an extended period of time for refusbishment, at the end of June 2024.

Due to this, no updates will be made to the scripts in this repository, and the
cronjob that generates releases will instead be turned off. This decision may be
revisited again in the future, but while this notice is in place consider the
repository to be abandoned.

---

Automatically generated calendar of events at
[The Strand Cinema, Belfast](https://goo.gl/maps/bfJ5vYmDiAVLakhW8)

Data retrieved from: https://www.strandartscentre.com/

The latest calendar file is available at:
https://github.com/alistairjcbrown/strand-calendar/releases/latest/download/strand-calendar.ics

## ⚙️ How to use

The URL above always points to the latest calendar data. Add it to your calendar
application of choice to see the latest events.

### Google Calendar

ℹ️ Instructions below modified from
https://support.google.com/calendar/answer/37100?co=GENIE.Platform%3DDesktop&oco=1

1. On your computer, open [Google Calendar](https://calendar.google.com/).
2. On the left, next to "Other calendars," click "Add" or "+" and then "From
   URL".
3. Paste in
   `https://github.com/alistairjcbrown/strand-calendar/releases/latest/download/strand-calendar.ics`
4. Click "Add calendar". The calendar appears on the left, under "Other
   calendars."

ℹ️ **Note:** It might take up to 12 hours for changes to show in your Google
Calendar.

## 🎟 Releases

Releases are run automatically early every morning, but may also be run manually
as part of testing or to gather the most up to date information during the day.

All releases can be seen at
https://github.com/alistairjcbrown/strand-calendar/releases, with the latest
release showing the `latest` tag.

Details of current releases:

- Releases use git tags in the format `{date}.{suffix}`.
- Releases contain 3 files
  - The calendar file, `strand-calendar.ics`
    - 💡 This is what most users will want!
    - Event data formatted in a way that can be used in your calendar
  - The data file, `strand-shows.json`
    - Contains all of the data extracted from the main website (title,
      performances information, notes, booking URL, etc.)
    - Used to generate the calendar file above
  - The ticket data file, `strand-ticket-data.json`
    - Contains all of the data extracted from the _ticket_ website (mostly just
      title and performance times)
    - Used as a data discrepancy check, to see if the main website is out of
      sync with the underlying ticket website.

⚠️ The details above are the current state - however, this may not have always
been the case, and may not always be the case going forward. Please do not rely
on this information for any historical releases!
