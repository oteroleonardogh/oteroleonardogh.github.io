import type { IconMap, SocialLink, Site } from '@/types'

export const SITE: Site = {
  title: 'Leonardo Otero',
  description:
    'Software Architect with 20+ years of experience. AI-augmented development, cloud architecture, and scalable data systems.',
  href: 'https://leonardootero.dev',
  author: 'Leonardo Otero',
  locale: 'en-US',
  featuredPostCount: 3,
  postsPerPage: 6,
}

export const NAV_LINKS: SocialLink[] = [
  {
    href: '/blog',
    label: 'blog',
  },
  {
    href: '/about',
    label: 'about',
  },
]

export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://github.com/oteroleonardogh',
    label: 'GitHub',
  },
  {
    href: 'https://www.linkedin.com/in/leonardootero/',
    label: 'LinkedIn',
  },
  {
    href: 'mailto:oteroleonardo@gmail.com',
    label: 'Email',
  },
  {
    href: '/rss.xml',
    label: 'RSS',
  },
]

export const ICON_MAP: IconMap = {
  Website: 'lucide:globe',
  GitHub: 'lucide:github',
  LinkedIn: 'lucide:linkedin',
  Twitter: 'lucide:twitter',
  Email: 'lucide:mail',
  RSS: 'lucide:rss',
}
