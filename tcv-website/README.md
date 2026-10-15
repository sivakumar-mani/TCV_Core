# Time Cable Vision - template website

Local static website adapted from the downloaded Clinic BootstrapMade template. Retains the template Bootstrap foundation and Bootstrap Icons, with a custom TCV layout, four dedicated service pages, FAQs and a WhatsApp enquiry composer.

Open `index.html`, or run `python -m http.server 5501 --directory tcv-website` from the repository root and visit http://localhost:5501/.

No npm installation, build, database or backend is needed. The enquiry form prepares a WhatsApp message; the visitor must open WhatsApp and send it. It does not save or automatically transmit form entries. Existing customer portal links point to https://timecablevision.in/tcverp/.

Contacts: 99625 43540, 98845 43540, timecablevision@gmail.com, tcvadmin@timecablevision.in. Confirmed details reused from the existing repository. No invented address, opening hours, coverage, prices or testimonials are published. The home illustration is illustrative, not a photograph of a completed installation. Brand artwork and illustration are reused from `../website/assets/images/`.

Deploy the contents of this folder to the chosen static website location. Keep the existing `/tcverp/` portal and `/api/` configuration intact. Configure the web server to use `404.html` for missing pages. This task does not deploy or change the live site.

Template attribution is retained in `Readme.txt` and the visible footer. Unused medical demo pages, clinic images, PHP forms, SCSS and unreferenced vendor libraries were removed. The original `../tcv-website.zip` archive is retained.
