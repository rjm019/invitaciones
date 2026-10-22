<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'

/** Pie de todas las invitaciones: la firma de Jiro y sus redes, discretos y con los colores de la paleta. */
const SOCIALS = [
  { icon: 'tiktok', label: 'TikTok de Jiro Invitaciones', href: 'https://www.tiktok.com/@invitaciones.jiro' },
  { icon: 'instagram', label: 'Instagram de Jiro Invitaciones', href: 'https://www.instagram.com/jiroinvitaciones' },
  { icon: 'facebook', label: 'Facebook de Jiro Invitaciones', href: 'https://www.facebook.com/share/1EvV3XfZjc/' },
]
</script>

<template>
  <footer class="invitation-footer">
    <p class="invitation-footer__brand">Jiro Invitaciones</p>
    <nav class="invitation-footer__social" aria-label="Redes sociales de Jiro Invitaciones">
      <a
        v-for="social in SOCIALS"
        :key="social.icon"
        :href="social.href"
        :aria-label="social.label"
        target="_blank"
        rel="noopener noreferrer"
        class="invitation-footer__link"
      >
        <AppIcon :name="social.icon" />
      </a>
    </nav>
  </footer>
</template>

<style scoped>
.invitation-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  max-width: calc(var(--page-max-width) + 2 * var(--space-3));
  margin-inline: auto;
  /* Debajo, espacio para que el botón flotante de la música no tape los iconos. */
  padding: var(--space-1) var(--space-3) calc(var(--space-3) + 3rem);
  color: var(--color-text);
  opacity: 0.7;
}
.invitation-footer__brand {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
}
.invitation-footer__social {
  display: flex;
}
.invitation-footer__link {
  display: grid;
  place-items: center;
  /* El icono es chico, pero el área de toque no. */
  padding: 0.6rem;
  color: var(--color-primary);
  font-size: 0.5rem;
}
.invitation-footer__link:hover,
.invitation-footer__link:focus-visible {
  color: var(--color-primary-strong);
}
</style>
