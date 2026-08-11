# Privacy Policy for RadarRank

**Effective date:** August 11, 2026
**Contact:** andrewswimmer111@gmail.com

RadarRank ("the app") is a personal iOS app that helps you build custom
rubrics, rate people or things against those rubrics, and optionally
share an evaluation with others for group voting. This policy describes
what data the app handles and where it goes.

## Summary

- The app has no accounts, no ads, no analytics SDKs, and no tracking.
- Everything you enter stays on your device by default.
- Data only leaves your device if **you** explicitly share an evaluation
  for group voting. In that case, the evaluation snapshot is uploaded to
  our hosted database so voters can access it via a link.
- We do not sell your data. We do not use it for advertising.

## Data stored on your device

The app stores the following data locally on your iPhone using the
system's on-device database (SQLite):

- Collections you create (names of people or items)
- Templates you create (rubric categories and hints)
- Evaluations, votes, and comments you enter
- App preferences and a random install identifier (see below)

This data never leaves your device unless you explicitly use the
"Share" feature described in the next section.

## Data uploaded when you share an evaluation

When you tap **Share** on an evaluation, the app uploads a snapshot of
that evaluation to our hosted backend (Supabase) so that others can vote
via a web link. The following fields are sent:

- The evaluation title
- Participant names, colors, and display order
- Rubric category labels and hints
- A randomly generated install identifier (a UUID with no link to your
  Apple ID, email, phone number, or device serial) used only to
  associate cloud rows with the device that created them
- Two random access tokens embedded in the share link, so only people
  with the link can view or vote
- Votes and voter names submitted by other people through the share
  link

You can stop this at any time by unsharing or deleting the evaluation,
which permanently removes the associated data from our backend.

## Data collected from voters

If someone opens a share link and votes, the following is stored on our
backend against that share:

- The name they choose to enter as their voter identity
- Their scores for each participant on each rubric category

We do not collect the voter's IP address, device identifier, email, or
any account information.

## Third parties

- **Supabase** — Hosts the backend database used for the share feature.
  Supabase's privacy policy is available at
  <https://supabase.com/privacy>. Only data described above is stored
  there.

No other third parties receive your data. The app does not integrate
analytics providers, crash reporting SDKs, advertising networks, or
social login providers.

## Photos permission

If you use the "save card to Photos" feature, the app writes the
generated image to your device's Photos library using Apple's system
API. The photo is not uploaded anywhere by the app.

## Children

RadarRank is not directed at children under 13, and we do not knowingly
collect data from children under 13.

## Data retention and deletion

- Local data lives on your device until you delete an entry or uninstall
  the app.
- Shared evaluations live on our backend until you unshare or delete
  them, at which point they are permanently removed.
- To request deletion of any data associated with a share you created,
  email <andrewswimmer111@gmail.com> with the share URL.

## Your rights

You can:

- Delete any local data from within the app.
- Unshare or delete any shared evaluation to remove it from our
  backend.
- Contact us at the email above to request deletion of any data you
  believe is associated with you.

## Changes

If we change this policy, we will update the "Effective date" above and
publish the updated policy at the same URL where you found this one.
