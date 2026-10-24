import { useEffect } from 'react'

export function useTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · estud.ia` : 'estud.ia: estudiá con tus preguntas'
  }, [title])
}
