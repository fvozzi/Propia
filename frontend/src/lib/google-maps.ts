type GoogleMapsApi = {
  maps: any;
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
  }
}

let googleMapsLoader: Promise<GoogleMapsApi> | null = null;

async function ensureMapsLibrariesLoaded(): Promise<GoogleMapsApi> {
  const googleNamespace = window.google;
  const googleMaps = googleNamespace?.maps;
  if (!googleMaps) {
    throw new Error('Google Maps did not initialize correctly.');
  }

  if (typeof googleMaps.importLibrary === 'function') {
    await googleMaps.importLibrary('maps');
    try {
      await googleMaps.importLibrary('marker');
    } catch {
      // Marker support is optional for this view; keep the base map usable.
    }
  }

  if (typeof googleMaps.Map !== 'function') {
    throw new Error('Google Maps did not initialize correctly.');
  }

  return googleNamespace;
}

export async function loadGoogleMapsApi(apiKey: string) {
  if (window.google?.maps) {
    return ensureMapsLibrariesLoaded();
  }

  if (googleMapsLoader) {
    return googleMapsLoader;
  }

  googleMapsLoader = new Promise<GoogleMapsApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-propia-google-maps="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        void ensureMapsLibrariesLoaded().then(resolve).catch(reject);
      });
      existingScript.addEventListener('error', () => reject(new Error('Could not load Google Maps.')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.propiaGoogleMaps = 'true';
    script.onload = () => {
      void ensureMapsLibrariesLoaded().then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error('Could not load Google Maps.'));
    document.head.appendChild(script);
  });

  return googleMapsLoader.catch((error) => {
    googleMapsLoader = null;
    throw error;
  });
}
