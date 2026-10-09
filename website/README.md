# Time Cable Vision public website

Independent, fully static HTML/CSS/JavaScript website for **CATV, internet, CCTV and solar**. This top-level `website/` directory sits alongside `frontend/`, `backend/` and `mobile-tracker/`. None of those modules is changed or required to run the public website.

## Open locally

Double-click `index.html`, or open it in a browser. Relative links, local images and package filters also work through `file://`; there is no runtime fetch, npm install, build step, database, Angular or API dependency.

For an HTTP preview from the repository root:

```powershell
python -m http.server 5500 --directory website
```

Visit `http://localhost:5500/`. Stop this preview with Ctrl+C.

## Pages and files

- `index.html`: Home, four service areas, selected TV packages and enquiry links.
- `about.html`: About Time Cable Vision and its four service areas.
- `packages.html`: 18 package line-ups, language/quality filters, channel search, expandable lists, 22 unique HD channel-number rows and original source downloads.
- `contact.html`: both phone/WhatsApp numbers, both emails, enquiry message preparation and FAQs.
- `assets/css/style.css`: responsive styling, hover/reveal/floating animations, reduced-motion and print rules.
- `assets/js/site.js`: accessible mobile navigation, scroll reveals and enquiry message preparation.
- `assets/js/packages-data.js`: package data loaded through a normal static script; `packages.json` is an editable data reference.
- `assets/js/packages.js`: search, filtering, reset, match highlighting and direct package links.
- `assets/documents/`: copies of the supplied PDF and package/channel-number images.
- `assets/images/connected-home.png`: generated illustrative hero image used locally on the site.
- `tools/build_site.py`: optional source generator. Regeneration requires Python + PyMuPDF; serving the generated HTML does not.

## Confirmed contact details

- Phone / WhatsApp: **9962543540**, **9884543540**.
- Email: **timecablevision@gmail.com**, **tcvadmin@timecablevision.in**.

No office address, opening hours or geographic coverage list was supplied, so none is invented. Internet speed/price promises, solar savings/subsidy claims, CCTV specifications, testimonials and company history statistics are also not invented. Visitors can enquire for actual service availability and quotations.

## Package source interpretation

The supplied `15-pack.pdf` contains **16 distinct packages across 12 pages**; some pages contain two packages. The other image adds **Super Star Pack** and **DM Ultra Saver HD**, for 18 total.

**PDF prices are explicitly labelled LCO rates including tax**, not confirmed retail customer prices. This distinction is visible on the site. The special-pack image prints ₹85 + tax with a ₹100 total, and ₹99.99 + tax with a ₹118 total. These are preserved as printed; no tax rate, monthly billing cycle, installation fee or final customer subscription price is inferred.

Channel lists are transcribed from the documents, using table boundaries for multi-pack PDF pages. Duplicate channel names within a pack are displayed once; source spelling variations may remain distinct. Package count labels describe listed names, not guaranteed unique broadcast feeds. PDF line-ups mention 200+ FTA channels; this is shown as a source note rather than a separately invented channel list. The channel-number image repeats SONY BBC EARTH HD; the website lists that number once and retains the printed `TCL HD` and `NAVBARATH` spellings with a note.

Download links provide the original source copies for customer/reviewer comparison. Before publishing, the business should confirm that the supplied line-ups remain current and decide whether to replace LCO reference rates with approved public retail prices.

## Static enquiry behavior

The form validates required name, phone, service, message and consent. It prepares a WhatsApp URL or an email draft. The visitor must review and send the message in that application. The website does **not** claim an enquiry was submitted, send messages automatically, store personal details, invoke an ERP endpoint or introduce tracking cookies/analytics. Without JavaScript, normal phone, email and WhatsApp links still work.

Package enquiry buttons prefill the service and selected pack on the contact page. The primary WhatsApp draft uses 9962543540; direct chat links are provided for both numbers.

## Publish at timecablevision.in

This change prepares files; **no live upload, server configuration or DNS change was performed**.

`deployment/time-cable-vision-static.zip` contains only the public HTML files, assets, `robots.txt` and `sitemap.xml`. Extract its contents directly into the intended public document root; it does not contain an extra `website/` nesting level, development tools or browser profiles.

On a MilesWeb/cPanel/static hosting setup, upload these four HTML files and the entire `assets/` folder to the domain's public document root, normally `public_html/` or the explicitly configured root for `timecablevision.in`:

```text
public_html/
  index.html
  about.html
  packages.html
  contact.html
  assets/
```

Keep existing application directories and server mappings intact. In particular, preserve any `/tcverp/`, `/api/`, `/uploads/`, API subdomain and TLS configuration. If the ERP currently occupies the domain root, inspect the current host configuration and plan the root change first; blindly replacing `index.html` would replace its entry point. For an ERP already hosted under `/tcverp/`, place the public site at the root and retain the separate ERP location and its assets.

For Nginx, `deployment/nginx-static-location.conf` is a **location-only example** to merge into the existing HTTPS virtual host after inspecting it. It is not a replacement server configuration. Back up the live config, preserve API/ERP locations, run `nginx -t`, and reload only after that check passes. Do not copy the entire repository, `backend/.env`, generated previews or browser profiles into a public web root.

The website uses real `.html` paths. No SPA fallback or rewrites are needed. Its canonical and social-image URLs assume the domain root `https://timecablevision.in/`. Use HTTPS and confirm all four pages, source downloads and contact links after upload.

## Regenerate or edit

Edit the committed HTML, CSS and JS directly for a simple change. For repeatable page generation, edit `tools/build_site.py` and run:

```powershell
python website/tools/build_site.py
```

This regenerates all four HTML files plus `packages.json` and `packages-data.js`. Direct edits to generated HTML/data are overwritten on regeneration. The generator leaves CSS, interaction scripts, images and original documents intact.

## Supplied TCV logo and website colours

The supplied logo is used unchanged in page headers, footers and the browser icon: ssets/images/tcv-supplied-logo.png. The website theme uses sky blue `#0C5FBA`, charcoal and cool off-white backgrounds, following the supplied blue reference. The original logo retains its supplied colours. randing/preview.html shows the active logo and palette. Earlier refined assets remain available but are not used by the website. Layouts, package data and contact interactions are preserved.

## Hero image provenance

Created with the built-in image generation tool. Final asset: `assets/images/connected-home.png`. It is an illustrative image, not a photograph of an actual customer property or completed TCV installation.

Prompt: “Wide premium architectural editorial photograph of a modest modern South Indian home at blue hour with rooftop solar panels, a discreet CCTV camera, and a family enjoying television through a warmly lit living-room window; a subtle wireless router; cream plaster, natural stone and green plants; navy sky and warm sunset lighting. No text, logos, watermarks or company signage.”

## Verification

The focused checks cover local file/anchor references, all 18 package records and source prices, JavaScript syntax, Chrome desktop/mobile layout, package search/filter/reset/empty states, mobile menu, enquiry field validation and package prefill. Existing ERP/backend files are outside the diff. No regression test or application build is needed for this standalone buildless folder. Browser previews and temporary QA files live under ignored `.preview/` and are excluded from deployment.
