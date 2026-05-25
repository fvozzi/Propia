import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import propiaLogo from '../assests/logoTransparente.png';
import { ResourcePageHeader } from '../components/ResourcePageHeader';
import { StatusPill } from '../components/StatusPill';
import { apiRequest } from '../lib/api';
import { loadGoogleMapsApi } from '../lib/google-maps';
import { useI18n } from '../lib/i18n';
import type { PropertyMapCategory, PropertyMapItem } from '../types';

type MarkerPoint = {
  item: PropertyMapItem;
  lat: number;
  lng: number;
};

type GeocodeFailure = {
  item: PropertyMapItem;
  status: string;
};

function isMarkerPoint(value: MarkerPoint | GeocodeFailure | null): value is MarkerPoint {
  return value !== null && typeof value === 'object' && 'lat' in value && 'lng' in value;
}

function isGeocodeFailure(value: MarkerPoint | GeocodeFailure | null): value is GeocodeFailure {
  return value !== null && typeof value === 'object' && 'status' in value && !('lat' in value);
}

const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 };
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

function buildAddressLabel(item: PropertyMapItem) {
  return [item.address, item.neighborhood, item.city].filter(Boolean).join(', ');
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function normalizeMapItem(value: unknown): PropertyMapItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<PropertyMapItem>;
  if (
    typeof candidate.propertyId !== 'number' ||
    !isString(candidate.title) ||
    !isString(candidate.address) ||
    !isString(candidate.city) ||
    !isString(candidate.operationType) ||
    !isString(candidate.propertyType) ||
    !isString(candidate.status) ||
    !Array.isArray(candidate.categories)
  ) {
    return null;
  }

  const categories = candidate.categories.filter((category): category is PropertyMapCategory => category === 'SALE' || category === 'VISITED');

  return {
    propertyId: candidate.propertyId,
    title: candidate.title,
    address: candidate.address,
    city: candidate.city,
    neighborhood: isString(candidate.neighborhood) ? candidate.neighborhood : null,
    operationType: candidate.operationType as PropertyMapItem['operationType'],
    propertyType: candidate.propertyType,
    status: candidate.status,
    price: typeof candidate.price === 'number' ? candidate.price : null,
    currency: isString(candidate.currency) ? candidate.currency : '',
    categories,
    visitCount: typeof candidate.visitCount === 'number' ? candidate.visitCount : 0,
    lastVisitedAt: isString(candidate.lastVisitedAt) ? candidate.lastVisitedAt : null,
  };
}

function safeTranslateEnum(
  translateEnum: (group: 'operationType' | 'propertyType', value: string) => string,
  group: 'operationType' | 'propertyType',
  value: unknown,
) {
  return isString(value) && value ? translateEnum(group, value) : '-';
}

function buildGeocodeCandidates(item: PropertyMapItem) {
  const base = buildAddressLabel(item);
  const candidates = [
    base,
    `${base}, Argentina`,
    item.city ? `${item.address}, ${item.city}, Argentina` : null,
    item.neighborhood ? `${item.address}, ${item.neighborhood}, Argentina` : null,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

function hasCategory(item: Pick<PropertyMapItem, 'categories'>, category: PropertyMapCategory) {
  return Array.isArray(item.categories) && item.categories.includes(category);
}

function getCachedCoordinates(address: string) {
  const cached = window.sessionStorage.getItem(`propia-map:${address}`);
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached) as { lat: number; lng: number };
    return parsed;
  } catch {
    return null;
  }
}

function cacheCoordinates(address: string, coordinates: { lat: number; lng: number }) {
  window.sessionStorage.setItem(`propia-map:${address}`, JSON.stringify(coordinates));
}

