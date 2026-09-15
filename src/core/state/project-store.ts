import { useSyncExternalStore } from 'react'
import {
  defaultProjectInfo,
  type ProjectInfo
} from '../models/project'

type Listener = () => void

let projectInfo: ProjectInfo = { ...defaultProjectInfo }
const listeners = new Set<Listener>()

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return projectInfo
}

export function updateProjectInfo(next: ProjectInfo) {
  projectInfo = next
  listeners.forEach((listener) => listener())
}

export function useProjectInfo() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
