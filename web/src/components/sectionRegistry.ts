import type { Component } from 'vue'
import HeroEnvelopeSection from './sections/HeroEnvelopeSection.vue'
import MusicPlayerSection from './sections/MusicPlayerSection.vue'
import BlessingSection from './sections/BlessingSection.vue'
import SaveTheDateSection from './sections/SaveTheDateSection.vue'
import PhotoArchSection from './sections/PhotoArchSection.vue'
import LocationSection from './sections/LocationSection.vue'
import QuoteSection from './sections/QuoteSection.vue'
import ItinerarySection from './sections/ItinerarySection.vue'
import DressCodeSection from './sections/DressCodeSection.vue'
import NoKidsSection from './sections/NoKidsSection.vue'
import CountdownSection from './sections/CountdownSection.vue'
import WeatherSection from './sections/WeatherSection.vue'
import HotelsSection from './sections/HotelsSection.vue'
import SpotifySection from './sections/SpotifySection.vue'
import RsvpSection from './sections/RsvpSection.vue'
import DedicationsSection from './sections/DedicationsSection.vue'
import ClosingSection from './sections/ClosingSection.vue'
import GiftsSection from './sections/GiftsSection.vue'
import EnvelopeRainSection from './sections/EnvelopeRainSection.vue'
import LayerSection from './sections/LayerSection.vue'
import GallerySection from './sections/GallerySection.vue'

/**
 * Tipo de sección (columna "seccion" del layout) → componente. Van todas en el mismo
 * archivo que la invitación: una sola descarga en lugar de una por sección (antes la
 * invitación se iba armando frente al invitado). Agregar una sección = un componente +
 * una línea aquí.
 */
export const sectionRegistry: Record<string, Component> = {
  'hero-envelope': HeroEnvelopeSection,
  'music-player': MusicPlayerSection,
  blessing: BlessingSection,
  'save-the-date': SaveTheDateSection,
  'photo-arch': PhotoArchSection,
  location: LocationSection,
  quote: QuoteSection,
  itinerary: ItinerarySection,
  'dress-code': DressCodeSection,
  'no-kids': NoKidsSection,
  countdown: CountdownSection,
  weather: WeatherSection,
  hotels: HotelsSection,
  gallery: GallerySection,
  layer: LayerSection,
  'envelope-rain': EnvelopeRainSection,
  spotify: SpotifySection,
  rsvp: RsvpSection,
  dedications: DedicationsSection,
  closing: ClosingSection,
  gifts: GiftsSection,
}
