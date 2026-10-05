# Backlog

Things to do later, roughly in order of importance.

- **Lengthen the App Check token lifetime.** Firebase → App Check → Apps → web app → reCAPTCHA Enterprise → *Token time to live*: raise it from 1 hour to 7 days. On the free plan reCAPTCHA allows 10,000 checks a month; after that checks fail until the 1st of the next month, and with App Check enforced that would lock everyone out of their data. A 7-day lifetime means roughly one check per device per week.
