// 위치 권한 거부·실패 시 기본 위치
export const DEFAULT_LOCATION = {
  lat: 37.5665,
  lon: 126.978,
  locationName: "서울특별시",
  sidoName: "서울",
  district: "중구",
  isDefault: true,
};

// 시·도 대표 좌표 (가장 가까운 곳을 에어코리아 sidoName으로 사용)
const SIDO = [
  { sidoName: "서울", fullName: "서울특별시", lat: 37.5665, lon: 126.978 },
  { sidoName: "부산", fullName: "부산광역시", lat: 35.1796, lon: 129.0756 },
  { sidoName: "대구", fullName: "대구광역시", lat: 35.8714, lon: 128.6014 },
  { sidoName: "인천", fullName: "인천광역시", lat: 37.4563, lon: 126.7052 },
  { sidoName: "광주", fullName: "광주광역시", lat: 35.1595, lon: 126.8526 },
  { sidoName: "대전", fullName: "대전광역시", lat: 36.3504, lon: 127.3845 },
  { sidoName: "울산", fullName: "울산광역시", lat: 35.5384, lon: 129.3114 },
  { sidoName: "세종", fullName: "세종특별자치시", lat: 36.48, lon: 127.289 },
  { sidoName: "경기", fullName: "경기도", lat: 37.4138, lon: 127.5183 },
  { sidoName: "강원", fullName: "강원특별자치도", lat: 37.8228, lon: 128.1555 },
  { sidoName: "충북", fullName: "충청북도", lat: 36.6357, lon: 127.4917 },
  { sidoName: "충남", fullName: "충청남도", lat: 36.5184, lon: 126.8 },
  { sidoName: "전북", fullName: "전북특별자치도", lat: 35.7175, lon: 127.153 },
  { sidoName: "전남", fullName: "전라남도", lat: 34.8161, lon: 126.4629 },
  { sidoName: "경북", fullName: "경상북도", lat: 36.4919, lon: 128.8889 },
  { sidoName: "경남", fullName: "경상남도", lat: 35.4606, lon: 128.2132 },
  { sidoName: "제주", fullName: "제주특별자치도", lat: 33.4996, lon: 126.5312 },
];

function nearestSido(lat, lon) {
  let best = SIDO[0];
  let bestDist = Infinity;
  for (const sido of SIDO) {
    const dist = (sido.lat - lat) ** 2 + ((sido.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (dist < bestDist) {
      best = sido;
      bestDist = dist;
    }
  }
  return best;
}

// 브라우저의 timeout 옵션은 사용자가 권한 창에 답한 뒤부터 재므로,
// 권한 창을 그냥 두면 무한히 기다리게 됨 → 전체 대기 시간을 따로 제한
const PERMISSION_WAIT_MS = 10000;

function getPosition() {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error("위치 권한 응답 대기 시간 초과")), PERMISSION_WAIT_MS);
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저는 위치 정보를 지원하지 않습니다"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message || "위치 정보를 가져오지 못했습니다")),
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

// 좌표 → "종로구" 같은 구·군 이름 (키 없이 쓰는 BigDataCloud 무료 API)
async function reverseGeocode(lat, lon) {
  const url = new URL("https://api-bdc.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("localityLanguage", "ko");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`주소 변환 실패: ${res.status}`);
  const data = await res.json();
  // 행정구역 목록에서 "구/군/시"로 끝나는 가장 작은 단위를 찾음
  const admin = data?.localityInfo?.administrative ?? [];
  const district = [...admin]
    .sort((a, b) => b.adminLevel - a.adminLevel)
    .find((a) => /[구군시]$/.test(a.name) && a.name !== data.principalSubdivision)?.name;
  return district ?? data.city ?? data.locality ?? null;
}

export async function getLocation() {
  let coords;
  try {
    coords = await getPosition();
  } catch (err) {
    console.warn("위치 정보 사용 불가, 서울로 대체:", err.message);
    return DEFAULT_LOCATION;
  }

  const sido = nearestSido(coords.lat, coords.lon);
  const district = await reverseGeocode(coords.lat, coords.lon).catch((err) => {
    console.warn(err.message);
    return null;
  });

  return {
    ...coords,
    locationName: district ? `${sido.fullName} ${district}` : sido.fullName,
    sidoName: sido.sidoName,
    district,
    isDefault: false,
  };
}
