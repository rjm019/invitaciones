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
  },
  'music-player': { vinilo: () => import('./sections/variants/MusicVinyl.vue') },
  blessing: { programa: () => import('./sections/variants/BlessingPlaybill.vue') },
  'save-the-date': { boleto: () => import('./sections/variants/SaveTheDateTicket.vue') },
  'photo-arch': { ventana: () => import('./sections/variants/PhotoTower.vue') },
  location: { metro: () => import('./sections/variants/LocationMetro.vue') },
  quote: { neon: () => import('./sections/variants/QuoteNeon.vue') },
  itinerary: { avenida: () => import('./sections/variants/ItineraryAvenue.vue') },
  'dress-code': { vitrinas: () => import('./sections/variants/DressCodeWindows.vue') },
  'no-kids': { cordon: () => import('./sections/variants/NoKidsRope.vue') },
  countdown: { tablero: () => import('./sections/variants/CountdownBoard.vue') },
  'envelope-rain': { sobre: () => import('./sections/variants/EnvelopeRainShower.vue') },
  gallery: { marcos: () => import('./sections/variants/GalleryFrames.vue') },
  hotels: { colgantes: () => import('./sections/variants/HotelsHangers.vue') },
  gifts: { bolsas: () => import('./sections/variants/GiftsBags.vue') },
  closing: { marquesina: () => import('./sections/variants/ClosingMarquee.vue') },
}
