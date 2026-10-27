# Android app: install, sign and publish

The Android app is the same web app packaged with [Capacitor](https://capacitorjs.com). Every push to
`main` runs `.github/workflows/android.yml`, which builds it on GitHub.

## Install it on your phone (no Play Store needed)

1. Open https://github.com/AntuKumar100/gre-vocab-bangla/releases/tag/android-latest on the phone.
2. Download `shobdo-quest.apk` and open it.
3. Allow "Install unknown apps" for your browser when Android asks, then tap Install.

This test build is signed with a debug key; to publish on Google Play you need your own upload key (next step).

## One-time setup: your upload key (needed for Google Play)

On your Windows computer, with Java installed (Android Studio includes it), run in a terminal:

```
keytool -genkeypair -v -keystore shobdo-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
```

Choose a strong password and keep `shobdo-upload.jks` and the password somewhere safe (a password manager
and a backup drive). Never put this file in the repository. Then add four secrets on GitHub
(repository → Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the keystore file as base64: in PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("shobdo-upload.jks"))` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | the key password (same as the keystore password unless you chose another) |

From the next push on, the workflow also builds `shobdo-quest.aab`, the signed App Bundle Google Play wants.
Download it from the workflow run's artifacts (Actions → Android app → latest run → Artifacts).

## Publish on Google Play

1. Create a developer account at https://play.google.com/console (one-time US$25 fee, identity check).
2. Create the app: name from `store/listing.md`, default language English, App, Free.
3. Fill in Store listing and App content from `store/listing.md`, and upload the graphics from `store/graphics/`.
4. Turn on Play App Signing (default) and upload `shobdo-quest.aab` to **Testing → Closed testing**.
5. New personal accounts must run a closed test with at least 12 testers for 14 days in a row before
   production. Invite 15–20 (friends, a GRE study group) by email list or Google Group so at least 12 stay opted in.
6. After 14 days, apply for production access, then promote the release to **Production**.

Each later update: push to `main`, download the new `.aab`, upload it as a new release. The version code
increases automatically with every build.

## Build locally (optional)

Needs Node 20, JDK 21 and the Android SDK (Android Studio):

```
npm ci
npm run build
npx cap sync android
npx cap open android   # opens Android Studio; press Run
```
