# Confession app

Pure HTML/CSS/JS. No build step, no dependencies.

The data files are pipe-separated (`|`), so commas in the text need no escaping.

## Run

`fetch()` cannot read CSV from `file://`, so serve the folder:

    python3 -m http.server 8000

then open http://localhost:8000/

## Files

    index.html      question list (checkboxes, state kept in localStorage)
    confession.html the confession formula with the ticked sins listed
    prayers.html    prayer texts
    contact.html    contact details (tel: / mailto: links)
    style.css       black & white, responsive
    robots.txt      crawling rules, points at the sitemap
    sitemap.xml     the four pages with their hreflang alternates
    og-image.png    1200x630 link preview image
    favicon.svg
    app.js          CSV parser, language pack loader, rendering
    lang/<code>/ui.csv         key|value        - all interface strings
    lang/<code>/questions.csv  id|section|gender|question
                              `section`: fill it to start a new titled block,
                              leave it blank to continue the current one.
                              A row with a section and an empty question
                              is a standalone heading. A section whose
                              questions are all hidden is not shown.
                              `gender`: m = men only, f = women only,
                              blank = shown to both.
    lang/<code>/prayers.csv    id|title|text|source|source_url
                              `source` is shown under the prayer, linked
                              to `source_url` when one is given.
    lang/<code>/contact.csv    id|type|label|value|href
                              `type`: phone and email build tel:/mailto:
                              from `href`, link opens `href` in a new tab,
                              text ignores `href` entirely.

## Search engines

Each page ships a static Slovak title, meta description and body text so a
crawler that does not run JavaScript still reads real content; `applyUi`
rewrites the title and both descriptions once a language pack loads. Canonical
and hreflang point at https://spovednezrkadlo.sk - change that host in the four
HTML heads, `robots.txt` and `sitemap.xml` if it ever moves. Titles come from
`title.<page>` and descriptions from `desc.<page>` in `ui.csv`.

The 125 questions themselves are still injected by JavaScript, so only
renderers that execute it (Google) index them.

## Add a language

1. Copy `lang/en/` to `lang/<code>/` and translate the CSV values.
2. Add `{ code: '<code>', label: '<name>' }` to `LANGS` at the top of `app.js`.

## Remembered per reader (localStorage)

    confession.lang     chosen language; `?lang=de` overrides it
    confession.gender   m | f - filters the question list
    confession.last     date of the last confession (YYYY-MM-DD)
    confession.marks    which questions are ticked

The picker offers exactly two options. Until one is chosen it shows the
`gender.choose` placeholder and no question is filtered out; the
placeholder disappears once a choice is made and is never offered again.
The date field feeds `last.since` (`{date}` and `{n}` = days elapsed)
and `last.none` when unset.

Commas can be typed freely. Only a field containing a literal `|` or `"`
needs double quotes: `q01||"Lorem | ipsum?"` (double a quote to escape it).
The delimiter is `DELIM` at the top of `app.js`.

The confession page reads `questions.csv` and lists the rows whose id is in
`confession.marks`, in file order; the formula around them is the
`confession.opening` / `confession.closing` pair in `ui.csv`.

`lang/sk` is the source pack; `lang/en` and `lang/de` are translated from it
and share the same row ids.
