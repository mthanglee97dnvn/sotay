#!/bin/bash
# Runs on the macOS build machine after `npx cap sync ios`.
# Registers the Google Sign-In URL scheme from GoogleService-Info.plist.
set -euo pipefail
GS=ios/App/App/GoogleService-Info.plist
INFO=ios/App/App/Info.plist
if [ ! -s "$GS" ]; then echo "::error::Thiếu GoogleService-Info.plist (secret GOOGLE_SERVICE_INFO_PLIST)"; exit 1; fi
REV=$(/usr/libexec/PlistBuddy -c "Print :REVERSED_CLIENT_ID" "$GS" 2>/dev/null || true)
if [ -z "$REV" ]; then
  echo "::error::GoogleService-Info.plist chưa có REVERSED_CLIENT_ID. Bật Google trong Firebase → Authentication trước, rồi tải lại file plist."
  exit 1
fi
/usr/libexec/PlistBuddy -c "Delete :CFBundleURLTypes" "$INFO" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$INFO"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$INFO"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$INFO"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $REV" "$INFO"
echo "✓ URL scheme $REV"
