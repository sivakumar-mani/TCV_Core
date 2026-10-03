# Internet subscription invoice email

The Subscription Details envelope action previews the email and PDF before the user clicks Send Email. The recipient and billing period are read from the saved customer/subscription. The attachment is the same PDF shown in the preview.

In Customer Information, save a primary email and optionally up to 20 Additional Invoice Emails separated by commas. Invoice previews and sends include all saved addresses, with case-insensitive duplicates removed. Every recipient must be accepted by SMTP before the application reports success; on partial acceptance, check delivery logs before retrying to avoid duplicate invoices. The existing schema initializer adds the nullable `additional_emails` column without changing primary emails.

Set these server environment variables (do not put credentials in frontend code or commit them):

```dotenv
INVOICE_SMTP_HOST=server.timecablevision.in
INVOICE_SMTP_PORT=587
INVOICE_EMAIL_USER=tcvadmin@timecablevision.in
INVOICE_EMAIL_PASSWORD="<MilesWeb mailbox password>"
```

Use the password created for this MilesWeb mailbox, not a Gmail app password. Put these values in backend/.env locally and in the server environment for deployment. Replace the placeholder; keep the password quoted if it contains a # character. Restart the backend after configuring them. Existing EMAIL/PASSWORD variables and the password-reset mailer are unchanged and are not used for invoice SMTP authentication.

Port 587 requires STARTTLS. Alternatively use port 465 for implicit TLS; the code selects the appropriate mode automatically. TLS certificate verification stays enabled. If the hosting provider specifies a different SMTP hostname for its certificate, update INVOICE_SMTP_HOST to that supplied hostname.

Both endpoints require the existing INTERNET_CUSTOMERS can_view permission, matching subscription editing access. The authenticated send endpoint accepts one PDF up to 4 MB; it does not accept a custom recipient or message. A changed registered email or billing period requires reopening the preview.

A success alert means the SMTP server accepted the message, not a guarantee of inbox delivery. SMTP sending may not create a copy in webmail Sent Mail; on an ambiguous connection failure, check the mail server delivery logs before retrying. No live email is sent by the automated tests.