async function geocodeAddress(geocoder: any, item: PropertyMapItem) {
  const candidates = buildGeocodeCandidates(item);
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

export function PropertyMapPage() {
  const { formatDateTime, t, translateEnum } = useI18n();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [items, setItems] = useState<PropertyMapItem[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);
  const [saleEnabled, setSaleEnabled] = useState(true);
  const [visitedEnabled, setVisitedEnabled] = useState(true);
  const [isLoadingMap, setIsLoadingMap] = useState(Boolean(GOOGLE_MAPS_API_KEY));
  const [geocodeWarning, setGeocodeWarning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [geocodeStatus, setGeocodeStatus] = useState<string | null>(null);

  useEffect(() => {
    void apiRequest<unknown>('/properties/map')
      .then((response) => {
        const nextItems = Array.isArray(response) ? response : [];
        setItems(nextItems.map(normalizeMapItem).filter((item): item is PropertyMapItem => item !== null));
        setLoadError(null);
      })
      .catch((error) => {
        setItems([]);
        setLoadError(error instanceof Error ? error.message : 'Map data could not be loaded.');
      });
  }, []);

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

  const activeCategories = useMemo(() => {
    const next: PropertyMapCategory[] = [];
    if (saleEnabled) next.push('SALE');
    if (visitedEnabled) next.push('VISITED');
    return next;
  }, [saleEnabled, visitedEnabled]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (activeCategories.length === 0) return true;
        return activeCategories.some((category) => hasCategory(item, category));
      }),
    [activeCategories, items],
  );

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

    async function geocodeItems() {
      setGeocodeWarning(false);
      setGeocodeStatus(null);

      const results: Array<MarkerPoint | GeocodeFailure | null> = await Promise.all(
        filteredItems.map(async (item) => {
          const result = await geocodeAddress(geocoder, item);
          if (!result.coordinates) {
            if (result.status && result.status !== 'ZERO_RESULTS') {
              return { item, status: result.status };
            }
            return null;
          }

          return { item, ...result.coordinates, status: result.status };
        }),
      );

      if (cancelled) {
        return;
      }

      const failedStatuses = results.filter(isGeocodeFailure).map((result) => result.status);
      const points = results.filter(isMarkerPoint);
      if (points.length !== filteredItems.length) {
        setGeocodeWarning(true);
      }
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
          title: point.item.title,
          icon: {
            url: propiaLogo,
            scaledSize: new googleMaps.Size(36, 36),
            anchor: new googleMaps.Point(18, 18),
          },
        });

        marker.addListener('click', () => {
          infoWindowRef.current?.setContent(`
            <div style="max-width: 240px; font-family: sans-serif;">
              <strong>${point.item.title}</strong>
              <div>${buildAddressLabel(point.item)}</div>
              <div>${point.item.categories.join(' · ')}</div>
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
        mapRef.current.setZoom(14);
        return;
      }

      mapRef.current.fitBounds(bounds, 48);
    }

    void geocodeItems();

    return () => {
      cancelled = true;
    };
  }, [filteredItems, isMapReady]);

  return (
    <div className="page-stack">
      <ResourcePageHeader
        eyebrow={t('map.eyebrow')}
        title={t('map.title')}
        actions={
          <div className="map-filter-group">
            <button
              type="button"
              className={saleEnabled ? 'map-filter-chip active' : 'map-filter-chip'}
              onClick={() => setSaleEnabled((current) => !current)}
            >
              {t('map.saleFilter')}
            </button>
            <button
              type="button"
              className={visitedEnabled ? 'map-filter-chip active' : 'map-filter-chip'}
              onClick={() => setVisitedEnabled((current) => !current)}
            >
              {t('map.visitedFilter')}
            </button>
          </div>
        }
      />

      <div className="map-page-grid">
        <section className="card">
          <h3>{t('map.mapCard')}</h3>
          {!GOOGLE_MAPS_API_KEY ? <p className="muted">{t('map.missingApiKey')}</p> : null}
          {isLoadingMap ? <p className="muted">{t('map.loadingMap')}</p> : null}
          {loadError ? <p className="muted">{loadError}</p> : null}
          {geocodeStatus ? <p className="muted">Google Geocoding: {geocodeStatus}</p> : null}
          {geocodeWarning ? <p className="muted">{t('map.geocodeError')}</p> : null}
          <div ref={mapContainerRef} className="property-map-canvas" />
        </section>

        <section className="card">
          <h3>{t('map.listCard')}</h3>
          {filteredItems.length === 0 ? <p className="muted">{t('map.empty')}</p> : null}
          <div className="map-list">
            {filteredItems.map((item) => (
              <article key={item.propertyId} className="map-list-item">
                <div className="map-list-item-header">
                  <div>
                    <strong>{item.title}</strong>
                    <p className="muted">{buildAddressLabel(item)}</p>
                    <p className="muted">
                      {safeTranslateEnum(translateEnum, 'operationType', item.operationType)} ·{' '}
                      {safeTranslateEnum(translateEnum, 'propertyType', item.propertyType)}
                    </p>
                    {item.lastVisitedAt ? (
                      <p className="muted">
                        {t('map.lastVisitedAt')}: {formatDateTime(item.lastVisitedAt)}
                      </p>
                    ) : null}
                    {item.visitCount > 0 ? (
                      <p className="muted">
                        {t('map.visitCount')}: {item.visitCount}
                      </p>
                    ) : null}
                  </div>
                  <div className="map-list-item-side">
                      <StatusPill value={item.status} />
                      <div className="map-category-row">
                        {item.categories.map((category) => (
                        <span key={category} className={category === 'SALE' ? 'map-category sale' : 'map-category visited'}>
                          {category === 'SALE' ? t('map.saleFilter') : t('map.visitedFilter')}
                        </span>
                      ))}
                    </div>
                    <Link to={`/properties/${item.propertyId}`} className="agenda-link">
                      {t('map.openProperty')}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
