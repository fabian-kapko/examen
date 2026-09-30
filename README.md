# Confession app

Pure HTML/CSS/JS, no build step, no dependencies.

## Run

`fetch()` can't read the CSVs over `file://`, so serve the folder:

    python3 -m http.server 8000

## Files

    index.html       the questions, with checkboxes
    confession.html  the formula, with the ticked sins listed
    prayers.html
    contact.html
    app.js           CSV parser, language packs, rendering
    style.css
    fonts/           EB Garamond woff2, self-hosted (no request to Google)
    src/             the three engravings, one per page
    og-image.png     1200x630 link preview
    robots.txt, sitemap.xml, favicon.svg

## Language packs

    lang/<code>/ui.csv               key|value, every interface string
    lang/<code>/questions.csv        id|section|gender|question
    lang/<code>/questions-quick.csv  same columns, the 30-question version
    lang/<code>/prayers.csv          id|title|text|source|source_url
    lang/<code>/contact.csv          id|type|label|value|href

`data-i18n` fills an element's text from a ui.csv key, `data-i18n-alt` fills
an image's alt from one (the `img.*` keys).

Fields are pipe-separated, so commas need no escaping. Quote a field only if
it holds a literal `|` or `"`, and double the quote to escape it:
`q01||"Lorem | ipsum?"`. The delimiter is `DELIM` in `app.js`.

In questions.csv, fill `section` to start a new titled block and leave it
blank to stay in the current one. A row with a section and no question is a
heading on its own. `gender` is `m`, `f`, or blank for both.

questions-quick.csv reuses ids from questions.csv, so a tick survives a switch
between the two. The confession page reads both and merges them by id, which
also means a quick-only id still gets named.

In contact.csv, `type` phone and email build tel:/mailto: from `href`, link
opens `href` in a new tab, anything else ignores `href`.

To add a language, copy `lang/en/`, translate the values, and add
`{ code: '<code>', label: '<name>' }` to `LANGS` in `app.js`. `lang/sk` is the
source pack; en and de are translated from it and share its row ids.

## localStorage

    confession.lang    chosen language, `?lang=de` overrides it
    confession.gender  m | f, filters the questions
    confession.depth   deep | quick, which question file the index loads
    confession.last    date of the last confession (YYYY-MM-DD)
    confession.marks   which questions are ticked

## Search engines

Every page ships a static Slovak title, description and body text, so a
crawler that doesn't run JS still finds real content. Once a pack loads,
`applyUi` rewrites the title and both descriptions from `title.<page>` and
`desc.<page>` in ui.csv. The questions need JS either way.

Canonical and hreflang point at https://spovednezrkadlo.sk. If that host ever
changes, edit the four HTML heads, robots.txt and sitemap.xml.
