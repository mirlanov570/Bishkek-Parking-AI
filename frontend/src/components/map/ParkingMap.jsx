import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { useLanguage } from '../../context/LanguageContext';
import ParkingMarker from './ParkingMarker';

const BISHKEK_CENTER = [42.8746, 74.6122];
const DEFAULT_ZOOM = 13;

const userLocationIcon = L.divIcon({
  className: '',
  html: '<span class="parking-map-user-marker"><span></span></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -14],
});

const getParkingPosition = (parking) => [Number(parking.latitude), Number(parking.longitude)];

function MapBoundsController({ positions, userLocation }) {
  const map = useMap();
  const positionsKey = positions.map((position) => position.join(',')).join('|');

  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.latitude, userLocation.longitude], 15, { duration: 0.8 });
      return;
    }

    if (positions.length === 1) {
      map.setView(positions[0], 15);
      return;
    }

    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), {
        padding: [46, 46],
        maxZoom: 15,
      });
    }
  }, [map, positions, positionsKey, userLocation]);

  return null;
}

function ParkingMap({ parkings, userLocation, onOpenDetails }) {
  const { t } = useLanguage();
  const positions = useMemo(() => parkings.map(getParkingPosition), [parkings]);

  return (
    <div className="parking-map-card">
      <MapContainer
        center={BISHKEK_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        className="parking-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomControl position="bottomright" />
        <MapBoundsController positions={positions} userLocation={userLocation} />

        {parkings.map((parking) => (
          <ParkingMarker key={parking.id} parking={parking} onOpenDetails={onOpenDetails} />
        ))}

        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="parking-map-popup parking-map-popup--user">
                <strong>{t('map.title')}: {t('parkings.coordinates')}</strong>
                <span>
                  {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export default ParkingMap;