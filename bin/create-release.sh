#!/usr/bin/env bash

ANDROID_PLATFORM_DIR="./platforms/android"
APKDIR="${ANDROID_PLATFORM_DIR}/app/build/outputs/apk/release"
APK_VERSION_FILE="bin/version.txt"
KEYSTORE="/home/jack/Documents/Keystore/mekit-release-key.keystore"
ZIPALIGN_BIN="${ANDROID_HOME}/build-tools/current/zipalign"



if [ ! -d "${ANDROID_PLATFORM_DIR}" ]; then
  echo "NO APK DIR! Run this script from project root!"
  exit 1
fi

if [ ! -f "${APK_VERSION_FILE}" ]; then
  echo "NO VERSION FILE(${APK_VERSION_FILE})!"
  exit 2
fi

#increase version numbering
perl -i -pe 's/^\d+\.\d+\.\K(\d+)$/ $1+1 /e' "${APK_VERSION_FILE}"
APKVERSION=`cat "${APK_VERSION_FILE}"`
echo "PREPARING VERSION: ${APKVERSION}"

UNSIGNED_APK_FILE_NAME="app-release-unsigned.apk"
SIGNED_APK_FILE_NAME="app-release-signed-v${APKVERSION}.apk"


if [ -f "${APKDIR}/${UNSIGNED_APK_FILE_NAME}" ]; then
  echo "Deleting stale unsigned release version(${UNSIGNED_APK_FILE_NAME})..."
  rm -f "${APKDIR}/${UNSIGNED_APK_FILE_NAME}"
fi

if [ -f "${APKDIR}/${SIGNED_APK_FILE_NAME}" ]; then
  echo "Deleting stale signed release version(${SIGNED_APK_FILE_NAME})..."
  rm -f "${APKDIR}/${SIGNED_APK_FILE_NAME}"
fi

# increment version in package.json - "version": "0.2.1",
perl -i -pe 's/"version": "\K(\d+\.\d+\.\d+)/ "'${APKVERSION}'" /e' package.json

# increment version in config.xml - version="0.2.1"
perl -i -pe 's/version="\K(\d+\.\d+\.\d+)/ "'${APKVERSION}'" /e' config.xml


echo "Creating unsigned release version..."
#ionic cordova build --release android
#ionic cordova build --aot --minifyjs --minifycss --optimizejs --release android
#ionic cordova build --minifycss --minifyjs --optimizejs --release --device android
ionic cordova build --release --prod android


if [ ! -f "${APKDIR}/${UNSIGNED_APK_FILE_NAME}" ]; then
  echo "NO APK FILE(${UNSIGNED_APK_FILE_NAME}) - BUILD FAILED!"
  exit 2
fi

echo "Signing release version..."
jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore ${KEYSTORE} -storepass mekitscs "${APKDIR}/${UNSIGNED_APK_FILE_NAME}" mekit_release

echo "Creating zipaligned signed version..."
${ZIPALIGN_BIN} -v 4 "${APKDIR}/${UNSIGNED_APK_FILE_NAME}" "${APKDIR}/${SIGNED_APK_FILE_NAME}"


echo "Deleting unsigned release version(${UNSIGNED_APK_FILE_NAME})..."
rm -f "${APKDIR}/${UNSIGNED_APK_FILE_NAME}"
