import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type CarouselItem = {
  type: 'video' | 'image'
  src: string
  text: React.ReactNode
}

export function AuthCarousel({ items }: { items: CarouselItem[] }) {
  const [currentSlide, setCurrentSlide] = useState(0)

  if (!items || items.length === 0) return null

  const currentItem = items[currentSlide]

  return (
    <div className="hidden flex-1 p-6 lg:block">
      <div className="group relative h-full w-full overflow-hidden rounded-[3rem] bg-[#0a0a0a] flex items-center justify-center shadow-2xl">
        
        {currentItem.type === 'video' ? (
          <video 
            key={currentItem.src}
            src={currentItem.src}
            autoPlay
            muted
            playsInline
            onEnded={() => setCurrentSlide((prev) => (prev + 1) % items.length)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <img 
            key={currentItem.src}
            src={currentItem.src}
            alt="Carousel slide"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
        )}
        
        {/* Softer Gradient Overlay to keep media bright but text readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Manual Navigation Arrows (Visible on hover) */}
        {items.length > 1 && (
          <>
            <button 
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev === 0 ? items.length - 1 : prev - 1))}
              className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white backdrop-blur-md transition-all hover:bg-black/40 opacity-0 group-hover:opacity-100"
              aria-label="Previous slide"
            >
              <ChevronLeft className="size-6" />
            </button>
            
            <button 
              type="button"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % items.length)}
              className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white backdrop-blur-md transition-all hover:bg-black/40 opacity-0 group-hover:opacity-100"
              aria-label="Next slide"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}

        {/* Overlay Text */}
        <div className="pointer-events-none absolute bottom-12 left-0 right-0 px-16 text-center">
          <h2 
            key={`text-${currentSlide}`} 
            className="mx-auto max-w-[480px] text-[28px] font-medium leading-tight text-white drop-shadow-lg"
          >
            {currentItem.text}
          </h2>
          
          {/* Carousel Dots */}
          {items.length > 1 && (
            <div className="mt-10 flex justify-center gap-3">
              {items.map((_, idx) => (
                <button 
                  key={idx}
                  type="button"
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 pointer-events-auto shadow-sm ${currentSlide === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/80'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
