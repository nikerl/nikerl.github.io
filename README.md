# erlandsson.dev

Static portfolio site. `projects.json` is the single source of truth for projects;
`node build.js` (no dependencies) renders the index and one page per project into `dist/`.
Pushing to `main` builds and deploys via GitHub Actions
(repo Settings → Pages → Source: **GitHub Actions**).

## Layout

- `projects.json` – list of projects
- `projects/<slug>/` – one folder per project: its images and `content.html` (page body fragment, trusted HTML inserted as-is)
- `templates/index.html`, `templates/project.html` – page templates; `templates/project_card.html` is the markup of one project entry in the index list (placeholders: `{{HREF}}`, `{{LOGO}}`, `{{TITLE}}`, `{{DESCRIPTION}}`, `{{LINK_ATTRS}}`)
- `static/` – copied into the site root as-is: `styles.css`, `router.js`, `network-bg.js` and `assets/` (shared logos, icons, profile picture), so `static/assets/x.png` is served at `/assets/x.png`
- `CNAME` – copied to the site root
- `dist/` – build output (git-ignored)

## `projects.json` fields

The file is an array of projects. The index lists them sorted by `date_added`, newest first.

| Field         | Required | Notes |
|---------------|----------|-------|
| `slug`        | yes      | Letters, digits, `_` and `-`. Unique. The project folder must be named exactly like it, and the page is served at `/projects/<slug>/`. |
| `title`       | yes      | Shown on the index and in the page title. HTML-escaped by the build. |
| `description` | yes      | One line for the index and link previews. HTML-escaped by the build. |
| `date_added`  | yes      | `YYYY-MM-DD`. Decides the order on the index. |
| `logo`        | yes      | Site path starting with `/`, e.g. `/projects/<slug>/logo.png`. The file must exist. |
| `link`        | no       | `http(s)` URL. Marks an external project: the index links straight to it and no page is generated, so `content.html` is not needed. |

## Adding a project

Quick start: `node new-project.js <slug>` creates `projects/<slug>/content.html` and a placeholder entry in `projects.json`. Then fill them in and add a logo. The manual steps are:

1. Create `projects/<slug>/` and put the images there.
2. Add an entry to `projects.json` (the index is sorted by `date_added`, newest first):

   ```json
   {
       "slug": "my_project",
       "title": "My Project",
       "description": "One line shown on the index and in link previews",
       "date_added": "YYYY-MM-DD",
       "logo": "/projects/my_project/logo.png"
   }
   ```

   The folder `projects/<slug>/` must be named exactly like the slug, and the page body must be `projects/<slug>/content.html`.
   For a project that lives elsewhere, add `"link": "https://..."` and skip `content.html`.
3. Create `projects/my_project/content.html` with the page body (start from another project's). Reference images as `/projects/my_project/<file>`.
4. Push to `main`. The page appears at `/projects/my_project/`.

Title and description are HTML-escaped by the build; content fragments are not.

## Build errors

`node build.js` stops with a message naming the problem entry if:

- `projects.json` is not valid JSON or not an array
- a required field is missing or empty, or `date_added` is not a valid `YYYY-MM-DD` date
- a slug has invalid characters or is used twice
- the folder `projects/<slug>/` does not exist
- `projects/<slug>/content.html` is missing (and the project has no `link`)
- the `logo` file does not exist, or does not start with `/`
- `link` is not an `http(s)` URL
- an entry still has the removed `content` field
- `static/` is missing, or a template uses an unknown `{{PLACEHOLDER}}`

## Local preview

Requires Node 22 or newer (the build has no other dependencies) and Python for a simple local server.

```
node build.js
python -m http.server -d dist
```

then open http://localhost:8000. On Windows use `python`; `python3` may not exist. Rebuild after changing `projects.json`, `projects/`, `static/` or `templates/`.
