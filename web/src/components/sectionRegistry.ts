import { defineAsyncComponent, type Component } from 'vue'

/**
 * Tipo de sección (columna "seccion" del layout) → componente. Cada uno se carga
 * solo si el evento lo usa. Agregar una sección = un componente + una línea aquí.
 */
export const sectionRegistry: Record<string, Component> = {
  'hero-envelope': defineAsyncComponent(() => import('./sections/HeroEnvelopeSection.vue')),
  'music-player': defineAsyncComponent(() => import('./sections/MusicPlayerSection.vue')),
  blessing: defineAsyncComponent(() => import('./sections/BlessingSection.vue')),
  'save-the-date': defineAsyncComponent(() => import('./sections/SaveTheDateSection.vue')),
  'photo-arch': defineAsyncComponent(() => import('./sections/PhotoArchSection.vue')),
  location: defineAsyncComponent(() => import('./sections/LocationSection.vue')),
  quote: defineAsyncComponent(() => import('./sections/QuoteSection.vue')),
  itinerary: defineAsyncComponent(() => import('./sections/ItinerarySection.vue')),
  'dress-code': defineAsyncComponent(() => import('./sections/DressCodeSection.vue')),
  'no-kids': defineAsyncComponent(() => import('./sections/NoKidsSection.vue')),
  countdown: defineAsyncComponent(() => import('./sections/CountdownSection.vue')),
  weather: defineAsyncComponent(() => import('./sections/WeatherSection.vue')),
  spotify: defineAsyncComponent(() => import('./sections/SpotifySection.vue')),
  rsvp: defineAsyncComponent(() => import('./sections/RsvpSection.vue')),
  dedications: defineAsyncComponent(() => import('./sections/DedicationsSection.vue')),
  closing: defineAsyncComponent(() => import('./sections/ClosingSection.vue')),
}
