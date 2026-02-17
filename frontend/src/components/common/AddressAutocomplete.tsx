import { useEffect, useRef, useState, useCallback } from 'react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

// Global loader state to avoid loading the script multiple times
let googleMapsLoaded = false
let googleMapsLoading = false
let loadCallbacks: (() => void)[] = []

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (googleMapsLoaded && window.google?.maps) {
      resolve()
      return
    }

    if (googleMapsLoading) {
      loadCallbacks.push(resolve)
      return
    }

    googleMapsLoading = true

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=he&region=IL`
    script.async = true
    script.defer = true

    script.onload = () => {
      googleMapsLoaded = true
      googleMapsLoading = false
      resolve()
      loadCallbacks.forEach((cb) => cb())
      loadCallbacks = []
    }

    script.onerror = () => {
      googleMapsLoading = false
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
  })
}

export interface PlaceResult {
  address: string
  city: string
  lat?: number
  lng?: number
  isExact: boolean
}

interface Suggestion {
  placeId: string
  text: string
  mainText: string
  secondaryText: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
  className?: string
  isRTL?: boolean
}

export default function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = '',
  className = 'input w-full',
  isRTL = true,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dummyDivRef = useRef<HTMLDivElement | null>(null)

  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [warning, setWarning] = useState('')

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError(true)
      return
    }

    loadGoogleMapsScript()
      .then(() => setIsLoaded(true))
      .catch(() => setLoadError(true))
  }, [])

  // Initialize services once loaded
  useEffect(() => {
    if (isLoaded && window.google?.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
      // PlacesService requires a div or map element
      if (!dummyDivRef.current) {
        dummyDivRef.current = document.createElement('div')
      }
      placesServiceRef.current = new google.maps.places.PlacesService(dummyDivRef.current)
    }
  }, [isLoaded])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ensure session token exists
  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current && window.google?.maps?.places) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
    }
    return sessionTokenRef.current
  }, [])

  // Reset session token (after a place is selected)
  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = null
  }, [])

  // Fetch suggestions using AutocompleteService (legacy/standard API)
  const fetchSuggestions = useCallback(
    (input: string) => {
      if (!isLoaded || !input || input.length < 2 || !autocompleteServiceRef.current) {
        setSuggestions([])
        setShowDropdown(false)
        return
      }

      const request: google.maps.places.AutocompletionRequest = {
        input,
        componentRestrictions: { country: 'IL' },
        types: ['address'],
        sessionToken: getSessionToken() ?? undefined,
      }

      autocompleteServiceRef.current.getPlacePredictions(
        request,
        (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions &&
            predictions.length > 0
          ) {
            const newSuggestions: Suggestion[] = predictions.map((pred) => ({
              placeId: pred.place_id,
              text: pred.description,
              mainText: pred.structured_formatting.main_text,
              secondaryText: pred.structured_formatting.secondary_text || '',
            }))

            setSuggestions(newSuggestions)
            setShowDropdown(true)
            setActiveIndex(-1)
          } else {
            setSuggestions([])
            setShowDropdown(false)
          }
        }
      )
    },
    [isLoaded, getSessionToken]
  )

  // Handle selecting a suggestion
  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      setShowDropdown(false)
      setSuggestions([])

      if (!placesServiceRef.current) {
        onChange(suggestion.text)
        resetSessionToken()
        return
      }

      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: suggestion.placeId,
        fields: ['formatted_address', 'address_components', 'geometry'],
        sessionToken: getSessionToken() ?? undefined,
      }

      placesServiceRef.current.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          let streetNumber = ''
          let route = ''
          let city = ''
          let lat: number | undefined
          let lng: number | undefined

          if (place.address_components) {
            for (const component of place.address_components) {
              const types = component.types
              if (types.includes('street_number')) {
                streetNumber = component.long_name || ''
              } else if (types.includes('route')) {
                route = component.long_name || ''
              } else if (types.includes('locality')) {
                city = component.long_name || ''
              } else if (types.includes('administrative_area_level_2') && !city) {
                city = component.long_name || ''
              }
            }
          }

          if (place.geometry?.location) {
            lat = place.geometry.location.lat()
            lng = place.geometry.location.lng()
          }

          const hasExactNumber = !!streetNumber
          const address = route
            ? streetNumber
              ? `${route} ${streetNumber}`
              : route
            : place.formatted_address || suggestion.text

          if (!hasExactNumber) {
            setWarning('יש להזין כתובת מדויקת עם מספר בית')
          } else {
            setWarning('')
          }

          resetSessionToken()
          onPlaceSelect({ address, city, lat, lng, isExact: hasExactNumber })
        } else {
          // Fallback: use the suggestion text
          onChange(suggestion.text)
          resetSessionToken()
        }
      })
    },
    [onChange, onPlaceSelect, getSessionToken, resetSessionToken]
  )

  // Handle input change with debounce
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      onChange(val)
      setWarning('')

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val)
      }, 300)
    },
    [onChange, fetchSuggestions]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || suggestions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault()
        handleSelect(suggestions[activeIndex])
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
      }
    },
    [showDropdown, suggestions, activeIndex, handleSelect]
  )

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // If API key is missing or script failed to load, fall back to regular input
  if (loadError || !GOOGLE_MAPS_API_KEY) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        dir={isRTL ? 'rtl' : 'ltr'}
      />
    )
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true)
        }}
        placeholder={placeholder}
        className={className}
        dir={isRTL ? 'rtl' : 'ltr'}
        autoComplete="off"
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`w-full text-start px-4 py-3 text-sm border-b border-gray-100 last:border-b-0 transition-colors ${
                index === activeIndex
                  ? 'bg-blue-50 text-blue-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{suggestion.mainText}</div>
              {suggestion.secondaryText && (
                <div className="text-xs text-gray-500 mt-0.5">{suggestion.secondaryText}</div>
              )}
            </button>
          ))}
          <div className="px-4 py-1.5 text-xs text-gray-400 bg-gray-50 text-end">
            Powered by Google
          </div>
        </div>
      )}

      {warning && (
        <p className="text-xs text-red-500 mt-1" dir="rtl">{warning}</p>
      )}
    </div>
  )
}
