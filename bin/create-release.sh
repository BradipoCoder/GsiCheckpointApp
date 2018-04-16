#!/usr/bin/env bash

ANDROID_PLATFORM_DIR="./platforms/android"
APKDIR="${ANDROID_PLATFORM_DIR}/app/build/outputs/apk/release"
KEYSTORE="/home/jack/Documents/Keystore/mekit-release-key.keystore"
ZIPALIGN_BIN="${ANDROID_HOME}/build-tools/current/zipalign"

if [ ! -d "${ANDROID_PLATFORM_DIR}" ]; then
  echo "NO APK DIR! Run this script from project root!"
  exit 1
fi


if [ -f "${APKDIR}/app-release-unsigned.apk" ]; then
  echo "Deleting stale unsigned release version..."
  rm -rf "${APKDIR}/app-release-unsigned.apk"
fi

if [ -f "${APKDIR}/app-release-signed.apk" ]; then
  echo "Deleting stale signed release version..."
  rm -rf "${APKDIR}/app-release-signed.apk"
fi



echo "Creating unsigned release version..."
ionic cordova build --release android

if [ ! -f "${APKDIR}/app-release-unsigned.apk" ]; then
  echo "NO APK - BUILD FAILED!"
  exit 2
fi

echo "Signing release version..."
jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore ${KEYSTORE} -storepass mekitscs "${APKDIR}/app-release-unsigned.apk" mekit_release


echo "Creating zipaligned signed version..."
${ZIPALIGN_BIN} -v 4 "${APKDIR}/app-release-unsigned.apk" "${APKDIR}/app-release-signed.apk"

