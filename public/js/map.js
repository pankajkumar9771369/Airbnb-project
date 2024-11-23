
document.addEventListener('DOMContentLoaded', () => {
    
    
    
    
    mapboxgl.accessToken = mapToken;
  
    if (list.geometry && list.geometry.coordinates) {
      const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: list.geometry.coordinates, // Make sure list.geometry.coordinates is valid
        zoom: 9
      });
  
      const marker = new mapboxgl.Marker({ color: 'red' })
        .setLngLat(list.geometry.coordinates) // Use the correct coordinates
        .setPopup(new mapboxgl.Popup({ offset: 25 })
          .setHTML(`<h3>${list.location}</h3><p>Exact location provided after booking!</p>`))
        .addTo(map);
    } else {
      console.error("Invalid or missing geometry data for the listing.");
    }
});
