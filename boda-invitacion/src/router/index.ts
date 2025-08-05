import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/generate-link',
      name: 'GenerateLink',
      component: () => import('../components/GenerateLink.vue'),
    },
    {
      path: '/invitacion/:familyName/:maxGuests',
      name: 'Invitation',
      component: () => import('../components/Invitation.vue'),
      props: (route) => ({
        familyName: Array.isArray(route.params.familyName)
          ? route.params.familyName[0]
          : route.params.familyName,
        maxGuests: parseInt(
          Array.isArray(route.params.maxGuests)
            ? route.params.maxGuests[0]
            : route.params.maxGuests,
          10
        ),
      }),
    },
    {
      path: '/register/:familyName/:maxGuests',
      name: 'RegisterGuests',
      component: () => import('../components/RegisterGuests.vue'),
      props: (route) => ({
        familyName: Array.isArray(route.params.familyName)
          ? route.params.familyName[0]
          : route.params.familyName,
        maxGuests: parseInt(
          Array.isArray(route.params.maxGuests)
            ? route.params.maxGuests[0]
            : route.params.maxGuests,
          10
        ),
      }),
    },
  ],
});

export default router;
