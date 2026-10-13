import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  // Invitación personal de una familia (enlace único con token, con pases y confirmación).
  {
    path: '/i/:token',
    name: 'invitation',
    component: () => import('../pages/InvitationPage.vue'),
    props: true,
  },
  // Panel del dueño del evento (se entra con la clave del layout).
  {
    path: '/panel/:slug',
    name: 'panel',
    component: () => import('../pages/PanelPage.vue'),
    props: true,
  },
  // Invitación general del evento (sin pases).
  {
    path: '/e/:slug',
    name: 'event',
    component: () => import('../pages/EventPage.vue'),
    props: true,
  },
]

// La boda original queda como referencia visual mientras se porta al tema boda-salvia.
// Solo existe en desarrollo; nunca llega al build de producción.
if (import.meta.env.DEV) {
  routes.push({
    path: '/legacy/boda',
    name: 'BodaLegacy',
    // @ts-expect-error -- componente legado en JS (Options API) sin tipos
    component: () => import('../legacy/BodaLegacy.vue'),
    props: { familyName: 'Demo', maxGuests: 2 },
  })
}

routes.push({
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: () => import('../pages/NotFoundPage.vue'),
})

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to) => (to.hash ? { el: to.hash, behavior: 'smooth' } : { top: 0 }),
})

export default router
