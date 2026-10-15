<script setup lang="ts">
import { computed } from 'vue'
import arrowLeftSvg from '@fortawesome/fontawesome-free/svgs/solid/arrow-left.svg?raw'
import plusSvg from '@fortawesome/fontawesome-free/svgs/solid/plus.svg?raw'
import eyeSvg from '@fortawesome/fontawesome-free/svgs/solid/eye.svg?raw'
import eyeSlashSvg from '@fortawesome/fontawesome-free/svgs/solid/eye-slash.svg?raw'
import gripVerticalSvg from '@fortawesome/fontawesome-free/svgs/solid/grip-vertical.svg?raw'
import trashCanSvg from '@fortawesome/fontawesome-free/svgs/solid/trash-can.svg?raw'
import copySvg from '@fortawesome/fontawesome-free/svgs/solid/copy.svg?raw'
import rotateLeftSvg from '@fortawesome/fontawesome-free/svgs/solid/rotate-left.svg?raw'
import rotateRightSvg from '@fortawesome/fontawesome-free/svgs/solid/rotate-right.svg?raw'
import mobileScreenSvg from '@fortawesome/fontawesome-free/svgs/solid/mobile-screen.svg?raw'
import desktopSvg from '@fortawesome/fontawesome-free/svgs/solid/desktop.svg?raw'
import playSvg from '@fortawesome/fontawesome-free/svgs/solid/play.svg?raw'
import xmarkSvg from '@fortawesome/fontawesome-free/svgs/solid/xmark.svg?raw'
import checkSvg from '@fortawesome/fontawesome-free/svgs/solid/check.svg?raw'
import chevronDownSvg from '@fortawesome/fontawesome-free/svgs/solid/chevron-down.svg?raw'
import chevronRightSvg from '@fortawesome/fontawesome-free/svgs/solid/chevron-right.svg?raw'
import chevronUpSvg from '@fortawesome/fontawesome-free/svgs/solid/chevron-up.svg?raw'
import chevronLeftSvg from '@fortawesome/fontawesome-free/svgs/solid/chevron-left.svg?raw'
import paletteSvg from '@fortawesome/fontawesome-free/svgs/solid/palette.svg?raw'
import slidersSvg from '@fortawesome/fontawesome-free/svgs/solid/sliders.svg?raw'
import imageSvg from '@fortawesome/fontawesome-free/svgs/solid/image.svg?raw'
import uploadSvg from '@fortawesome/fontawesome-free/svgs/solid/upload.svg?raw'
import downloadSvg from '@fortawesome/fontawesome-free/svgs/solid/download.svg?raw'
import clockRotateLeftSvg from '@fortawesome/fontawesome-free/svgs/solid/clock-rotate-left.svg?raw'
import arrowUpSvg from '@fortawesome/fontawesome-free/svgs/solid/arrow-up.svg?raw'
import arrowDownSvg from '@fortawesome/fontawesome-free/svgs/solid/arrow-down.svg?raw'
import magnifyingGlassSvg from '@fortawesome/fontawesome-free/svgs/solid/magnifying-glass.svg?raw'
import fontSvg from '@fortawesome/fontawesome-free/svgs/solid/font.svg?raw'
import wandMagicSparklesSvg from '@fortawesome/fontawesome-free/svgs/solid/wand-magic-sparkles.svg?raw'
import eyeDropperSvg from '@fortawesome/fontawesome-free/svgs/solid/eye-dropper.svg?raw'
import triangleExclamationSvg from '@fortawesome/fontawesome-free/svgs/solid/triangle-exclamation.svg?raw'
import circleInfoSvg from '@fortawesome/fontawesome-free/svgs/solid/circle-info.svg?raw'
import lockSvg from '@fortawesome/fontawesome-free/svgs/solid/lock.svg?raw'
import keySvg from '@fortawesome/fontawesome-free/svgs/solid/key.svg?raw'
import linkSvg from '@fortawesome/fontawesome-free/svgs/solid/link.svg?raw'
import arrowUpRightFromSquareSvg from '@fortawesome/fontawesome-free/svgs/solid/arrow-up-right-from-square.svg?raw'
import ellipsisSvg from '@fortawesome/fontawesome-free/svgs/solid/ellipsis.svg?raw'
import volumeXmarkSvg from '@fortawesome/fontawesome-free/svgs/solid/volume-xmark.svg?raw'
import volumeHighSvg from '@fortawesome/fontawesome-free/svgs/solid/volume-high.svg?raw'
import handPointerSvg from '@fortawesome/fontawesome-free/svgs/solid/hand-pointer.svg?raw'
import layerGroupSvg from '@fortawesome/fontawesome-free/svgs/solid/layer-group.svg?raw'
import rotateSvg from '@fortawesome/fontawesome-free/svgs/solid/rotate.svg?raw'
import spinnerSvg from '@fortawesome/fontawesome-free/svgs/solid/spinner.svg?raw'
import cloudSvg from '@fortawesome/fontawesome-free/svgs/solid/cloud.svg?raw'
import circleCheckSvg from '@fortawesome/fontawesome-free/svgs/solid/circle-check.svg?raw'
import wifiSvg from '@fortawesome/fontawesome-free/svgs/solid/wifi.svg?raw'
import starSvg from '@fortawesome/fontawesome-free/svgs/solid/star.svg?raw'
import envelopeSvg from '@fortawesome/fontawesome-free/svgs/solid/envelope.svg?raw'
import doveSvg from '@fortawesome/fontawesome-free/svgs/solid/dove.svg?raw'
import calendarDaysSvg from '@fortawesome/fontawesome-free/svgs/solid/calendar-days.svg?raw'
import cameraSvg from '@fortawesome/fontawesome-free/svgs/solid/camera.svg?raw'
import locationDotSvg from '@fortawesome/fontawesome-free/svgs/solid/location-dot.svg?raw'
import quoteLeftSvg from '@fortawesome/fontawesome-free/svgs/solid/quote-left.svg?raw'
import clockSvg from '@fortawesome/fontawesome-free/svgs/solid/clock.svg?raw'
import shirtSvg from '@fortawesome/fontawesome-free/svgs/solid/shirt.svg?raw'
import userGroupSvg from '@fortawesome/fontawesome-free/svgs/solid/user-group.svg?raw'
import cloudSunSvg from '@fortawesome/fontawesome-free/svgs/solid/cloud-sun.svg?raw'
import bedSvg from '@fortawesome/fontawesome-free/svgs/solid/bed.svg?raw'
import headphonesSvg from '@fortawesome/fontawesome-free/svgs/solid/headphones.svg?raw'
import hourglassHalfSvg from '@fortawesome/fontawesome-free/svgs/solid/hourglass-half.svg?raw'
import penNibSvg from '@fortawesome/fontawesome-free/svgs/solid/pen-nib.svg?raw'
import heartSvg from '@fortawesome/fontawesome-free/svgs/solid/heart.svg?raw'
import musicSvg from '@fortawesome/fontawesome-free/svgs/solid/music.svg?raw'
import arrowRightFromBracketSvg from '@fortawesome/fontawesome-free/svgs/solid/arrow-right-from-bracket.svg?raw'
import houseSvg from '@fortawesome/fontawesome-free/svgs/solid/house.svg?raw'
import fileCsvSvg from '@fortawesome/fontawesome-free/svgs/solid/file-csv.svg?raw'
import fileExcelSvg from '@fortawesome/fontawesome-free/svgs/solid/file-excel.svg?raw'
import fileZipperSvg from '@fortawesome/fontawesome-free/svgs/solid/file-zipper.svg?raw'
import fileArrowUpSvg from '@fortawesome/fontawesome-free/svgs/solid/file-arrow-up.svg?raw'
import shareNodesSvg from '@fortawesome/fontawesome-free/svgs/solid/share-nodes.svg?raw'
import circleQuestionSvg from '@fortawesome/fontawesome-free/svgs/solid/circle-question.svg?raw'
import pauseSvg from '@fortawesome/fontawesome-free/svgs/solid/pause.svg?raw'
import crownSvg from '@fortawesome/fontawesome-free/svgs/solid/crown.svg?raw'
import utensilsSvg from '@fortawesome/fontawesome-free/svgs/solid/utensils.svg?raw'
import churchSvg from '@fortawesome/fontawesome-free/svgs/solid/church.svg?raw'
import doorOpenSvg from '@fortawesome/fontawesome-free/svgs/solid/door-open.svg?raw'
import champagneGlassesSvg from '@fortawesome/fontawesome-free/svgs/solid/champagne-glasses.svg?raw'
import ringSvg from '@fortawesome/fontawesome-free/svgs/solid/ring.svg?raw'
import giftSvg from '@fortawesome/fontawesome-free/svgs/solid/gift.svg?raw'
import cakeCandlesSvg from '@fortawesome/fontawesome-free/svgs/solid/cake-candles.svg?raw'
import graduationCapSvg from '@fortawesome/fontawesome-free/svgs/solid/graduation-cap.svg?raw'
import textHeightSvg from '@fortawesome/fontawesome-free/svgs/solid/text-height.svg?raw'
import usersSvg from '@fortawesome/fontawesome-free/svgs/solid/users.svg?raw'
import userPlusSvg from '@fortawesome/fontawesome-free/svgs/solid/user-plus.svg?raw'
import userSlashSvg from '@fortawesome/fontawesome-free/svgs/solid/user-slash.svg?raw'
import userCheckSvg from '@fortawesome/fontawesome-free/svgs/solid/user-check.svg?raw'
import swatchbookSvg from '@fortawesome/fontawesome-free/svgs/solid/swatchbook.svg?raw'
import paintbrushSvg from '@fortawesome/fontawesome-free/svgs/solid/paintbrush.svg?raw'
import userSvg from '@fortawesome/fontawesome-free/svgs/solid/user.svg?raw'
import inboxSvg from '@fortawesome/fontawesome-free/svgs/solid/inbox.svg?raw'
import whatsappSvg from '@fortawesome/fontawesome-free/svgs/brands/whatsapp.svg?raw'

