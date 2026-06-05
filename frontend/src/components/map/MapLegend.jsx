import { useLanguage } from '../../context/LanguageContext';

function MapLegend() {
  const { t } = useLanguage();

  return (
    <aside className="map-legend" aria-label="Map legend">
      <h3>{t('parkings.loadPercentage')}</h3>
      <div className="map-legend__item">
        <span className="map-legend__dot map-legend__dot--green" />
        <strong>{t('parkings.filters.low')}</strong>
      </div>
      <div className="map-legend__item">
        <span className="map-legend__dot map-legend__dot--yellow" />
        <strong>{t('parkings.filters.medium')}</strong>
      </div>
      <div className="map-legend__item">
        <span className="map-legend__dot map-legend__dot--red" />
        <strong>{t('parkings.filters.high')}</strong>
      </div>
    </aside>
  );
}

export default MapLegend;