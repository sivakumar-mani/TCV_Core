# Time Cable Vision - template website

Local static website adapted from the downloaded Clinic BootstrapMade template. Retains the template Bootstrap foundation and Bootstrap Icons, with a custom TCV layout, four dedicated service pages, FAQs and a WhatsApp enquiry composer.

Open `index.html`, or run `python -m http.server 5501 --directory tcv-website` from the repository root and visit http://localhost:5501/.

No npm installation, build or database is needed. The two homepage enquiry forms POST to `send-enquiry.php`, which emails `tcvadmin@timecablevision.in`. Deploy on PHP 8.1+ (the VPS uses PHP 8.3) with PHP mail() enabled and a working local sendmail/Postfix transport. A static Python preview cannot send mail. The endpoint validates inputs, uses a fixed recipient/sender, and throttles repeated submissions in the same session. It does not store enquiries in a database. An accepted mail handoff does not verify inbox delivery: check the VPS mail logs, mailbox and spam folder after a live submission. Existing customer portal links point to https://timecablevision.in/tcverp/.

Contacts: 99625 43540, 98845 43540, timecablevision@gmail.com, tcvadmin@timecablevision.in. Confirmed details reused from the existing repository. No invented address, opening hours, coverage, prices or testimonials are published. The home illustration is illustrative, not a photograph of a completed installation. Brand artwork and illustration are reused from `../website/assets/images/`.

Deploy the contents of this folder to the chosen static website location. Keep the existing `/tcverp/` portal and `/api/` configuration intact. Configure the web server to use `404.html` for missing pages. This task does not deploy or change the live site.

Template attribution is retained in `Readme.txt` and the visible footer. Unused medical demo pages, clinic images, PHP forms, SCSS and unreferenced vendor libraries were removed. The original `../tcv-website.zip` archive is retained.

For enquiry email changes, upload `index.html`, `assets/js/main.js` and `send-enquiry.php` together. Configure the existing VPS mail transport if the form reports that mail is unavailable. No SMTP credentials are placed in the website files.