/**
 * Íconos del gestor (Font Awesome, empaquetados: el gestor va en su propio archivo y no
 * pesa en la invitación). Decorativos salvo que lleven `label`.
 */
const props = defineProps<{ name: string; label?: string; spin?: boolean }>()

const ICONS: Record<string, string> = {
  'arrow-left': arrowLeftSvg,
  plus: plusSvg,
  inbox: inboxSvg,
  whatsapp: whatsappSvg,
  eye: eyeSvg,
  'eye-slash': eyeSlashSvg,
  'grip-vertical': gripVerticalSvg,
  'trash-can': trashCanSvg,
  copy: copySvg,
  'rotate-left': rotateLeftSvg,
  'rotate-right': rotateRightSvg,
  'mobile-screen': mobileScreenSvg,
  desktop: desktopSvg,
  play: playSvg,
  xmark: xmarkSvg,
  check: checkSvg,
  'chevron-down': chevronDownSvg,
  'chevron-right': chevronRightSvg,
  'chevron-up': chevronUpSvg,
  'chevron-left': chevronLeftSvg,
  palette: paletteSvg,
  sliders: slidersSvg,
  image: imageSvg,
  upload: uploadSvg,
  download: downloadSvg,
  'clock-rotate-left': clockRotateLeftSvg,
  'arrow-up': arrowUpSvg,
  'arrow-down': arrowDownSvg,
  'magnifying-glass': magnifyingGlassSvg,
  font: fontSvg,
  'wand-magic-sparkles': wandMagicSparklesSvg,
  'eye-dropper': eyeDropperSvg,
  'triangle-exclamation': triangleExclamationSvg,
  'circle-info': circleInfoSvg,
  lock: lockSvg,
  key: keySvg,
  link: linkSvg,
  'arrow-up-right-from-square': arrowUpRightFromSquareSvg,
  ellipsis: ellipsisSvg,
  'volume-xmark': volumeXmarkSvg,
  'volume-high': volumeHighSvg,
  'hand-pointer': handPointerSvg,
  'layer-group': layerGroupSvg,
  rotate: rotateSvg,
  spinner: spinnerSvg,
  cloud: cloudSvg,
  'circle-check': circleCheckSvg,
  wifi: wifiSvg,
  star: starSvg,
  envelope: envelopeSvg,
  dove: doveSvg,
  'calendar-days': calendarDaysSvg,
  camera: cameraSvg,
  'location-dot': locationDotSvg,
  'quote-left': quoteLeftSvg,
  clock: clockSvg,
  shirt: shirtSvg,
  'user-group': userGroupSvg,
  'cloud-sun': cloudSunSvg,
  bed: bedSvg,
  headphones: headphonesSvg,
  'hourglass-half': hourglassHalfSvg,
  'pen-nib': penNibSvg,
  heart: heartSvg,
  music: musicSvg,
  'arrow-right-from-bracket': arrowRightFromBracketSvg,
  house: houseSvg,
  'file-csv': fileCsvSvg,
  'file-excel': fileExcelSvg,
  'file-zipper': fileZipperSvg,
  'file-arrow-up': fileArrowUpSvg,
  'share-nodes': shareNodesSvg,
  'circle-question': circleQuestionSvg,
  pause: pauseSvg,
  crown: crownSvg,
  utensils: utensilsSvg,
  church: churchSvg,
  'door-open': doorOpenSvg,
  'champagne-glasses': champagneGlassesSvg,
  ring: ringSvg,
  gift: giftSvg,
  'cake-candles': cakeCandlesSvg,
  'graduation-cap': graduationCapSvg,
  'text-height': textHeightSvg,
  users: usersSvg,
  'user-plus': userPlusSvg,
  'user-slash': userSlashSvg,
  'user-check': userCheckSvg,
  swatchbook: swatchbookSvg,
  paintbrush: paintbrushSvg,
  user: userSvg,
}

const svg = computed(() => ICONS[props.name] ?? ICONS['circle-question'])
</script>

<template>
  <span
    class="g-icon"
    :class="{ 'g-icon--spin': spin }"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    v-html="svg"
  />
</template>

<style scoped>
.g-icon {
  display: inline-flex;
  width: 1em;
  height: 1em;
  flex: none;
  line-height: 1;
}
.g-icon :deep(svg) {
  width: 100%;
  height: 100%;
  fill: currentColor;
}
.g-icon--spin {
  animation: g-spin 0.9s linear infinite;
}
@keyframes g-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .g-icon--spin {
    animation-duration: 2.4s;
  }
}
</style>
