
const MAPTILER_KEY  = '2gxu8DCAcsGdQwgt2yRn';
const WEATHER_KEY   = 'cbe1c112138ebd2dfa930649396b67a5';

let map;
let currentLat = null;
let currentLng = null;

let myMarker       = null;
let recMarkers     = [];
const poiLayers    = {};

document.addEventListener('DOMContentLoaded', () => {
  map = L.map('map').setView([37.5665,126.9780], 17); 
  L.tileLayer(
    `https://api.maptiler.com/maps/aquarelle/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    { attribution:'© MapTiler © OSM' }
  ).addTo(map);

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => {
      console.log("위치 인식 성공:", pos.coords);
      updateAll(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      console.error("위치 인식 실패:", err.message);
      alert("위치 권한이 허용되지 않았거나 인식에 실패했습니다.");
    }
  );
} else {
  alert("이 브라우저에서는 위치 정보 기능이 지원되지 않습니다.");
}});

map?.on('click', e => updateAll(e.latlng.lat, e.latlng.lng));

function updateAll(lat, lng) {
  currentLat = lat; currentLng = lng;

  map.setView([lat, lng], 17);

  if (!myMarker) {
    myMarker = L.circleMarker([lat, lng],
      { radius:7, color:'#0a84ff', fillColor:'#0a84ff', fillOpacity:.9 }
    ).addTo(map).bindPopup('현재 위치');
  } else {
    myMarker.setLatLng([lat,lng]);
  }

  fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
    .then(r=>r.json())
    .then(d=>{
      const text = d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      document.getElementById('location-info').innerText = text;
    });

  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_KEY}&units=metric&lang=kr`)
    .then(r=>r.json())
    .then(d=>{
      if (d.weather && d.main) {
        document.getElementById('weather-info').innerText =
          `${d.weather[0].description} / ${d.main.temp}°C`;
      }
    });

  fetchNearbyRecommendations(lat, lng);
}

function fetchNearbyRecommendations(lat,lng){
  recMarkers.forEach(m=>map.removeLayer(m)); recMarkers=[];

  const list   = document.getElementById('recommend-list');
  list.innerHTML = '불러오는 중…';

  const radius = 500;
  const cats   = ['cafe','restaurant','convenience','park'].join('|');
  const query  = `[out:json][timeout:25];
    node["amenity"~"${cats}"](around:${radius},${lat},${lng});out;`;

  fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:query})
    .then(r=>r.json())
    .then(res=>{
      list.innerHTML = '';
      const items = res.elements
        .filter(e=>e.tags?.name)
        .map(e=>({
          name:e.tags.name,
          lat:e.lat, lon:e.lon,
          dist: Math.round(distanceM(lat,lng,e.lat,e.lon))
        }))
        .sort((a,b)=>a.dist-b.dist)
        .slice(0,7);

      items.forEach(it=>{
        const li=document.createElement('li');
        li.innerHTML = `<span class="recommend-name">${it.name}</span>
                <span class="recommend-distance">${it.dist}m</span>`;
        li.onclick=()=>{
          map.setView([it.lat,it.lon],17);
          const mk=L.marker([it.lat,it.lon])
            .addTo(map).bindPopup(`${it.name}<br>${it.dist}m`).openPopup();
          recMarkers.push(mk);
        };
        list.appendChild(li);
      });
    })
    .catch(err=>{
      console.error('추천 장소 오류', err);
      list.innerText = '추천을 불러오지 못했습니다';
    });
}

function distanceM(lat1,lng1,lat2,lng2){
  const R=6371000,deg=Math.PI/180;
  const dLat=(lat2-lat1)*deg,dLng=(lng2-lng1)*deg;
  const a=Math.sin(dLat/2)**2+
          Math.cos(lat1*deg)*Math.cos(lat2*deg)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

document.getElementById('btn-pet')
  .onclick = () => toggleCategory('leisure=park|amenity=bench', '#9cd3b3'); 
document.getElementById('btn-greenery')
  .onclick = () => toggleCategory('leisure=garden|leisure=park', '#b9ddc3');   
document.getElementById('btn-running')
  .onclick = () => toggleCategory('route=running', '#b8c9ea');  
document.getElementById('btn-cafe')
  .onclick=()=>toggleCategory('amenity=cafe','#a89ac1');
document.getElementById('btn-restaurant')
  .onclick=()=>toggleCategory('amenity=restaurant','#d98c8c');
document.getElementById('btn-convenience')
  .onclick=()=>toggleCategory('shop=convenience','#98b998');

function toggleCategory(tag,color){
  if (!currentLat) return alert('먼저 위치를 지정하세요.');

  if (poiLayers[tag]){ map.removeLayer(poiLayers[tag]); delete poiLayers[tag]; return; }

  const q=`[out:json];node[${tag}](around:600,${currentLat},${currentLng});out;`;
  fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:q})
    .then(r=>r.json())
    .then(res=>{
      const g=L.layerGroup();
      res.elements.forEach(e=>{
        if(!e.tags?.name) return;
        L.circleMarker([e.lat,e.lon],
          {radius:4,color:color,fillColor:color,fillOpacity:.9}
        ).addTo(g).bindPopup(e.tags.name);
      });
      g.addTo(map); poiLayers[tag]=g;
    });
}

