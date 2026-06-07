import { useEffect, useMemo, useRef, useState } from 'react';
import { loadGoogleMapsApi } from '../lib/google-maps';
import { useI18n } from '../lib/i18n';
import type { RequirementPortalMatch } from '../types';

type Props = {
  matches: RequirementPortalMatch[];
};

type MarkerPoint = {
  match: RequirementPortalMatch;
  lat: number;
  lng: number;
};

type GeocodeFailure = {
  match: RequirementPortalMatch;
  status: string;
};

const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 };
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function isMarkerPoint(value: MarkerPoint | GeocodeFailure | null): value is MarkerPoint {
  return value !== null && typeof value === 'object' && 'lat' in value && 'lng' in value;
}

function isGeocodeFailure(value: MarkerPoint | GeocodeFailure | null): value is GeocodeFailure {
  return value !== null && typeof value === 'object' && 'status' in value && !('lat' in value);
}

function buildAddressLabel(match: RequirementPortalMatch) {
  const listing = match.externalListing;
  return [listing.address, listing.neighborhood, listing.city].filter(Boolean).join(', ');
}

function buildGeocodeCandidates(match: RequirementPortalMatch) {
  const listing = match.externalListing;
  const base = buildAddressLabel(match);
  const title = listing.title?.trim();
  const candidates = [
    base,
    base ? `${base}, Argentina` : null,
    listing.neighborhood ? `${listing.neighborhood}, ${listing.city ?? 'Capital Federal'}, Argentina` : null,
    listing.city ? `${listing.city}, Argentina` : null,
    title && listing.neighborhood ? `${title}, ${listing.neighborhood}, ${listing.city ?? 'Capital Federal'}, Argentina` : null,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

function getCachedCoordinates(address: string) {
  const cached = window.sessionStorage.getItem(`propia-external-map:${address}`);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as { lat: number; lng: number };
    return parsed;
  } catch {
    return null;
  }
}

function cacheCoordinates(address: string, coordinates: { lat: number; lng: number }) {
  window.sessionStorage.setItem(`propia-external-map:${address}`, JSON.stringify(coordinates));
}

async function geocodeMatch(geocoder: any, match: RequirementPortalMatch) {
  const candidates = buildGeocodeCandidates(match);
  let lastStatus = 'ZERO_RESULTS';

  for (const address of candidates) {
    const cached = getCachedCoordinates(address);
    if (cached) {
      return { coordinates: cached, status: 'OK' };
    }

    try {
      const response = await geocoder.geocode({
        address,
        region: 'AR',
        componentRestrictions: { country: 'AR' },
      });
      const location = response.results?.[0]?.geometry?.location;
      const status = response.status ?? 'OK';
      lastStatus = status;

      if (location) {
        const coordinates = {
          lat: location.lat(),
          lng: location.lng(),
        };
        cacheCoordinates(address, coordinates);
        return { coordinates, status };
      }
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
          ? error.code
          : 'ERROR';
      lastStatus = status;
      if (status === 'REQUEST_DENIED' || status === 'OVER_QUERY_LIMIT') {
        return { coordinates: null, status };
      }
    }
  }

  return { coordinates: null, status: lastStatus };
}

function providerLabel(provider: RequirementPortalMatch['externalListing']['providerKey']) {
  switch (provider) {
    case 'ARGENPROP':
      return 'Argenprop';
    case 'ZONAPROP':
      return 'Zonaprop';
    case 'MERCADOLIBRE':
      return 'Mercado Libre';
    case 'MOCK':
      return 'Mock';
    default:
      return provider;
  }
}

function formatMoney(value: number | null, currency: string) {
  if (value === null) {
    return 'Sin precio';
  }

  return `${currency} ${new Intl.NumberFormat('es-AR').format(value)}`;
}

export function ExternalSuggestionsMap({ matches }: Props) {
  const { t, translateEnum } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(Boolean(GOOGLE_MAPS_API_KEY));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [geocodeWarning, setGeocodeWarning] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null);

  const visibleMatches = useMemo(
    () => matches.filter((match) => !match.dismissed),
    [matches],
  );

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setIsLoadingMap(false);
      return;
    }

    let mounted = true;
    void loadGoogleMapsApi(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (!mounted) return;
        setIsMapReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : 'Google Maps could not be loaded.');
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingMap(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const googleMaps = window.google?.maps;
    if (!isMapReady || !googleMaps || !mapContainerRef.current) {
      return;
    }

    if (!mapRef.current) {
      mapRef.current = new googleMaps.Map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      infoWindowRef.current = new googleMaps.InfoWindow();
    }
  }, [isMapReady]);

  useEffect(() => {
    const googleMaps = window.google?.maps;
    if (!isMapReady || !googleMaps || !mapRef.current) {
      return;
    }

    let cancelled = false;
    const geocoder = new googleMaps.Geocoder();

    async function geocodeMatches() {
      setGeocodeWarning(false);
      setGeocodeStatus(null);

      const results: Array<MarkerPoint | GeocodeFailure | null> = await Promise.all(
        visibleMatches.map(async (match) => {
          const result = await geocodeMatch(geocoder, match);
          if (!result.coordinates) {
            if (result.status && result.status !== 'ZERO_RESULTS') {
              return { match, status: result.status };
            }
            return null;
          }

          return { match, ...result.coordinates };
        }),
      );

      if (cancelled) {
        return;
      }

      const failedStatuses = results.filter(isGeocodeFailure).map((result) => result.status);
      const points = results.filter(isMarkerPoint);
      setGeocodeWarning(points.length !== visibleMatches.length);
      if (failedStatuses.length > 0) {
        setGeocodeStatus(failedStatuses[0]);
      }

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      if (points.length === 0) {
        mapRef.current.setCenter(DEFAULT_CENTER);
        mapRef.current.setZoom(11);
        return;
      }

      const bounds = new googleMaps.LatLngBounds();
      points.forEach((point) => {
        const marker = new googleMaps.Marker({
          map: mapRef.current,
          position: { lat: point.lat, lng: point.lng },
          title: point.match.externalListing.title,
        });

        marker.addListener('click', () => {
          const listing = point.match.externalListing;
          infoWindowRef.current?.setContent(`
            <div style="max-width: 260px; font-family: sans-serif;">
              <strong>${listing.title}</strong>
              <div>${buildAddressLabel(point.match) || '-'}</div>
              <div>${providerLabel(listing.providerKey)} · ${formatMoney(listing.price, listing.currency)}</div>
              <div>${translateEnum('propertyType', listing.propertyType)}</div>
            </div>
          `);
          infoWindowRef.current?.open({
            anchor: marker,
            map: mapRef.current,
          });
        });

        markersRef.current.push(marker);
        bounds.extend(marker.getPosition());
      });

      if (points.length === 1) {
        mapRef.current.setCenter(bounds.getCenter());
        mapRef.current.setZoom(13);
        return;
      }

      mapRef.current.fitBounds(bounds, 48);
    }

    void geocodeMatches();

    return () => {
      cancelled = true;
    };
  }, [isMapReady, translateEnum, visibleMatches]);

  return (
    <div className="map-page-grid">
      <section className="card">
        <h3>{t('requirements.mapCard')}</h3>
        {!GOOGLE_MAPS_API_KEY ? <p className="muted">{t('map.missingApiKey')}</p> : null}
        {isLoadingMap ? <p className="muted">{t('map.loadingMap')}</p> : null}
        {loadError ? <p className="muted">{loadError}</p> : null}
        {geocodeStatus ? <p className="muted">Google Geocoding: {geocodeStatus}</p> : null}
        {geocodeWarning ? <p className="muted">{t('map.geocodeError')}</p> : null}
        <div ref={mapContainerRef} className="property-map-canvas" />
      </section>

      <section className="card">
        <h3>{t('requirements.mapListCard')}</h3>
        {visibleMatches.length === 0 ? <p className="muted">{t('requirements.noExternalSuggestions')}</p> : null}
        <div className="map-list">
          {visibleMatches.map((match) => (
            <article key={match.id} className="map-list-item">
              <div className="map-list-item-header">
                <div>
                  <strong>{match.externalListing.title}</strong>
                  <p className="muted">{buildAddressLabel(match) || t('common.noData')}</p>
                  <p className="muted">
                    {providerLabel(match.externalListing.providerKey)} · {formatMoney(match.externalListing.price, match.externalListing.currency)}
                  </p>
                </div>
                <div className="map-list-item-side">
                  <span className="pill">{match.score}</span>
                  <a
                    href={match.externalListing.canonicalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="agenda-link"
                  >
                    {t('requirements.openMapListing')}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
