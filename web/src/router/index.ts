import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
// La invitación va en el archivo principal (sin otra petición antes de empezar); el panel no.
import EventPage from '../pages/EventPage.vue'
import InvitationPage from '../pages/InvitationPage.vue'

const routes: RouteRecordRaw[] = [
  // Invitación personal de una familia (enlace único con token, con pases y confirmación).
  {
    path: '/i/:token',
    name: 'invitation',
    component: InvitationPage,
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
    component: EventPage,
    props: true,
  },
  // Gestor de invitaciones: inicio, la vista previa del editor (va dentro de un iframe) y
  // el editor de cada invitación. "vista-previa" va antes: no puede ser una invitación.
  {
    path: '/gestor',
    name: 'manager',
    component: () => import('../pages/ManagerPage.vue'),
  },
  {
    path: '/gestor/vista-previa',
    name: 'manager-preview',
    component: () => import('../pages/ManagerPreviewPage.vue'),
  },
  {
    path: '/gestor/:slug',
    name: 'manager-editor',
    component: () => import('../pages/ManagerEditorPage.vue'),
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
