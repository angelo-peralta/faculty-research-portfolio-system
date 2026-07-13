import { useQuery } from '@tanstack/react-query'
import { ProfileService } from '@/lib/services/profile-service'
import { queryKeys } from '@/lib/query/query-keys'
import type { FacultyBootstrapData } from '@/lib/types'

const FACULTY_STALE_TIME = 300_000

export function useFacultyBootstrapQuery(
  enabled = true,
  initialData?: FacultyBootstrapData
) {
  return useQuery({
    queryKey: queryKeys.faculty.bootstrap(),
    queryFn: () => ProfileService.getMyBootstrap(),
    enabled,
    initialData,
    staleTime: FACULTY_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useFacultyEducationQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.faculty.education(),
    queryFn: () => ProfileService.listMyEducation(),
    enabled,
    staleTime: FACULTY_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useFacultyPublicationsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.faculty.publications(),
    queryFn: () => ProfileService.listMyPublications(),
    enabled,
    staleTime: FACULTY_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useFacultyEngagementsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.faculty.engagements(),
    queryFn: () => ProfileService.listMyEngagements(),
    enabled,
    staleTime: FACULTY_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}

export function useFacultyResearchQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.faculty.research(),
    queryFn: () => ProfileService.listMyResearchTitles(),
    enabled,
    staleTime: FACULTY_STALE_TIME,
    refetchOnWindowFocus: false,
  })
}
