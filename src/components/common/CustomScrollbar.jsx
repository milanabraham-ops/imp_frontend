import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

const MIN_THUMB = 24

const CustomScrollbar = forwardRef(function CustomScrollbar(
  { children, className = '', vertical = true, horizontal = false },
  ref,
) {
  const viewportRef = useRef(null)
  const [vThumb, setVThumb] = useState({ size: 0, offset: 0, visible: false })
  const [hThumb, setHThumb] = useState({ size: 0, offset: 0, visible: false })
  const [dragging, setDragging] = useState(null)
  const dragRef = useRef(null)

  useImperativeHandle(ref, () => ({
    get element() {
      return viewportRef.current
    },
    scrollTo: (opts) => viewportRef.current?.scrollTo(opts),
  }))

  const update = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    if (vertical) {
      const trackSize = el.clientHeight
      const contentSize = el.scrollHeight
      const visible = contentSize > trackSize + 1
      const size = visible ? Math.max((trackSize / contentSize) * trackSize, MIN_THUMB) : 0
      const maxOffset = trackSize - size
      const maxScroll = contentSize - trackSize || 1
      setVThumb({ size, offset: (el.scrollTop / maxScroll) * maxOffset, visible })
    }
    if (horizontal) {
      const trackSize = el.clientWidth
      const contentSize = el.scrollWidth
      const visible = contentSize > trackSize + 1
      const size = visible ? Math.max((trackSize / contentSize) * trackSize, MIN_THUMB) : 0
      const maxOffset = trackSize - size
      const maxScroll = contentSize - trackSize || 1
      setHThumb({ size, offset: (el.scrollLeft / maxScroll) * maxOffset, visible })
    }
  }, [vertical, horizontal])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [update])

  useEffect(() => {
    if (!dragging) return

    const onMove = (e) => {
      const el = viewportRef.current
      const d = dragRef.current
      if (!el || !d) return
      if (d.axis === 'v') {
        const trackSize = el.clientHeight
        const contentSize = el.scrollHeight
        const ratio = (contentSize - trackSize) / (trackSize - d.thumbSize || 1)
        el.scrollTop = d.startScroll + (e.clientY - d.startPos) * ratio
      } else {
        const trackSize = el.clientWidth
        const contentSize = el.scrollWidth
        const ratio = (contentSize - trackSize) / (trackSize - d.thumbSize || 1)
        el.scrollLeft = d.startScroll + (e.clientX - d.startPos) * ratio
      }
    }
    const onUp = () => {
      dragRef.current = null
      setDragging(null)
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  const startDrag = (axis) => (e) => {
    e.preventDefault()
    const el = viewportRef.current
    if (!el) return
    dragRef.current = {
      axis,
      startPos: axis === 'v' ? e.clientY : e.clientX,
      startScroll: axis === 'v' ? el.scrollTop : el.scrollLeft,
      thumbSize: axis === 'v' ? vThumb.size : hThumb.size,
    }
    document.body.style.userSelect = 'none'
    setDragging(axis)
  }

  return (
    <div className={`custom-scrollbar-wrap ${className}`}>
      <div className="custom-scrollbar-viewport" ref={viewportRef}>
        {children}
      </div>
      {vertical && vThumb.visible && (
        <div className="custom-scrollbar-track custom-scrollbar-track-v">
          <div
            className={`custom-scrollbar-thumb custom-scrollbar-thumb-v ${dragging === 'v' ? 'dragging' : ''}`}
            style={{ height: vThumb.size, transform: `translateY(${vThumb.offset}px)` }}
            onMouseDown={startDrag('v')}
          />
        </div>
      )}
      {horizontal && hThumb.visible && (
        <div className="custom-scrollbar-track custom-scrollbar-track-h">
          <div
            className={`custom-scrollbar-thumb custom-scrollbar-thumb-h ${dragging === 'h' ? 'dragging' : ''}`}
            style={{ width: hThumb.size, transform: `translateX(${hThumb.offset}px)` }}
            onMouseDown={startDrag('h')}
          />
        </div>
      )}
    </div>
  )
})

export default CustomScrollbar