document.getElementById('search-button').onclick=()=>{
  const kw=document.getElementById('search-input').value.trim();
  if(!kw) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(kw)}`)
    .then(r=>r.json())
    .then(d=>{
      if(d.length) updateAll(+d[0].lat,+d[0].lon);
      else alert('검색 결과가 없습니다');
    });
};

document.getElementById('location-info')
  .addEventListener('click',()=>currentLat && map.setView([currentLat,currentLng],16));

function adjustCategories() {
  const container = document.querySelector('.controls');
  const allButtons = Array.from(container.querySelectorAll('.button-item'));
  
  const plusBtn = allButtons[allButtons.length - 1];
  const normalButtons = allButtons.slice(0, -1);

  normalButtons.forEach(btn => btn.style.display = 'inline-block');
  plusBtn.style.display = 'inline-block';

  const containerWidth = container.offsetWidth;
  let totalWidth = plusBtn.offsetWidth + 8;

  for (let i = 0; i < normalButtons.length; i++) {
    const btn = normalButtons[i];
    totalWidth += btn.offsetWidth + 8;

    if (totalWidth > containerWidth) {
      btn.style.display = 'none';
    }
  }
}

window.addEventListener('resize', adjustCategories);
window.addEventListener('load', adjustCategories);


document.getElementById('search-button').addEventListener('click', function() {
  const keyword = document.getElementById('search-input').value;
  if (!keyword) {
    alert('검색어를 입력하세요.');
    return;
  }

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(keyword)}`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        alert('검색 결과가 없습니다.');
        return;
      }

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      map.setView([lat, lon], 16);  // 검색된 위치로 이동
      L.marker([lat, lon]).addTo(map).bindPopup(data[0].display_name).openPopup();
    })
    .catch(err => {
      console.error("장소 검색 오류:", err);
    });
});

const walkButton = document.getElementById("btn-30m");
let walkRouteVisible = false;
let walkRoutePolyline = null;
let walkRouteMarkers = [];

const walkRoute = [
  { name: "49동", lat: 37.4635, lon: 126.9541 },
  { name: "법학전문대학원", lat: 37.4619, lon: 126.9524, desc: "법학전문대학원과 예술동 사이로 아름다운 보행로가 있습니다." },
  { name: "자하연", lat: 37.4608, lon: 126.9519, desc: "연못과 자연풍경이 있는 휴식 공간입니다." },
  { name: "잔디광장", lat: 37.4605, lon: 126.9506, desc: "넓은 잔디밭으로 휴식을 취하거나 운동을 할 수 있습니다." },
  { name: "중앙도서관", lat: 37.4595, lon: 126.9523, desc: "학교 중심에 위치하며 500만권 이상의 책을 소장하고 있습니다." },
  { name: "버들골", lat: 37.4587, lon: 126.9554, desc: "자연과 야외 원형공연장이 어우러진 문화예술공간입니다." },
  { name: "49동", lat: 37.4635, lon: 126.9541 },
];

walkButton.addEventListener("click", () => {
  walkRouteVisible = !walkRouteVisible;

  const sidebarDefault = document.getElementById("default-sidebar-content");
  const routeInfo = document.getElementById("route-info");

  if (walkRouteVisible) {
    walkRouteMarkers = walkRoute.map((point) => {
      return L.circleMarker([point.lat, point.lon], {
        radius: 6,
        color: "#555",
        fillColor: "#2c6d9e",
        fillOpacity: 1,
        weight: 0
      }).addTo(map).bindTooltip(point.name, { permanent: true, direction: 'top', offset: [0, -8] });
    });

    const latlngs = walkRoute.map(p => [p.lat, p.lon]);
    walkRoutePolyline = L.polyline(latlngs, {
      color: "#444",
      weight: 2,
      opacity: 0.6,
      dashArray: "6 4"
    }).addTo(map);

    sidebarDefault.style.display = "none";
    routeInfo.innerHTML = `
      <h4>30m walk course</h4>
      <ul style='padding-left:1rem;margin-top:4px'>
        ${walkRoute.map(p => `
          <li style="margin-bottom: 12px;">
            <div class="point-title" style="font-weight: bold; margin-bottom: 4px;">${p.name}</div>
            ${p.desc ? `<div class="point-desc" style="font-size: 0.85rem; color: #666;">${p.desc}</div>` : ""}
          </li>
        `).join("")}
      </ul>`;
    routeInfo.style.display = "block";
  } else {
    walkRouteMarkers.forEach(m => map.removeLayer(m));
    walkRouteMarkers = [];
    if (walkRoutePolyline) {
      map.removeLayer(walkRoutePolyline);
      walkRoutePolyline = null;
    }
    routeInfo.style.display = "none";
    sidebarDefault.style.display = "block";
  }
});

