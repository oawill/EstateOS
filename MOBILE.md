# NidraQ mobile apps (Android and iOS)

The native apps are a thin [Capacitor](https://capacitorjs.com) shell around the
live web app at `https://nidraq.com/login`. There is one codebase: every web
release reaches phones immediately, with no store update. The app opens on the
login page and each person lands in their own app (Resident, Security, Owner)
after signing in.

- App id: `com.nidraq.app`, name: `NidraQ`
- Config: `capacitor.config.ts` (point a build at staging with `CAP_SERVER_URL`)
- Projects: `android/` and `ios/` (committed; build output is git-ignored)
- `capacitor-shell/index.html` is only an offline fallback page

After changing `capacitor.config.ts`, icons or adding a plugin, run `pnpm cap:sync`.

## Android (Google Play)

Needs a $25 one-time Google Play developer account, plus Android Studio (which
bundles the JDK and Android SDK).

1. `pnpm cap:android` opens the project in Android Studio.
2. Build > Generate Signed Bundle / APK > Android App Bundle, create a keystore
   (back it up; losing it means you can never update the app), and build `release`.
3. Upload the `.aab` in Play Console, fill in the store listing, privacy policy and
   data-safety form, then submit for review.

## iOS (App Store)

Needs a Mac with Xcode and an Apple Developer account ($99 a year).

1. On the Mac: `pnpm install`, then `pnpm cap:ios` opens Xcode.
2. Set your Team and keep the bundle id `com.nidraq.app`.
3. Product > Archive, then Distribute App > App Store Connect.
4. Complete the listing and privacy details in App Store Connect and submit.

Apple can reject apps that are only a website. Before submitting, add real native
features (push notifications and camera are the usual ones) and make sure the app
works well on its own. A reviewer demo login is also required.

## Not done yet

- No native plugins are installed, so there is no push notification or camera
  access from the app yet.
- Nothing has been built or run on a device or emulator.
- Store listings, screenshots, privacy policy URL and a better-resolution icon
  (the current logo file is only 300 px) still need preparing.
