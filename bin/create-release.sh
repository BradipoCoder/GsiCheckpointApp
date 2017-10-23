#!/usr/bin/env bash

APKDIR="platforms/android/build/outputs/apk"
KEYSTORE="/home/jack/Documents/Keystore/mekit-release-key.keystore"
ZIPALIGN_BIN="${ANDROID_HOME}/build-tools/current/zipalign"

if [ ! -d "${APKDIR}" ]; then
  echo "NO APK DIR! Run this script from project root!"
  exit 1
fi


if [ -f "${APKDIR}/android-release-unsigned.apk" ]; then
  echo "Deleting stale unsigned release version..."
  rm -rf "${APKDIR}/android-release-unsigned.apk"
fi

if [ -f "${APKDIR}/android-release-signed.apk" ]; then
  echo "Deleting stale signed release version..."
  rm -rf "${APKDIR}/android-release-signed.apk"
fi



echo "Creating unsigned release version..."
ionic cordova build --release android

if [ ! -f "${APKDIR}/android-release-unsigned.apk" ]; then
  echo "NO APK - BUILD FAILED!"
  exit 2
fi

echo "Signing release version..."
jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore ${KEYSTORE} -storepass mekitscs "${APKDIR}/android-release-unsigned.apk" mekit_release


echo "Creating zipaligned signed version..."
${ZIPALIGN_BIN} -v 4 "${APKDIR}/android-release-unsigned.apk" "${APKDIR}/android-release-signed.apk"

