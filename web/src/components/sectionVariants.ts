import type { Component } from 'vue'

type Loader = () => Promise<{ default: Component }>

/**
 * Diseños alternos de cada sección: tipo → variante (la de `variante` en la invitación o
 * la que pone el tema) → componente. Cualquier tema los puede usar, con sus colores y sus
 * letras: nacieron para Nueva York, pero el boleto, el letrero del metro o el tablero son
 * de todos. Cada uno se descarga solo si alguna sección lo pide (la invitación espera a
 * tenerlo antes de mostrarse). Una variante que no está aquí se pinta con el componente de
 * siempre (sectionRegistry), o con una piel de CSS sobre él (variants/skins.css).
 */
export const sectionVariants: Record<string, Record<string, Loader>> = {
  'hero-envelope': {
    elevador: () => import('./sections/variants/HeroElevator.vue'),
    estatua: () => import('./sections/variants/HeroStatue.vue'),
    telon: () => import('./sections/variants/HeroCurtain.vue'),
    'sobre-central': () => import('./sections/variants/HeroCenterEnvelope.vue'),
    'sobre-lacre': () => import('./sections/variants/HeroSealedEnvelope.vue'),
  },
  'music-player': {
    vinilo: () => import('./sections/variants/MusicVinyl.vue'),
    lacre: () => import('./sections/variants/MusicSeal.vue'),
  },
  blessing: {
    programa: () => import('./sections/variants/BlessingPlaybill.vue'),
    editorial: () => import('./sections/variants/BlessingEditorial.vue'),
  },
  'save-the-date': {
    boleto: () => import('./sections/variants/SaveTheDateTicket.vue'),
    calendario: () => import('./sections/variants/SaveTheDateEnvelope.vue'),
    editorial: () => import('./sections/variants/SaveTheDateEditorial.vue'),
  },
  'photo-arch': {
    ventana: () => import('./sections/variants/PhotoTower.vue'),
    camafeo: () => import('./sections/variants/PhotoCameo.vue'),
  },
  location: {
    metro: () => import('./sections/variants/LocationMetro.vue'),
    grabado: () => import('./sections/variants/LocationEngraving.vue'),
    papeleria: () => import('./sections/variants/LocationStationery.vue'),
  },
  quote: {
    neon: () => import('./sections/variants/QuoteNeon.vue'),
    lamina: () => import('./sections/variants/QuoteSheet.vue'),
  },
  itinerary: {
    avenida: () => import('./sections/variants/ItineraryAvenue.vue'),
    grabado: () => import('./sections/variants/ItineraryEngraving.vue'),
    minuto: () => import('./sections/variants/ItineraryMinute.vue'),
    sello: () => import('./sections/variants/ItinerarySeal.vue'),
  },
  'dress-code': {
    vitrinas: () => import('./sections/variants/DressCodeWindows.vue'),
    muestrario: () => import('./sections/variants/DressCodeSwatches.vue'),
    editorial: () => import('./sections/variants/DressCodeEditorial.vue'),
  },
  'no-kids': { cordon: () => import('./sections/variants/NoKidsRope.vue') },
  countdown: {
    tablero: () => import('./sections/variants/CountdownBoard.vue'),
    corazon: () => import('./sections/variants/CountdownHeart.vue'),
    banda: () => import('./sections/variants/CountdownBand.vue'),
  },
  'envelope-rain': {
    sobre: () => import('./sections/variants/EnvelopeRainShower.vue'),
    lamina: () => import('./sections/variants/EnvelopeRainSheet.vue'),
  },
  gallery: {
    marcos: () => import('./sections/variants/GalleryFrames.vue'),
    carrusel: () => import('./sections/variants/GalleryCarousel.vue'),
    diapositivas: () => import('./sections/variants/GallerySlideshow.vue'),
    bastidor: () => import('./sections/variants/GalleryHoops.vue'),
    editorial: () => import('./sections/variants/GalleryEditorial.vue'),
  },
  hotels: {
    colgantes: () => import('./sections/variants/HotelsHangers.vue'),
    papeleria: () => import('./sections/variants/HotelsStationery.vue'),
  },
  gifts: {
    bolsas: () => import('./sections/variants/GiftsBags.vue'),
    etiqueta: () => import('./sections/variants/GiftsTags.vue'),
    sobre: () => import('./sections/variants/GiftsEnvelope.vue'),
    volteo: () => import('./sections/variants/GiftsFlip.vue'),
  },
  story: {
    editorial: () => import('./sections/variants/StoryEditorial.vue'),
    cronologia: () => import('./sections/variants/StoryTimeline.vue'),
  },
  rsvp: { 'tarjeta-rsvp': () => import('./sections/variants/RsvpReplyCard.vue') },
  'guest-album': { papeleria: () => import('./sections/variants/AlbumStationery.vue') },
  closing: {
    marquesina: () => import('./sections/variants/ClosingMarquee.vue'),
    bordado: () => import('./sections/variants/ClosingEmbroidery.vue'),
    lacre: () => import('./sections/variants/ClosingSeal.vue'),
  },
}

/**
 * Diseños que son solo una piel de CSS sobre el componente de siempre (variants/skins.css,
 * `.section--<tipo>--<variante>`): no se descargan, pero cuentan como registrados.
 */
export const skinVariants: Record<string, string[]> = {
  rsvp: ['pase'],
  dedications: ['postal', 'muro'],
  trivia: ['tarjetas', 'papeleria'],
  faq: ['editorial'],
  video: ['encaje'],
  'social-post': ['encaje'],
}
