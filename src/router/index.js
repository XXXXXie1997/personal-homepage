import { createRouter } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CvView from '../views/CvView.vue'
import ProjectsView from '../views/ProjectsView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/cv',
    name: 'cv',
    component: CvView
  },
  {
    path: '/blog/:pathMatch(.*)*',
    redirect: '/'
  },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectsView
  }
]

export function createSiteRouter(history) {
  return createRouter({ history, routes })
}
